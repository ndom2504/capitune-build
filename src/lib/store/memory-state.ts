import type {
  Conversation,
  Message,
  Project,
  ProjectFile,
  ProjectVersion,
  VersionFile,
} from "@/lib/domain";
import type { StoredUser } from "@/lib/store/repository";

export type StoreState = {
  users: StoredUser[];
  projects: Project[];
  files: ProjectFile[];
  conversations: Conversation[];
  messages: Message[];
  versions: ProjectVersion[];
  versionFiles: VersionFile[];
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
  };
}
