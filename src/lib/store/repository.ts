import type { PlanId } from "@/lib/billing/plans";
import type { AccessRole, InviteRole } from "@/lib/collab/roles";
import type {
  Conversation,
  Message,
  Profile,
  Project,
  ProjectBundle,
  ProjectFile,
  ProjectInvite,
  ProjectMember,
  ProjectVersion,
  VersionFile,
} from "@/lib/domain";

export class OwnershipError extends Error {
  constructor(message = "Accès refusé.") {
    super(message);
    this.name = "OwnershipError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Ressource introuvable.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class PublishSchemaError extends Error {
  constructor(
    message = "La colonne publish_token manque. Exécutez supabase/migrations/0002_publish.sql dans le SQL Editor Supabase.",
  ) {
    super(message);
    this.name = "PublishSchemaError";
  }
}

export class SlugTakenError extends Error {
  constructor(message = "Cette adresse publique est déjà utilisée.") {
    super(message);
    this.name = "SlugTakenError";
  }
}

export class CollabSchemaError extends Error {
  constructor(
    message = "La collaboration n’est pas prête. Exécutez supabase/migrations/0005_collab.sql dans le SQL Editor Supabase.",
  ) {
    super(message);
    this.name = "CollabSchemaError";
  }
}

export class BillingSchemaError extends Error {
  constructor(
    message = "Le plan de facturation n’est pas prêt. Exécutez supabase/migrations/0004_plan.sql dans le SQL Editor Supabase.",
  ) {
    super(message);
    this.name = "BillingSchemaError";
  }
}

export type GenerationUsage = {
  plan: PlanId;
  used: number;
  max: number;
  resetAt: number;
};

export type CreateUserInput = {
  id?: string;
  email: string;
  passwordHash?: string;
  displayName: string;
};

export type StoredUser = Profile & { passwordHash: string };

export interface Repository {
  createUser(input: CreateUserInput): Promise<Profile>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserById(id: string): Promise<Profile | null>;
  listProjects(ownerId: string): Promise<Project[]>;
  createProject(input: {
    ownerId: string;
    name: string;
    description: string;
  }): Promise<ProjectBundle>;
  getProject(ownerId: string, projectId: string): Promise<ProjectBundle>;
  renameProject(ownerId: string, projectId: string, name: string): Promise<Project>;
  deleteProject(ownerId: string, projectId: string): Promise<void>;
  replaceFiles(
    ownerId: string,
    projectId: string,
    files: { path: string; content: string }[],
    versionLabel: string,
  ): Promise<{ files: ProjectFile[]; version: ProjectVersion }>;
  listVersionFiles(ownerId: string, versionId: string): Promise<VersionFile[]>;
  restoreVersion(
    ownerId: string,
    projectId: string,
    versionId: string,
  ): Promise<ProjectBundle>;
  addMessage(
    ownerId: string,
    projectId: string,
    input: { role: Message["role"]; content: string; demoMode?: boolean },
  ): Promise<Message>;
  getConversationContext(
    ownerId: string,
    projectId: string,
  ): Promise<{ conversation: Conversation; messages: Message[]; files: ProjectFile[] }>;
  setPublishToken(
    ownerId: string,
    projectId: string,
    token: string | null,
  ): Promise<Project>;
  getPublishedSite(token: string): Promise<{ name: string; files: ProjectFile[] }>;
  publishSchemaReady(): Promise<boolean>;
  consumeGenerationLimit(
    ownerId: string,
  ): Promise<{ ok: true } | { ok: false; retryAfterMs: number }>;
  quotaSchemaReady(): Promise<boolean>;
  getGenerationUsage(ownerId: string): Promise<GenerationUsage>;
  setUserPlan(
    ownerId: string,
    plan: PlanId,
    stripeCustomerId?: string | null,
  ): Promise<Profile>;
  findUserByStripeCustomerId(customerId: string): Promise<Profile | null>;
  billingSchemaReady(): Promise<boolean>;
  listMembers(userId: string, projectId: string): Promise<ProjectMember[]>;
  createInvite(ownerId: string, projectId: string, role: InviteRole): Promise<ProjectInvite>;
  acceptInvite(userId: string, token: string): Promise<Project>;
  removeMember(ownerId: string, projectId: string, memberUserId: string): Promise<void>;
  collabSchemaReady(): Promise<boolean>;
  projectAccess(userId: string, projectId: string): Promise<AccessRole>;
}
