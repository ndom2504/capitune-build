import type {
  Conversation,
  Message,
  MessageRole,
  Profile,
  Project,
  ProjectFile,
  ProjectVersion,
  VersionFile,
} from "@/lib/domain";

export type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: string;
  project_id: string;
  path: string;
  content: string;
  updated_at: string;
};

export type ConversationRow = {
  id: string;
  project_id: string;
  created_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  demo_mode: boolean;
  created_at: string;
};

export type VersionRow = {
  id: string;
  project_id: string;
  label: string;
  created_at: string;
};

export type VersionFileRow = {
  id: string;
  version_id: string;
  path: string;
  content: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

export function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapFile(row: FileRow): ProjectFile {
  return {
    id: row.id,
    projectId: row.project_id,
    path: row.path,
    content: row.content,
    updatedAt: row.updated_at,
  };
}

export function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    projectId: row.project_id,
    createdAt: row.created_at,
  };
}

export function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as MessageRole,
    content: row.content,
    demoMode: Boolean(row.demo_mode),
    createdAt: row.created_at,
  };
}

export function mapVersion(row: VersionRow): ProjectVersion {
  return {
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    createdAt: row.created_at,
  };
}

export function mapVersionFile(row: VersionFileRow): VersionFile {
  return {
    id: row.id,
    versionId: row.version_id,
    path: row.path,
    content: row.content,
  };
}
