import { getGateControlConfig, isGateControlEnabled } from "@/lib/gate-control/config";
import { recordGateEvent } from "@/lib/gate-control/gate-events";
import {
  getRelayDriverForPort,
  getRelayHealthByPorts,
} from "@/lib/gate-control/relay-manager";
import { getPrismaClient } from "@/lib/prisma";
import type { ActionType } from "@/lib/types";

type TriggerGateOpenInput = {
  deviceId: string;
  action: ActionType;
  userId?: string | null;
  reason?: string | null;
};

function getStationDeviceFilter(stationId: string | null) {
  return stationId ? { stationId } : {};
}

export async function getGateControlStatus() {
  const config = getGateControlConfig();
  const prisma = getPrismaClient();

  let relayPorts: string[] = [];
  try {
    const devices = await prisma.scanDevice.findMany({
      where: {
        isActive: true,
        gateEnabled: true,
        gateRelayPort: { not: null },
        ...getStationDeviceFilter(config.stationId),
      },
      select: { gateRelayPort: true },
    });
    relayPorts = devices
      .map((device) => device.gateRelayPort?.trim() ?? "")
      .filter(Boolean);
  } catch {
    relayPorts = [];
  }

  const relayHealth = config.enabled
    ? await getRelayHealthByPorts(relayPorts, config.baudRate)
    : [];

  let lastEvent: {
    id: string;
    device_id: string;
    status: string;
    action: string;
    created_at: string;
  } | null = null;

  try {
    const event = await prisma.gateEvent.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        deviceId: true,
        status: true,
        action: true,
        createdAt: true,
      },
    });

    if (event) {
      lastEvent = {
        id: event.id,
        device_id: event.deviceId,
        status: event.status,
        action: event.action,
        created_at: event.createdAt.toISOString(),
      };
    }
  } catch {
    lastEvent = null;
  }

  return {
    enabled: config.enabled,
    station_id: config.stationId,
    open_pulse_ms: config.openPulseMs,
    relay_ports: relayHealth,
    relay_connected: relayHealth.some((entry) => entry.connected),
    last_event: lastEvent,
  };
}

export async function triggerGateOpen({
  deviceId,
  action,
  userId,
  reason,
}: TriggerGateOpenInput) {
  const config = getGateControlConfig();

  if (!config.enabled) {
    return;
  }

  const prisma = getPrismaClient();
  const device = await prisma.scanDevice.findUnique({
    where: { id: deviceId },
    select: {
      id: true,
      name: true,
      gateEnabled: true,
      gateRelayPort: true,
      stationId: true,
    },
  });

  if (!device) {
    await recordGateEvent({
      deviceId,
      userId,
      action,
      status: "FAILED",
      reason,
      error: "Scan device not found for gate control",
    });
    return;
  }

  if (config.stationId && device.stationId !== config.stationId) {
    await recordGateEvent({
      deviceId,
      userId,
      action,
      status: "SKIPPED",
      reason: reason ?? "Device belongs to a different station",
      error: `Device station ${device.stationId ?? "unset"} does not match ${config.stationId}`,
    });
    return;
  }

  if (!device.gateEnabled) {
    await recordGateEvent({
      deviceId,
      userId,
      action,
      status: "SKIPPED",
      reason: reason ?? "Gate control disabled for device",
    });
    return;
  }

  const relayPort = device.gateRelayPort?.trim();
  if (!relayPort) {
    await recordGateEvent({
      deviceId,
      userId,
      action,
      status: "SKIPPED",
      reason: reason ?? "No gate relay port configured",
      error: `Device ${device.name} has no gate_relay_port`,
    });
    return;
  }

  try {
    const driver = getRelayDriverForPort(relayPort, config.baudRate);
    await driver.pulse(config.openPulseMs);
    await recordGateEvent({
      deviceId,
      userId,
      action,
      status: "SUCCESS",
      reason,
    });
    console.info(
      `[GATE] Opened ${device.name} via relay port ${relayPort} (${action})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown gate error";
    await recordGateEvent({
      deviceId,
      userId,
      action,
      status: "FAILED",
      reason,
      error: message,
    });
    throw error;
  }
}

export async function triggerManualGateOpen({
  deviceId,
  reason,
}: {
  deviceId: string;
  reason: string;
}) {
  const prisma = getPrismaClient();
  const device = await prisma.scanDevice.findUnique({
    where: { id: deviceId },
    select: { type: true },
  });

  if (!device) {
    throw new Error("Device not found");
  }

  await triggerGateOpen({
    deviceId,
    action: device.type as ActionType,
    reason: `Manual open: ${reason}`,
  });
}
