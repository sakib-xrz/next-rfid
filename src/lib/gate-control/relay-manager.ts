import type { RelayDriver } from "@/lib/gate-control/relay-driver";
import { UsbSerialRelayDriver } from "@/lib/gate-control/usb-relay";

type RelayManagerGlobal = {
  gateRelayDrivers?: Map<string, UsbSerialRelayDriver>;
};

const globalForRelayManager = globalThis as unknown as RelayManagerGlobal;

function getPortKey(portPath: string) {
  return portPath.trim().toLowerCase();
}

export function getRelayDriverForPort(
  portPath: string,
  baudRate: number,
): RelayDriver {
  const normalizedPort = portPath.trim();
  if (!normalizedPort) {
    throw new Error("Relay port path is required");
  }

  const portKey = getPortKey(normalizedPort);

  if (!globalForRelayManager.gateRelayDrivers) {
    globalForRelayManager.gateRelayDrivers = new Map();
  }

  const existing = globalForRelayManager.gateRelayDrivers.get(portKey);
  if (existing) {
    return existing;
  }

  const driver = new UsbSerialRelayDriver({
    portPath: normalizedPort,
    baudRate,
  });
  globalForRelayManager.gateRelayDrivers.set(portKey, driver);
  return driver;
}

export async function getRelayHealthByPorts(
  ports: string[],
  baudRate: number,
) {
  const uniquePorts = [...new Set(ports.map((port) => port.trim()).filter(Boolean))];
  const results: Array<{ port: string; connected: boolean }> = [];

  for (const port of uniquePorts) {
    try {
      const driver = getRelayDriverForPort(port, baudRate);
      const connected = await driver.healthCheck();
      results.push({ port, connected });
    } catch {
      results.push({ port, connected: false });
    }
  }

  return results;
}
