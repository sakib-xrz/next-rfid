import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;

  const [scheme, salt, key] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !key) return false;

  const expected = Buffer.from(key, "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
