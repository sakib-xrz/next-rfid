ALTER TYPE "role_type" ADD VALUE IF NOT EXISTS 'VISITOR';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_from_institution" TEXT;

UPDATE "users"
SET "id_from_institution" = "id"::text
WHERE "id_from_institution" IS NULL;

ALTER TABLE "users" ALTER COLUMN "id_from_institution" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_id_from_institution_key"
ON "users"("id_from_institution");

CREATE INDEX IF NOT EXISTS "users_id_from_institution_idx"
ON "users"("id_from_institution");
