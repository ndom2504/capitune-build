import { ALLOWED_FILE_EXTENSIONS, MAX_MEDIA_FILE_BYTES, MAX_TEXT_FILE_BYTES } from "@/lib/constants";
import { isBinaryFilePath } from "@/lib/media/paths";

export { BINARY_FILE_EXTENSIONS, fileExtension, isBinaryFilePath } from "@/lib/media/paths";

export function isAllowedExtension(ext: string): boolean {
  return (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

export function maxBytesForPath(filePath: string): number {
  return isBinaryFilePath(filePath) ? MAX_MEDIA_FILE_BYTES : MAX_TEXT_FILE_BYTES;
}

export function looksLikeBase64(value: string): boolean {
  const compact = value.replace(/\s/g, "");
  return compact.length > 0 && compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
}

export function fileBytes(filePath: string, content: string): Buffer {
  if (isBinaryFilePath(filePath)) {
    const compact = content.replace(/\s/g, "");
    if (!looksLikeBase64(compact)) {
      throw new Error(`Média invalide: ${filePath}`);
    }
    return Buffer.from(compact, "base64");
  }
  return Buffer.from(content, "utf8");
}

export function encodeMediaBytes(bytes: Buffer): string {
  return bytes.toString("base64");
}

export const PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
