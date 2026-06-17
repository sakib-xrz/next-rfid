-- CreateEnum
CREATE TYPE "gate_event_status" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "scan_devices"
ADD COLUMN "gate_relay_channel" INTEGER,
ADD COLUMN "gate_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "gate_events" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "user_id" UUID,
    "action" "action_type" NOT NULL,
    "status" "gate_event_status" NOT NULL,
    "reason" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gate_events_device_id_idx" ON "gate_events"("device_id");

-- CreateIndex
CREATE INDEX "gate_events_user_id_idx" ON "gate_events"("user_id");

-- CreateIndex
CREATE INDEX "gate_events_created_at_idx" ON "gate_events"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "gate_events" ADD CONSTRAINT "gate_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "scan_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_events" ADD CONSTRAINT "gate_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
