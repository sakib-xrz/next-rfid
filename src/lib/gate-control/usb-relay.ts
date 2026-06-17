import type { RelayDriver } from "@/lib/gate-control/relay-driver";

type SerialPortInstance = InstanceType<typeof import("serialport").SerialPort>;

type UsbRelayOptions = {
  portPath: string;
  baudRate: number;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildRelayCommand(channel: number, state: "on" | "off") {
  if (channel < 1 || channel > 8) {
    throw new Error(`Relay channel must be between 1 and 8, got ${channel}`);
  }

  const stateByte = state === "on" ? 0x01 : 0x00;
  const checksum = (0xa0 + channel + stateByte) & 0xff;
  return Buffer.from([0xa0, channel, stateByte, checksum]);
}

export class UsbSerialRelayDriver implements RelayDriver {
  private readonly options: UsbRelayOptions;
  private port: SerialPortInstance | null = null;
  private connecting: Promise<SerialPortInstance> | null = null;
  private pulseQueue: Promise<void> = Promise.resolve();

  constructor(options: UsbRelayOptions) {
    this.options = options;
  }

  async pulse(durationMs: number, channel = 1): Promise<void> {
    const task = this.pulseQueue.then(async () => {
      const port = await this.getPort();
      await this.writeCommand(port, channel, "on");
      await sleep(durationMs);
      await this.writeCommand(port, channel, "off");
    });

    this.pulseQueue = task.catch(() => undefined);
    await task;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const port = await this.getPort();
      return port.isOpen;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    this.connecting = null;

    if (!this.port) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.port?.close(() => resolve());
    });
    this.port = null;
  }

  private async getPort(): Promise<SerialPortInstance> {
    if (this.port?.isOpen) {
      return this.port;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = this.openPort();
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async openPort(): Promise<SerialPortInstance> {
    const { SerialPort } = await import("serialport");
    const port = new SerialPort({
      path: this.options.portPath,
      baudRate: this.options.baudRate,
      autoOpen: false,
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

    this.port = port;
    return port;
  }

  private async writeCommand(
    port: SerialPortInstance,
    channel: number,
    state: "on" | "off",
  ) {
    const command = buildRelayCommand(channel, state);

    await new Promise<void>((resolve, reject) => {
      port.write(command, (error) => {
        if (error) {
          reject(error);
          return;
        }

        port.drain((drainError) => {
          if (drainError) {
            reject(drainError);
            return;
          }

          resolve();
        });
      });
    });
  }
}
