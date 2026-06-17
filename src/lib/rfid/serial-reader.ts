import { getPrismaClient } from "@/lib/prisma";
import { getStationId } from "@/lib/gate-control/config";
import { appendAndParseYanzeoEpcs } from "@/lib/rfid/yanzeo-parser";
import { processScan } from "@/lib/scan-service";
import type {
  ActionType,
  RfidReaderPortStatus,
  RfidReaderStatus,
} from "@/lib/types";

type SerialPortInstance = InstanceType<typeof import("serialport").SerialPort>;

type RfidDeviceConfig = {
  deviceId: string;
  name: string;
  type: ActionType;
  location: string;
  portPath: string;
};

type RfidReaderConfig = {
  baudRate: number;
  dedupeMs: number;
  deviceRefreshMs: number;
  reconnectMs: number;
  scanCommand: Buffer;
  scanIntervalMs: number;
};

type RfidReaderGlobal = {
  rfidSerialReaderManager?: RfidSerialReaderManager;
};

const DEFAULT_BAUD_RATE = 57600;
const DEFAULT_DEDUPE_MS = 10_000;
const DEFAULT_DEVICE_REFRESH_MS = 30_000;
const DEFAULT_RECONNECT_MS = 5_000;
const DEFAULT_SCAN_COMMAND_HEX = "7C0002000102";
const DEFAULT_SCAN_INTERVAL_MS = 80;
const globalForRfidReader = globalThis as unknown as RfidReaderGlobal;

function isReaderEnabled() {
  return process.env.RFID_READER_ENABLED?.toLowerCase() !== "false";
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseHexCommand(value: string | undefined) {
  const sanitized = (value ?? DEFAULT_SCAN_COMMAND_HEX)
    .replace(/\s+/g, "")
    .toUpperCase();

  if (
    !sanitized ||
    sanitized.length % 2 !== 0 ||
    /[^0-9A-F]/.test(sanitized)
  ) {
    return Buffer.from(DEFAULT_SCAN_COMMAND_HEX, "hex");
  }

  return Buffer.from(sanitized, "hex");
}

function getReaderConfig(): RfidReaderConfig {
  return {
    baudRate: parsePositiveInteger(process.env.RFID_BAUD_RATE, DEFAULT_BAUD_RATE),
    dedupeMs: parsePositiveInteger(process.env.RFID_DEDUPE_MS, DEFAULT_DEDUPE_MS),
    deviceRefreshMs: parsePositiveInteger(
      process.env.RFID_DEVICE_REFRESH_MS,
      DEFAULT_DEVICE_REFRESH_MS,
    ),
    reconnectMs: parsePositiveInteger(
      process.env.RFID_RECONNECT_MS,
      DEFAULT_RECONNECT_MS,
    ),
    scanCommand: parseHexCommand(process.env.RFID_SCAN_COMMAND_HEX),
    scanIntervalMs: parsePositiveInteger(
      process.env.RFID_SCAN_INTERVAL_MS,
      DEFAULT_SCAN_INTERVAL_MS,
    ),
  };
}

function getPortKey(portPath: string) {
  return portPath.trim().toLowerCase();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown RFID reader error";
}

function unrefTimer(timer: NodeJS.Timeout) {
  timer.unref?.();
  return timer;
}

class RfidSerialPortWorker {
  private buffer = "";
  private inFlightEpCs = new Set<string>();
  private lastEpC = new Map<string, number>();
  private lastError: string | null = null;
  private lastMessage: string | null = null;
  private lastSeenAt: string | null = null;
  private port: SerialPortInstance | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private scanTimer: NodeJS.Timeout | null = null;
  private state: RfidReaderPortStatus["state"] = "idle";
  private stopping = false;

  constructor(
    private device: RfidDeviceConfig,
    private readonly config: RfidReaderConfig,
  ) {}

  updateDevice(device: RfidDeviceConfig) {
    this.device = device;
  }

  start() {
    if (this.state === "connecting" || this.state === "connected") return;

    this.stopping = false;
    void this.open();
  }

  stop() {
    this.stopping = true;
    this.state = "stopped";
    this.stopScanLoop();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const currentPort = this.port;
    this.port = null;

    if (currentPort?.isOpen) {
      currentPort.close(() => undefined);
    }
  }

  getStatus(): RfidReaderPortStatus {
    return {
      device_id: this.device.deviceId,
      device_name: this.device.name,
      device_type: this.device.type,
      location: this.device.location,
      port: this.device.portPath,
      connected: this.port?.isOpen ?? false,
      state: this.state,
      last_epc: this.lastSeenAt ? this.getMostRecentEpc() : null,
      last_error: this.lastError,
      last_message: this.lastMessage,
      last_seen_at: this.lastSeenAt,
    };
  }

  private async open() {
    this.state = this.state === "reconnecting" ? "reconnecting" : "connecting";
    this.lastError = null;

    try {
      const { SerialPort } = await import("serialport");
      const port = new SerialPort({
        path: this.device.portPath,
        baudRate: this.config.baudRate,
        autoOpen: false,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
      });

      this.port = port;

      port.on("data", (chunk: Buffer) => this.handleData(chunk));
      port.on("error", (error) => {
        this.recordError(error);
        this.scheduleReconnect();
      });
      port.on("close", () => {
        if (this.port === port) {
          this.port = null;
        }

        if (!this.stopping) {
          this.scheduleReconnect();
        }
      });

      await new Promise<void>((resolve, reject) => {
        port.open((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      await new Promise<void>((resolve) => {
        port.flush(() => resolve());
      });

      if (this.stopping) {
        this.stop();
        return;
      }

      this.state = "connected";
      this.lastError = null;
      this.startScanLoop();
      console.info(
        `[RFID] Connected ${this.device.name} on ${this.device.portPath}`,
      );
    } catch (error) {
      this.recordError(error);
      this.scheduleReconnect();
    }
  }

  private startScanLoop() {
    this.stopScanLoop();
    this.writeScanCommand();

    this.scanTimer = unrefTimer(
      setInterval(() => {
        this.writeScanCommand();
      }, this.config.scanIntervalMs),
    );
  }

  private stopScanLoop() {
    if (!this.scanTimer) return;

    clearInterval(this.scanTimer);
    this.scanTimer = null;
  }

  private writeScanCommand() {
    const currentPort = this.port;

    if (!currentPort?.isOpen) return;

    currentPort.write(this.config.scanCommand, (error) => {
      if (error) {
        this.recordError(error);
        this.scheduleReconnect();
      }
    });
  }

  private handleData(chunk: Buffer) {
    const parsed = appendAndParseYanzeoEpcs(this.buffer, chunk);
    this.buffer = parsed.buffer;

    for (const epc of parsed.epcs) {
      this.handleEpc(epc);
    }
  }

  private handleEpc(epc: string) {
    const now = Date.now();
    const previousSeenAt = this.lastEpC.get(epc);

    if (previousSeenAt && now - previousSeenAt < this.config.dedupeMs) {
      return;
    }

    if (this.inFlightEpCs.has(epc)) {
      return;
    }

    this.lastEpC.set(epc, now);
    this.lastSeenAt = new Date(now).toISOString();
    this.lastMessage = null;
    this.pruneLastSeen(now);

    this.inFlightEpCs.add(epc);
    void processScan({
      rfidNumber: epc,
      deviceId: this.device.deviceId,
    })
      .then((result) => {
        this.lastError = null;
        this.lastMessage = result.message;
        console.info(
          `[RFID] ${this.device.name} scanned ${epc}: ${result.message}`,
        );
      })
      .catch((error: unknown) => {
        this.lastError = getErrorMessage(error);
        console.warn(
          `[RFID] ${this.device.name} scanned ${epc}: ${this.lastError}`,
        );
      })
      .finally(() => {
        this.inFlightEpCs.delete(epc);
      });
  }

  private pruneLastSeen(now: number) {
    const retentionMs = this.config.dedupeMs * 6;

    for (const [epc, seenAt] of this.lastEpC) {
      if (now - seenAt > retentionMs) {
        this.lastEpC.delete(epc);
      }
    }
  }

  private getMostRecentEpc() {
    let mostRecentEpc: string | null = null;
    let mostRecentAt = 0;

    for (const [epc, seenAt] of this.lastEpC) {
      if (seenAt > mostRecentAt) {
        mostRecentEpc = epc;
        mostRecentAt = seenAt;
      }
    }

    return mostRecentEpc;
  }

  private recordError(error: unknown) {
    this.lastError = getErrorMessage(error);
    this.lastMessage = null;
    console.warn(
      `[RFID] ${this.device.name} on ${this.device.portPath}: ${this.lastError}`,
    );
  }

  private scheduleReconnect() {
    if (this.stopping || this.reconnectTimer) return;

    this.state = "reconnecting";
    this.stopScanLoop();

    const currentPort = this.port;
    this.port = null;

    if (currentPort?.isOpen) {
      currentPort.close(() => undefined);
    }

    this.reconnectTimer = unrefTimer(
      setTimeout(() => {
        this.reconnectTimer = null;
        this.start();
      }, this.config.reconnectMs),
    );
  }
}

class RfidSerialReaderManager {
  private lastSyncAt: string | null = null;
  private lastSyncError: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private running = false;
  private syncing = false;
  private workers = new Map<string, RfidSerialPortWorker>();

  constructor(private readonly config: RfidReaderConfig) {}

  start() {
    if (this.running) return;

    this.running = true;
    void this.syncDevices();
    this.refreshTimer = unrefTimer(
      setInterval(() => {
        void this.syncDevices();
      }, this.config.deviceRefreshMs),
    );
  }

  stop() {
    this.running = false;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    for (const worker of this.workers.values()) {
      worker.stop();
    }

    this.workers.clear();
  }

  getStatus(): RfidReaderStatus {
    return {
      enabled: isReaderEnabled(),
      last_sync_at: this.lastSyncAt,
      last_sync_error: this.lastSyncError,
      ports: Array.from(this.workers.values(), (worker) => worker.getStatus()),
    };
  }

  private async syncDevices() {
    if (this.syncing) return;

    this.syncing = true;

    try {
      const prisma = getPrismaClient();
      const stationId = getStationId();
      const activeDevices = await prisma.scanDevice.findMany({
        where: {
          isActive: true,
          ...(stationId ? { stationId } : {}),
        },
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          serialNumber: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const nextDevices = this.buildDeviceConfigs(
        activeDevices.map((device) => ({
          deviceId: device.id,
          name: device.name,
          type: device.type as ActionType,
          location: device.location,
          portPath: device.serialNumber?.trim() ?? "",
        })),
      );

      for (const [portKey, worker] of this.workers) {
        const nextDevice = nextDevices.get(portKey);

        if (!nextDevice) {
          worker.stop();
          this.workers.delete(portKey);
          continue;
        }

        worker.updateDevice(nextDevice);
      }

      for (const [portKey, device] of nextDevices) {
        if (this.workers.has(portKey)) continue;

        const worker = new RfidSerialPortWorker(device, this.config);
        this.workers.set(portKey, worker);
        worker.start();
      }

      this.lastSyncAt = new Date().toISOString();
      this.lastSyncError = null;
    } catch (error) {
      this.lastSyncError = getErrorMessage(error);
      console.warn(`[RFID] Device sync failed: ${this.lastSyncError}`);
    } finally {
      this.syncing = false;
    }
  }

  private buildDeviceConfigs(devices: RfidDeviceConfig[]) {
    const nextDevices = new Map<string, RfidDeviceConfig>();

    for (const device of devices) {
      if (!device.portPath) continue;

      const portKey = getPortKey(device.portPath);
      if (nextDevices.has(portKey)) {
        console.warn(
          `[RFID] Duplicate serial port ignored for device ${device.name}: ${device.portPath}`,
        );
        continue;
      }

      nextDevices.set(portKey, device);
    }

    const fallbackPort = process.env.RFID_SERIAL_PORT?.trim();
    if (!fallbackPort || nextDevices.has(getPortKey(fallbackPort))) {
      return nextDevices;
    }

    const fallbackDeviceId = process.env.RFID_SCAN_DEVICE_ID?.trim();
    const fallbackDevice = fallbackDeviceId
      ? devices.find((device) => device.deviceId === fallbackDeviceId)
      : devices.length === 1
        ? devices[0]
        : null;

    if (fallbackDevice) {
      nextDevices.set(getPortKey(fallbackPort), {
        ...fallbackDevice,
        portPath: fallbackPort,
      });
    }

    return nextDevices;
  }
}

export function startRfidSerialReader() {
  if (!isReaderEnabled()) return;

  if (!globalForRfidReader.rfidSerialReaderManager) {
    globalForRfidReader.rfidSerialReaderManager = new RfidSerialReaderManager(
      getReaderConfig(),
    );
  }

  globalForRfidReader.rfidSerialReaderManager.start();
}

export function getRfidSerialReaderStatus(): RfidReaderStatus {
  return (
    globalForRfidReader.rfidSerialReaderManager?.getStatus() ?? {
      enabled: isReaderEnabled(),
      last_sync_at: null,
      last_sync_error: null,
      ports: [],
    }
  );
}
