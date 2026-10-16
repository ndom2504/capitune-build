export function isMissingCollabSchema(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("project_members") ||
    lower.includes("project_invites") ||
    (lower.includes("does not exist") && (lower.includes("member") || lower.includes("invite")))
  );
}
