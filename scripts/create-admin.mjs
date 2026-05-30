import env from "@next/env";
import { scrypt as scryptCallback, randomBytes, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { loadEnvConfig } = env;

const scrypt = promisify(scryptCallback);
const { Pool } = pg;

loadEnvConfig(process.cwd());

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(key).toString("base64url")}`;
}

const databaseUrl = process.env.DATABASE_URL;
const email = (readArg("email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = readArg("password") ?? process.env.ADMIN_PASSWORD ?? "";
const name = (readArg("name") ?? process.env.ADMIN_NAME ?? "Admin").trim();

if (!databaseUrl) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

if (!email || !password) {
  console.error(
    "Usage: npm run admin:create -- --email admin@example.com --password your-password [--name Admin]"
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    `
      INSERT INTO users (
        id,
        id_from_institution,
        name,
        email,
        phone,
        car_number,
        role,
        status,
        course,
        license_front_url,
        license_back_url,
        password_hash
      )
      VALUES ($1, $2, $3, $4, 'N/A', 'ADMIN-CAR', 'ADMIN', 'ACTIVE', NULL, 'admin/front-placeholder', 'admin/back-placeholder', $5)
      ON CONFLICT (email)
      DO UPDATE SET
        id_from_institution = EXCLUDED.id_from_institution,
        name = EXCLUDED.name,
        role = 'ADMIN',
        status = 'ACTIVE',
        course = NULL,
        password_hash = EXCLUDED.password_hash
      RETURNING id, email
    `,
    [randomUUID(), `ADMIN-${email}`, name, email, passwordHash]
  );

  const admin = result.rows[0];
  console.log(`Admin ready: ${admin.email} (${admin.id})`);
} finally {
  await pool.end();
}
