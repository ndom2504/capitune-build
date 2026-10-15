export function isMissingPublishColumn(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("publish_token") && (lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("column"));
}

export function assertProjectPublishable(files: { path: string }[]): void {
  if (!files.some((file) => file.path === "index.html")) {
    throw new Error("Générez d’abord une page d’accueil (index.html) avant de publier.");
  }
}
