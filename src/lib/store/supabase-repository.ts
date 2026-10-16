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
import { isMissingPlanColumn } from "@/lib/billing/ready";
import { generationMaxForPlan, normalizePlan } from "@/lib/billing/plans";
import { isMissingCollabSchema } from "@/lib/collab/ready";
import { roleAtLeast, type AccessRole, type InviteRole } from "@/lib/collab/roles";
import { createPublishToken } from "@/lib/publish/token";
import { GENERATION_RATE_LIMIT } from "@/lib/constants";
import { consumeMemoryRateLimit } from "@/lib/rate-limit";
import { isMissingPublishColumn } from "@/lib/publish/ready";
import {
  BillingSchemaError,
  CollabSchemaError,
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

  async function resolveAccess(userId: string, projectId: string): Promise<{ project: ProjectRow; role: AccessRole }> {
    const { data, error } = await admin.from("projects").select("*").eq("id", projectId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError("Projet introuvable.");
    const project = data as ProjectRow;
    if (project.owner_id === userId) return { project, role: "owner" };
    const { data: member, error: memberError } = await admin
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (memberError) {
      if (isMissingCollabSchema(memberError.message)) throw new OwnershipError();
      throw new Error(memberError.message);
    }
    const role = (member as { role?: string } | null)?.role;
    if (role === "editor" || role === "viewer") return { project, role };
    throw new OwnershipError();
  }

  async function requireAccess(userId: string, projectId: string, minimum: AccessRole): Promise<ProjectRow> {
    const { project, role } = await resolveAccess(userId, projectId);
    if (!roleAtLeast(role, minimum)) throw new OwnershipError();
    return project;
  }

  async function bundle(project: ProjectRow, role: AccessRole = "owner"): Promise<ProjectBundle> {
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
      project: { ...mapProject(project), accessRole: role },
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
      const owned = ((data || []) as ProjectRow[]).map((row) => ({ ...mapProject(row), accessRole: "owner" as const }));
      const { data: memberships, error: memberError } = await admin
        .from("project_members")
        .select("project_id, role")
        .eq("user_id", ownerId);
      if (memberError) {
        if (isMissingCollabSchema(memberError.message)) return owned;
        throw new Error(memberError.message);
      }
      const ids = ((memberships || []) as { project_id: string; role: string }[]).map((item) => item.project_id);
      if (ids.length === 0) return owned;
      const { data: sharedRows, error: sharedError } = await admin.from("projects").select("*").in("id", ids);
      if (sharedError) throw new Error(sharedError.message);
      const roleById = new Map(
        ((memberships || []) as { project_id: string; role: InviteRole }[]).map((item) => [item.project_id, item.role]),
      );
      const shared = ((sharedRows || []) as ProjectRow[]).map((row) => ({
        ...mapProject(row),
        accessRole: roleById.get(row.id) === "editor" ? ("editor" as const) : ("viewer" as const),
      }));
      return [...owned, ...shared].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
      return bundle(projectRow, "owner");
    },

    async getProject(ownerId, projectId): Promise<ProjectBundle> {
      const { project, role } = await resolveAccess(ownerId, projectId);
      return bundle(project, role);
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
      const project = await requireAccess(ownerId, projectId, "editor");
      const { data, error } = await admin.rpc("apply_project_files", {
        p_owner_id: project.owner_id,
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
      await requireAccess(ownerId, (version as VersionRow).project_id, "viewer");
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
      await requireAccess(ownerId, projectId, "editor");
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
      const profile = await this.findUserById(ownerId);
      const max = generationMaxForPlan(normalizePlan(profile?.plan));
      const { data, error } = await admin.rpc("consume_generation_quota", {
        p_owner_id: ownerId,
        p_max: max,
        p_window_seconds: Math.round(GENERATION_RATE_LIMIT.windowMs / 1000),
      });
      if (error) {
        if (
          error.message.toLowerCase().includes("consume_generation_quota") ||
          error.message.toLowerCase().includes("generation_quotas")
        ) {
          return consumeMemoryRateLimit(`gen:${ownerId}`, max);
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

    async getGenerationUsage(ownerId) {
      const profile = await this.findUserById(ownerId);
      const plan = normalizePlan(profile?.plan);
      const max = generationMaxForPlan(plan);
      const { data, error } = await admin
        .from("generation_quotas")
        .select("count, window_started_at")
        .eq("owner_id", ownerId)
        .maybeSingle();
      const now = Date.now();
      const fallback = { plan, used: 0, max, resetAt: now + GENERATION_RATE_LIMIT.windowMs };
      if (error) {
        if (
          error.message.toLowerCase().includes("generation_quotas") ||
          error.message.toLowerCase().includes("does not exist")
        ) {
          return fallback;
        }
        throw new Error(error.message);
      }
      if (!data) return fallback;
      const started = new Date(String((data as { window_started_at: string }).window_started_at)).getTime();
      const resetAt = started + GENERATION_RATE_LIMIT.windowMs;
      if (!Number.isFinite(started) || resetAt <= now) return fallback;
      return { plan, used: Number((data as { count: number }).count) || 0, max, resetAt };
    },

    async setUserPlan(ownerId, plan, stripeCustomerId) {
      const patch: Record<string, unknown> = { plan };
      if (stripeCustomerId !== undefined) patch.stripe_customer_id = stripeCustomerId;
      const { data, error } = await admin.from("profiles").update(patch).eq("id", ownerId).select("*").single();
      if (error) {
        if (isMissingPlanColumn(error.message)) throw new BillingSchemaError();
        throw new Error(error.message);
      }
      return mapProfile(data as ProfileRow);
    },

    async findUserByStripeCustomerId(customerId) {
      const { data, error } = await admin
        .from("profiles")
        .select("*")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (error) {
        if (isMissingPlanColumn(error.message)) return null;
        throw new Error(error.message);
      }
      if (!data) return null;
      return mapProfile(data as ProfileRow);
    },

    async billingSchemaReady() {
      const { error } = await admin.from("profiles").select("plan").limit(1);
      if (!error) return true;
      if (isMissingPlanColumn(error.message)) return false;
      throw new Error(error.message);
    },

    async projectAccess(userId, projectId) {
      const { role } = await resolveAccess(userId, projectId);
      return role;
    },

    async listMembers(userId, projectId) {
      const project = await requireAccess(userId, projectId, "viewer");
      const owner = await this.findUserById(project.owner_id);
      const { data, error } = await admin.from("project_members").select("user_id, role").eq("project_id", projectId);
      if (error) {
        if (isMissingCollabSchema(error.message)) {
          return [
            {
              userId: project.owner_id,
              email: owner?.email ?? "",
              displayName: owner?.displayName ?? "",
              role: "owner" as const,
            },
          ];
        }
        throw new Error(error.message);
      }
      const members = await Promise.all(
        ((data || []) as { user_id: string; role: InviteRole }[]).map(async (item) => {
          const profile = await this.findUserById(item.user_id);
          return {
            userId: item.user_id,
            email: profile?.email ?? "",
            displayName: profile?.displayName ?? "",
            role: item.role,
          };
        }),
      );
      return [
        {
          userId: project.owner_id,
          email: owner?.email ?? "",
          displayName: owner?.displayName ?? "",
          role: "owner" as const,
        },
        ...members,
      ];
    },

    async createInvite(ownerId, projectId, role) {
      await requireOwnedProject(ownerId, projectId);
      const token = createPublishToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await admin.from("project_invites").insert({
        token,
        project_id: projectId,
        role,
        created_by: ownerId,
        expires_at: expiresAt,
      });
      if (error) {
        if (isMissingCollabSchema(error.message)) throw new CollabSchemaError();
        throw new Error(error.message);
      }
      return { token, role, expiresAt, path: `/join/${token}` };
    },

    async acceptInvite(userId, token) {
      const { data, error } = await admin.from("project_invites").select("*").eq("token", token).maybeSingle();
      if (error) {
        if (isMissingCollabSchema(error.message)) throw new CollabSchemaError();
        throw new Error(error.message);
      }
      if (!data) throw new NotFoundError("Invitation introuvable ou expirée.");
      const invite = data as { project_id: string; role: InviteRole; expires_at: string };
      if (new Date(invite.expires_at).getTime() < Date.now()) {
        throw new NotFoundError("Invitation introuvable ou expirée.");
      }
      const { data: project, error: projectError } = await admin
        .from("projects")
        .select("*")
        .eq("id", invite.project_id)
        .maybeSingle();
      if (projectError) throw new Error(projectError.message);
      if (!project) throw new NotFoundError("Projet introuvable.");
      const row = project as ProjectRow;
      if (row.owner_id === userId) return { ...mapProject(row), accessRole: "owner" };
      const { error: upsertError } = await admin.from("project_members").upsert({
        project_id: row.id,
        user_id: userId,
        role: invite.role,
      });
      if (upsertError) throw new Error(upsertError.message);
      return { ...mapProject(row), accessRole: invite.role };
    },

    async removeMember(ownerId, projectId, memberUserId) {
      await requireOwnedProject(ownerId, projectId);
      if (memberUserId === ownerId) throw new OwnershipError("Impossible de retirer le propriétaire.");
      const { error } = await admin
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", memberUserId);
      if (error) {
        if (isMissingCollabSchema(error.message)) throw new CollabSchemaError();
        throw new Error(error.message);
      }
    },

    async collabSchemaReady() {
      const { error } = await admin.from("project_members").select("user_id").limit(1);
      if (!error) return true;
      if (isMissingCollabSchema(error.message)) return false;
      throw new Error(error.message);
    },
  };
}
