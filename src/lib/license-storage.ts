import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ApiError } from "@/lib/api";

const MAX_LICENSE_UPLOAD_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getStorageRoot() {
  return path.resolve(
    process.env.LICENSE_STORAGE_DIR ??
      path.join(process.cwd(), "storage", "licenses"),
  );
}

function getSafeExtension(file: File) {
  const fromMime = MIME_EXTENSIONS[file.type];
  if (fromMime) return fromMime;

  const extension = path.extname(file.name).replace(".", "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  throw new ApiError("Only JPG, PNG, or WebP license images are allowed", 400);
}

export function resolveLicensePath(storagePath: string) {
  if (
    !storagePath ||
    storagePath.includes("\0") ||
    storagePath.includes("\\")
  ) {
    throw new ApiError("Invalid storage path", 400);
  }

  const normalized = path.posix.normalize(storagePath);
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new ApiError("Invalid storage path", 400);
  }

  const root = getStorageRoot();
  const fullPath = path.resolve(root, normalized);
  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) {
    throw new ApiError("Invalid storage path", 400);
  }

  return fullPath;
}

export async function saveLicenseFile(file: File, side: "front" | "back") {
  if (!file || file.size === 0) {
    throw new ApiError("License image is required", 400);
  }

  if (file.size > MAX_LICENSE_UPLOAD_BYTES) {
    throw new ApiError("License image cannot exceed 5MB", 400);
  }

  const extension = getSafeExtension(file);
  const storagePath = `requests/${side}-${Date.now()}-${randomUUID()}.${extension}`;
  const fullPath = resolveLicensePath(storagePath);
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, bytes);

  return storagePath;
}

export async function readLicenseFile(storagePath: string) {
  const fullPath = resolveLicensePath(storagePath);
  const data = await readFile(fullPath);
  const extension = path.extname(fullPath).toLowerCase();
  const contentType =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : "image/jpeg";

  return { contentType, data };
}
