import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Message,
  Profile,
  Project,
  ProjectBundle,
  VersionFile,
} from "@/lib/domain";
import {
  mapConversation,
  mapFile,
  mapMessage,
  mapProfile,
  mapProject,
  mapVersion,
  mapVersionFile,
  isUuid,
  type ConversationRow,
  type FileRow,
  type MessageRow,
  type ProfileRow,
  type ProjectRow,
  type VersionFileRow,
  type VersionRow,
} from "@/lib/store/mappers";
import { GENERATION_RATE_LIMIT } from "@/lib/constants";
import { consumeMemoryRateLimit } from "@/lib/rate-limit";
import { isMissingPublishColumn } from "@/lib/publish/ready";
import {
  NotFoundError,
  OwnershipError,
  PublishSchemaError,
  SlugTakenError,
  type CreateUserInput,
  type Repository,
  type StoredUser,
} from "@/lib/store/repository";

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || Boolean(error.message?.toLowerCase().includes("duplicate"));
}

function throwFromRpc(message: string): never {
  if (message.includes("FORBIDDEN")) {
    throw new OwnershipError();
  }
  if (message.includes("NOT_FOUND")) {
    throw new NotFoundError("Projet introuvable.");
  }
  throw new Error(message);
}

export function createSupabaseRepository(admin: SupabaseClient): Repository {
  async function requireOwnedProject(ownerId: string, projectId: string): Promise<ProjectRow> {
    if (!isUuid(projectId) || !isUuid(ownerId)) {
      throw new NotFoundError("Projet introuvable.");
    }
    const { data, error } = await admin
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Projet introuvable.");
    const project = data as ProjectRow;
    if (project.owner_id !== ownerId) {
      throw new OwnershipError();
    }
    return project;
  }

  async function bundle(project: ProjectRow): Promise<ProjectBundle> {
    const { data: conversation, error: conversationError } = await admin
      .from("conversations")
      .select("*")
      .eq("project_id", project.id)
      .maybeSingle();
    if (conversationError) throw new Error(conversationError.message);
    if (!conversation) throw new NotFoundError("Conversation introuvable.");
    const conversationRow = conversation as ConversationRow;

    const [{ data: files, error: filesError }, { data: messages, error: messagesError }, { data: versions, error: versionsError }] =
      await Promise.all([
        admin.from("project_files").select("*").eq("project_id", project.id).order("path"),
        admin
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationRow.id)
          .order("created_at", { ascending: true }),
        admin
          .from("project_versions")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
      ]);
    if (filesError) throw new Error(filesError.message);
    if (messagesError) throw new Error(messagesError.message);
    if (versionsError) throw new Error(versionsError.message);

    return {
      project: mapProject(project),
      files: ((files || []) as FileRow[]).map(mapFile),
      conversation: mapConversation(conversationRow),
      messages: ((messages || []) as MessageRow[]).map(mapMessage),
      versions: ((versions || []) as VersionRow[]).map(mapVersion),
    };
  }

  return {
    async createUser(input: CreateUserInput): Promise<Profile> {
      if (!input.id || !isUuid(input.id)) {
        throw new Error("L’identifiant Auth Supabase est requis.");
      }
      const { data, error } = await admin
        .from("profiles")
        .upsert({
          id: input.id,
          email: input.email.toLowerCase(),
          display_name: input.displayName,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapProfile(data as ProfileRow);
    },

    async findUserByEmail(email: string): Promise<StoredUser | null> {
      const { data, error } = await admin
        .from("profiles")
        .select("*")
        .eq("email", email.toLowerCase())
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const profile = mapProfile(data as ProfileRow);
      return { ...profile, passwordHash: "" };
    },

    async findUserById(userId: string): Promise<Profile | null> {
      if (!isUuid(userId)) return null;
      const { data, error } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return mapProfile(data as ProfileRow);
    },

    async listProjects(ownerId: string): Promise<Project[]> {
      if (!isUuid(ownerId)) return [];
      const { data, error } = await admin
        .from("projects")
        .select("*")
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data || []) as ProjectRow[]).map(mapProject);
    },

    async createProject(input): Promise<ProjectBundle> {
      const { data: project, error: projectError } = await admin
        .from("projects")
        .insert({
          owner_id: input.ownerId,
          name: input.name.trim(),
          description: input.description.trim(),
        })
        .select("*")
        .single();
      if (projectError) throw new Error(projectError.message);
      const projectRow = project as ProjectRow;
      const { data: conversation, error: conversationError } = await admin
        .from("conversations")
        .insert({ project_id: projectRow.id })
        .select("*")
        .single();
      if (conversationError) {
        await admin.from("projects").delete().eq("id", projectRow.id);
        throw new Error(conversationError.message);
      }
      void conversation;
      return bundle(projectRow);
    },

    async getProject(ownerId, projectId): Promise<ProjectBundle> {
      return bundle(await requireOwnedProject(ownerId, projectId));
    },

    async renameProject(ownerId, projectId, name): Promise<Project> {
      await requireOwnedProject(ownerId, projectId);
      const { data, error } = await admin
        .from("projects")
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapProject(data as ProjectRow);
    },

    async deleteProject(ownerId, projectId): Promise<void> {
      await requireOwnedProject(ownerId, projectId);
      const { error } = await admin.from("projects").delete().eq("id", projectId);
      if (error) throw new Error(error.message);
    },

    async replaceFiles(ownerId, projectId, files, versionLabel) {
      await requireOwnedProject(ownerId, projectId);
      const { data, error } = await admin.rpc("apply_project_files", {
        p_owner_id: ownerId,
        p_project_id: projectId,
        p_label: versionLabel,
        p_files: files,
      });
      if (error) throwFromRpc(error.message);
      const payload = data as { files: FileRow[]; version: VersionRow };
      return {
        files: (payload.files || []).map(mapFile),
        version: mapVersion(payload.version),
      };
    },

    async listVersionFiles(ownerId, versionId): Promise<VersionFile[]> {
      if (!isUuid(versionId)) {
        throw new NotFoundError("Version introuvable.");
      }
      const { data: version, error: versionError } = await admin
        .from("project_versions")
        .select("*")
        .eq("id", versionId)
        .maybeSingle();
      if (versionError) throw new Error(versionError.message);
      if (!version) throw new NotFoundError("Version introuvable.");
      await requireOwnedProject(ownerId, (version as VersionRow).project_id);
      const { data, error } = await admin
        .from("project_version_files")
        .select("*")
        .eq("version_id", versionId);
      if (error) throw new Error(error.message);
      return ((data || []) as VersionFileRow[]).map(mapVersionFile);
    },

    async restoreVersion(ownerId, projectId, versionId): Promise<ProjectBundle> {
      const versionFiles = await this.listVersionFiles(ownerId, versionId);
      const { data: version, error } = await admin
        .from("project_versions")
        .select("*")
        .eq("id", versionId)
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!version) throw new NotFoundError("Version introuvable.");
      const label = `Restauration de ${(version as VersionRow).label}`;
      await this.replaceFiles(
        ownerId,
        projectId,
        versionFiles.map((file) => ({ path: file.path, content: file.content })),
        label,
      );
      return this.getProject(ownerId, projectId);
    },

    async addMessage(ownerId, projectId, input): Promise<Message> {
      await requireOwnedProject(ownerId, projectId);
      const { data: conversation, error: conversationError } = await admin
        .from("conversations")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (conversationError) throw new Error(conversationError.message);
      if (!conversation) throw new NotFoundError("Conversation introuvable.");
      const { data, error } = await admin
        .from("messages")
        .insert({
          conversation_id: (conversation as ConversationRow).id,
          role: input.role,
          content: input.content,
          demo_mode: Boolean(input.demoMode),
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapMessage(data as MessageRow);
    },

    async getConversationContext(ownerId, projectId) {
      const bundleData = await this.getProject(ownerId, projectId);
      return {
        conversation: bundleData.conversation,
        messages: bundleData.messages,
        files: bundleData.files,
      };
    },

    async setPublishToken(ownerId, projectId, token) {
      await requireOwnedProject(ownerId, projectId);
      const { data, error } = await admin
        .from("projects")
        .update({ publish_token: token, updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .select("*")
        .single();
      if (error) {
        if (isMissingPublishColumn(error.message)) {
          throw new PublishSchemaError();
        }
        if (isUniqueViolation(error)) {
          throw new SlugTakenError();
        }
        throw new Error(error.message);
      }
      return mapProject(data as ProjectRow);
    },

    async getPublishedSite(token) {
      const { data: project, error } = await admin
        .from("projects")
        .select("*")
        .eq("publish_token", token)
        .maybeSingle();
      if (error) {
        if (isMissingPublishColumn(error.message)) {
          throw new PublishSchemaError();
        }
        throw new Error(error.message);
      }
      if (!project) {
        throw new NotFoundError("Site introuvable.");
      }
      const row = project as ProjectRow;
      const { data: files, error: filesError } = await admin
        .from("project_files")
        .select("*")
        .eq("project_id", row.id)
        .order("path");
      if (filesError) throw new Error(filesError.message);
      return {
        name: row.name,
        files: ((files || []) as FileRow[]).map(mapFile),
      };
    },

    async publishSchemaReady() {
      const { error } = await admin.from("projects").select("publish_token").limit(1);
      if (!error) return true;
      if (isMissingPublishColumn(error.message)) return false;
      throw new Error(error.message);
    },

    async consumeGenerationLimit(ownerId) {
      const { data, error } = await admin.rpc("consume_generation_quota", {
        p_owner_id: ownerId,
        p_max: GENERATION_RATE_LIMIT.max,
        p_window_seconds: Math.round(GENERATION_RATE_LIMIT.windowMs / 1000),
      });
      if (error) {
        if (
          error.message.toLowerCase().includes("consume_generation_quota") ||
          error.message.toLowerCase().includes("generation_quotas")
        ) {
          return consumeMemoryRateLimit(`gen:${ownerId}`);
        }
        throw new Error(error.message);
      }
      const payload = data as { ok?: boolean; retry_after_ms?: number };
      if (payload?.ok) return { ok: true as const };
      return { ok: false as const, retryAfterMs: Number(payload?.retry_after_ms) || GENERATION_RATE_LIMIT.windowMs };
    },

    async quotaSchemaReady() {
      const { error } = await admin.from("generation_quotas").select("owner_id").limit(1);
      if (!error) return true;
      if (
        error.message.toLowerCase().includes("generation_quotas") ||
        error.message.toLowerCase().includes("does not exist")
      ) {
        return false;
      }
      throw new Error(error.message);
    },
  };
}
