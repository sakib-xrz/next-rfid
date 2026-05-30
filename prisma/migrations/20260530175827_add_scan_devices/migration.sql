-- AlterTable
ALTER TABLE "logs" ADD COLUMN     "device_id" UUID;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "device_id" UUID;

-- CreateTable
CREATE TABLE "scan_devices" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "action_type" NOT NULL,
    "location" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scan_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logs_device_id_idx" ON "logs"("device_id");

-- CreateIndex
CREATE INDEX "sessions_device_id_idx" ON "sessions"("device_id");

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "scan_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "scan_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
