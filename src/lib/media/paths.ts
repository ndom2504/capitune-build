export const BINARY_FILE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "ico"] as const;

export function fileExtension(filePath: string): string {
  const base = filePath.split("/").pop() ?? "";
  return (base.includes(".") ? base.split(".").pop() : "")?.toLowerCase() ?? "";
}

export function isBinaryFilePath(filePath: string): boolean {
  return (BINARY_FILE_EXTENSIONS as readonly string[]).includes(fileExtension(filePath));
}
