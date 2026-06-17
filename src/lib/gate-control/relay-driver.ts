export type RelayDriver = {
  pulse(durationMs: number, channel?: number): Promise<void>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
};
