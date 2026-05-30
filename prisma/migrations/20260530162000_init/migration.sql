CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "course_type" AS ENUM ('DIPLOMA', 'BACHELOR', 'M_SC', 'PHD');
CREATE TYPE "role_type" AS ENUM ('STUDENT', 'LECTURER', 'STAFF', 'ADMIN');
CREATE TYPE "status_type" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED');
CREATE TYPE "action_type" AS ENUM ('IN', 'OUT');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "car_number" TEXT NOT NULL,
  "course" "course_type",
  "role" "role_type" NOT NULL DEFAULT 'STUDENT',
  "license_front_url" TEXT NOT NULL,
  "license_back_url" TEXT NOT NULL,
  "rfid_number" VARCHAR(24),
  "status" "status_type" NOT NULL DEFAULT 'PENDING',
  "password_hash" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_student_course_required" CHECK ("role" <> 'STUDENT' OR "course" IS NOT NULL)
);

CREATE TABLE "logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "action" "action_type" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "in_time" TIMESTAMPTZ(6) NOT NULL,
  "out_time" TIMESTAMPTZ(6),
  "total_time" INTEGER,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_total_time_check" CHECK ("total_time" IS NULL OR "total_time" >= 0)
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_rfid_number_key" ON "users"("rfid_number");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE INDEX "users_rfid_number_idx" ON "users"("rfid_number");
CREATE INDEX "logs_user_id_idx" ON "logs"("user_id");
CREATE INDEX "logs_created_at_idx" ON "logs"("created_at" DESC);
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_out_time_idx" ON "sessions"("out_time");
CREATE UNIQUE INDEX "sessions_one_open_session_idx" ON "sessions"("user_id") WHERE "out_time" IS NULL;

ALTER TABLE "logs"
  ADD CONSTRAINT "logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_logs_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'logs table is append-only';
END;
$$;

CREATE TRIGGER "trg_prevent_logs_update"
BEFORE UPDATE OR DELETE ON "logs"
FOR EACH ROW
EXECUTE FUNCTION prevent_logs_mutation();
