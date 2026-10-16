import type {
  Conversation,
  Message,
  Project,
  ProjectFile,
  ProjectVersion,
  VersionFile,
} from "@/lib/domain";
import type { InviteRole } from "@/lib/collab/roles";
import type { StoredUser } from "@/lib/store/repository";

export type StoredMember = {
  projectId: string;
  userId: string;
  role: InviteRole;
  createdAt: string;
};

export type StoredInvite = {
  token: string;
  projectId: string;
  role: InviteRole;
  createdBy: string;
  expiresAt: string;
  createdAt: string;
};

export type StoredQuota = {
  ownerId: string;
  count: number;
  resetAt: number;
};

export type StoreState = {
  users: StoredUser[];
  projects: Project[];
  files: ProjectFile[];
  conversations: Conversation[];
  messages: Message[];
  versions: ProjectVersion[];
  versionFiles: VersionFile[];
  quotas: StoredQuota[];
  members: StoredMember[];
  invites: StoredInvite[];
};

export function emptyState(): StoreState {
  return {
    users: [],
    projects: [],
    files: [],
    conversations: [],
    messages: [],
    versions: [],
    versionFiles: [],
    quotas: [],
    members: [],
    invites: [],
  };
}
