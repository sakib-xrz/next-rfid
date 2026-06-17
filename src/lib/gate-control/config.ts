const DEFAULT_BAUD_RATE = 9600;
const DEFAULT_OPEN_PULSE_MS = 2000;

export type GateControlConfig = {
  enabled: boolean;
  baudRate: number;
  openPulseMs: number;
  stationId: string | null;
};

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isGateControlEnabled() {
  return process.env.GATE_CONTROL_ENABLED?.toLowerCase() !== "false";
}

export function getStationId() {
  return process.env.GATE_CONTROL_STATION_ID?.trim() || null;
}

export function getGateControlConfig(): GateControlConfig {
  return {
    enabled: isGateControlEnabled(),
    baudRate: parsePositiveInteger(
      process.env.GATE_RELAY_BAUD_RATE,
      DEFAULT_BAUD_RATE,
    ),
    openPulseMs: parsePositiveInteger(
      process.env.GATE_OPEN_PULSE_MS,
      DEFAULT_OPEN_PULSE_MS,
    ),
    stationId: getStationId(),
  };
}
