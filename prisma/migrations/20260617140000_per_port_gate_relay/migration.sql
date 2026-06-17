-- AlterTable
ALTER TABLE "scan_devices"
ADD COLUMN "gate_relay_port" TEXT,
ADD COLUMN "station_id" TEXT;

-- DropColumn
ALTER TABLE "scan_devices" DROP COLUMN "gate_relay_channel";

-- CreateIndex
CREATE INDEX "scan_devices_station_id_idx" ON "scan_devices"("station_id");
