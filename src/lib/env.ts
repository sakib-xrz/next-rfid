const missingEnvMessage =
  "Missing PostgreSQL environment variables. Please set DATABASE_URL and AUTH_SECRET.";

export const databaseUrl = process.env.DATABASE_URL;
export const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
export const licenseStorageDir = process.env.LICENSE_STORAGE_DIR;

export function assertAppEnv() {
  if (!databaseUrl || !authSecret) {
    throw new Error(missingEnvMessage);
  }
}
