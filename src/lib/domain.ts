export type Profile = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};

export type Project = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  publishToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFile = {
  id: string;
  projectId: string;
  path: string;
  content: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  projectId: string;
  createdAt: string;
};

export type MessageRole = "user" | "assistant" | "system";

export type Message = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  demoMode: boolean;
  createdAt: string;
};

export type ProjectVersion = {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
};

export type VersionFile = {
  id: string;
  versionId: string;
  path: string;
  content: string;
};

export type ProjectBundle = {
  project: Project;
  files: ProjectFile[];
  conversation: Conversation;
  messages: Message[];
  versions: ProjectVersion[];
};
