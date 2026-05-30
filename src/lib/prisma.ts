import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

type PrismaGlobal = {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL. Add your PostgreSQL connection string to .env.local.");
  }

  return databaseUrl;
}

export function getPrismaClient() {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg(globalForPrisma.pgPool),
    });
  }

  return globalForPrisma.prisma;
}
