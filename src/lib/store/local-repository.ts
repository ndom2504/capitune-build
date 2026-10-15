import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  Conversation,
  Message,
  Profile,
  Project,
  ProjectBundle,
  ProjectFile,
  ProjectVersion,
  VersionFile,
} from "@/lib/domain";
import { generationMaxForPlan, normalizePlan } from "@/lib/billing/plans";
import { GENERATION_RATE_LIMIT } from "@/lib/constants";
import { tickQuota } from "@/lib/rate-limit";
import { emptyState, type StoreState } from "@/lib/store/memory-state";
import {
  NotFoundError,
  OwnershipError,
  SlugTakenError,
  type CreateUserInput,
  type Repository,
  type StoredUser,
} from "@/lib/store/repository";

function nowIso(): string {
  return new Date().toISOString();
}

function toProfile(user: StoredUser): Profile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    plan: normalizePlan(user.plan),
    stripeCustomerId: user.stripeCustomerId ?? null,
    createdAt: user.createdAt,
  };
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createLocalRepository(filePath: string): Repository {
  let chain: Promise<unknown> = Promise.resolve();

  async function load(): Promise<StoreState> {
    try {
      const raw = await readFile(filePath, "utf8");
      return { ...emptyState(), ...JSON.parse(raw) } as StoreState;
    } catch {
      return emptyState();
    }
  }

  async function persist(state: StoreState): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
  }

  function mutate<T>(fn: (state: StoreState) => Promise<T> | T): Promise<T> {
    const run = chain.then(async () => {
      const state = await load();
      const result = await fn(state);
      await persist(state);
      return result;
    });
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function requireOwnedProject(state: StoreState, ownerId: string, projectId: string): Project {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) {
      throw new NotFoundError("Projet introuvable.");
    }
    if (project.ownerId !== ownerId) {
      throw new OwnershipError();
    }
    return project;
  }

  function bundle(state: StoreState, project: Project): ProjectBundle {
    const conversation = state.conversations.find((item) => item.projectId === project.id);
    if (!conversation) {
      throw new NotFoundError("Conversation introuvable.");
    }
    return {
      project: { ...project, publishToken: project.publishToken ?? null },
      files: state.files.filter((item) => item.projectId === project.id),
      conversation,
      messages: state.messages.filter((item) => item.conversationId === conversation.id),
      versions: state.versions
        .filter((item) => item.projectId === project.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  return {
    async createUser(input: CreateUserInput): Promise<Profile> {
      return mutate((state) => {
        if (state.users.some((user) => user.email === input.email.toLowerCase())) {
          throw new Error("Un compte existe déjà avec cet e-mail.");
        }
        const user: StoredUser = {
          id: id("usr"),
          email: input.email.toLowerCase(),
          displayName: input.displayName,
          plan: "free",
          stripeCustomerId: null,
          passwordHash: input.passwordHash || "",
          createdAt: nowIso(),
        };
        state.users.push(user);
        return toProfile(user);
      });
    },

    async findUserByEmail(email: string): Promise<StoredUser | null> {
      const state = await load();
      return state.users.find((user) => user.email === email.toLowerCase()) ?? null;
    },

    async findUserById(userId: string): Promise<Profile | null> {
      const state = await load();
      const user = state.users.find((item) => item.id === userId);
      if (!user) return null;
      return toProfile(user);
    },

    async listProjects(ownerId: string): Promise<Project[]> {
      const state = await load();
      return state.projects
        .filter((project) => project.ownerId === ownerId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((project) => ({ ...project, publishToken: project.publishToken ?? null }));
    },

    async createProject(input): Promise<ProjectBundle> {
      return mutate((state) => {
        const createdAt = nowIso();
        const project: Project = {
          id: id("prj"),
          ownerId: input.ownerId,
          name: input.name.trim(),
          description: input.description.trim(),
          publishToken: null,
          createdAt,
          updatedAt: createdAt,
        };
        const conversation: Conversation = {
          id: id("cnv"),
          projectId: project.id,
          createdAt,
        };
        state.projects.push(project);
        state.conversations.push(conversation);
        return bundle(state, project);
      });
    },

    async getProject(ownerId, projectId): Promise<ProjectBundle> {
      const state = await load();
      return bundle(state, requireOwnedProject(state, ownerId, projectId));
    },

    async renameProject(ownerId, projectId, name): Promise<Project> {
      return mutate((state) => {
        const project = requireOwnedProject(state, ownerId, projectId);
        project.name = name.trim();
        project.updatedAt = nowIso();
        return project;
      });
    },

    async deleteProject(ownerId, projectId): Promise<void> {
      return mutate((state) => {
        requireOwnedProject(state, ownerId, projectId);
        const conversationIds = state.conversations
          .filter((item) => item.projectId === projectId)
          .map((item) => item.id);
        const versionIds = state.versions
          .filter((item) => item.projectId === projectId)
          .map((item) => item.id);
        state.projects = state.projects.filter((item) => item.id !== projectId);
        state.files = state.files.filter((item) => item.projectId !== projectId);
        state.conversations = state.conversations.filter((item) => item.projectId !== projectId);
        state.messages = state.messages.filter(
          (item) => !conversationIds.includes(item.conversationId),
        );
        state.versions = state.versions.filter((item) => item.projectId !== projectId);
        state.versionFiles = state.versionFiles.filter(
          (item) => !versionIds.includes(item.versionId),
        );
      });
    },

    async replaceFiles(ownerId, projectId, files, versionLabel) {
      return mutate((state) => {
        const project = requireOwnedProject(state, ownerId, projectId);
        const createdAt = nowIso();
        const version: ProjectVersion = {
          id: id("ver"),
          projectId,
          label: versionLabel,
          createdAt,
        };
        const snapshots: VersionFile[] = files.map((file) => ({
          id: id("vf"),
          versionId: version.id,
          path: file.path,
          content: file.content,
        }));
        state.files = state.files.filter((item) => item.projectId !== projectId);
        const nextFiles: ProjectFile[] = files.map((file) => ({
          id: id("file"),
          projectId,
          path: file.path,
          content: file.content,
          updatedAt: createdAt,
        }));
        state.files.push(...nextFiles);
        state.versions.push(version);
        state.versionFiles.push(...snapshots);
        project.updatedAt = createdAt;
        return { files: nextFiles, version };
      });
    },

    async listVersionFiles(ownerId, versionId): Promise<VersionFile[]> {
      const state = await load();
      const version = state.versions.find((item) => item.id === versionId);
      if (!version) {
        throw new NotFoundError("Version introuvable.");
      }
      requireOwnedProject(state, ownerId, version.projectId);
      return state.versionFiles.filter((item) => item.versionId === versionId);
    },

    async restoreVersion(ownerId, projectId, versionId): Promise<ProjectBundle> {
      return mutate(async (state) => {
        requireOwnedProject(state, ownerId, projectId);
        const version = state.versions.find(
          (item) => item.id === versionId && item.projectId === projectId,
        );
        if (!version) {
          throw new NotFoundError("Version introuvable.");
        }
        const files = state.versionFiles.filter((item) => item.versionId === versionId);
        const createdAt = nowIso();
        const restored: ProjectVersion = {
          id: id("ver"),
          projectId,
          label: `Restauration de ${version.label}`,
          createdAt,
        };
        state.files = state.files.filter((item) => item.projectId !== projectId);
        state.files.push(
          ...files.map((file) => ({
            id: id("file"),
            projectId,
            path: file.path,
            content: file.content,
            updatedAt: createdAt,
          })),
        );
        state.versions.push(restored);
        state.versionFiles.push(
          ...files.map((file) => ({
            id: id("vf"),
            versionId: restored.id,
            path: file.path,
            content: file.content,
          })),
        );
        const project = requireOwnedProject(state, ownerId, projectId);
        project.updatedAt = createdAt;
        return bundle(state, project);
      });
    },

    async addMessage(ownerId, projectId, input): Promise<Message> {
      return mutate((state) => {
        requireOwnedProject(state, ownerId, projectId);
        const conversation = state.conversations.find((item) => item.projectId === projectId);
        if (!conversation) {
          throw new NotFoundError("Conversation introuvable.");
        }
        const message: Message = {
          id: id("msg"),
          conversationId: conversation.id,
          role: input.role,
          content: input.content,
          demoMode: Boolean(input.demoMode),
          createdAt: nowIso(),
        };
        state.messages.push(message);
        return message;
      });
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
      return mutate((state) => {
        const project = requireOwnedProject(state, ownerId, projectId);
        if (token) {
          const clash = state.projects.find((item) => item.publishToken === token && item.id !== projectId);
          if (clash) {
            throw new SlugTakenError();
          }
        }
        project.publishToken = token;
        project.updatedAt = nowIso();
        return project;
      });
    },

    async getPublishedSite(token) {
      const state = await load();
      const project = state.projects.find((item) => item.publishToken === token);
      if (!project) {
        throw new NotFoundError("Site introuvable.");
      }
      return {
        name: project.name,
        files: state.files.filter((item) => item.projectId === project.id),
      };
    },

    async publishSchemaReady() {
      return true;
    },

    async consumeGenerationLimit(ownerId) {
      return mutate((state) => {
        if (!state.quotas) state.quotas = [];
        const user = state.users.find((item) => item.id === ownerId);
        const max = generationMaxForPlan(normalizePlan(user?.plan));
        const current = state.quotas.find((item) => item.ownerId === ownerId);
        const ticked = tickQuota(current, ownerId, Date.now(), max);
        state.quotas = state.quotas.filter((item) => item.ownerId !== ownerId);
        state.quotas.push(ticked.next);
        if (!ticked.ok) return { ok: false as const, retryAfterMs: ticked.retryAfterMs };
        return { ok: true as const };
      });
    },

    async quotaSchemaReady() {
      return true;
    },

    async getGenerationUsage(ownerId) {
      const state = await load();
      const user = state.users.find((item) => item.id === ownerId);
      const plan = normalizePlan(user?.plan);
      const max = generationMaxForPlan(plan);
      const current = (state.quotas ?? []).find((item) => item.ownerId === ownerId);
      const now = Date.now();
      if (!current || current.resetAt <= now) {
        return { plan, used: 0, max, resetAt: now + GENERATION_RATE_LIMIT.windowMs };
      }
      return { plan, used: current.count, max, resetAt: current.resetAt };
    },

    async setUserPlan(ownerId, plan, stripeCustomerId) {
      return mutate((state) => {
        const user = state.users.find((item) => item.id === ownerId);
        if (!user) throw new NotFoundError("Compte introuvable.");
        user.plan = plan;
        if (stripeCustomerId !== undefined) user.stripeCustomerId = stripeCustomerId;
        return toProfile(user);
      });
    },

    async findUserByStripeCustomerId(customerId) {
      const state = await load();
      const user = state.users.find((item) => item.stripeCustomerId === customerId);
      return user ? toProfile(user) : null;
    },

    async billingSchemaReady() {
      return true;
    },
  };
}
