"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  PlugZap,
  RadioTower,
  RefreshCw,
  Server,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMalaysiaDateTime } from "@/lib/time";
import type {
  RfidReaderPortStatus,
  RfidReaderStatus,
  ScanDeviceRow,
} from "@/lib/types";

const STATUS_REFRESH_MS = 2000;

const EMPTY_READER_STATUS: RfidReaderStatus = {
  enabled: true,
  last_sync_at: null,
  last_sync_error: null,
  ports: [],
};

function getDeviceStatus(
  device: ScanDeviceRow,
  ports: RfidReaderPortStatus[],
) {
  return ports.find((port) => port.device_id === device.id) ?? null;
}

function getReaderLabel(
  device: ScanDeviceRow,
  status: RfidReaderPortStatus | null,
) {
  if (!device.serial_number?.trim()) return "Needs COM Port";
  if (!status) return "Waiting";
  if (status.connected) return "Connected";
  if (status.state === "connecting") return "Connecting...";
  if (status.state === "reconnecting") return "Reconnecting...";
  return "Offline";
}

function getReaderVariant(
  device: ScanDeviceRow,
  status: RfidReaderPortStatus | null,
) {
  if (!device.serial_number?.trim()) return "warning";
  if (status?.connected) return "success";
  if (status?.state === "connecting" || status?.state === "reconnecting") {
    return "warning";
  }
  return "neutral";
}

function getReaderIcon(status: RfidReaderPortStatus | null) {
  if (status?.connected) return <CheckCircle2 className="size-4" />;
  if (status?.state === "connecting" || status?.state === "reconnecting") {
    return <Loader2 className="size-4 animate-spin" />;
  }
  return <WifiOff className="size-4" />;
}

function getPayloadError(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return null;
}

function isReaderStatus(payload: unknown): payload is RfidReaderStatus {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "enabled" in payload &&
    "ports" in payload &&
    Array.isArray(payload.ports)
  );
}

export default function ScanRfidPage() {
  const [devices, setDevices] = useState<ScanDeviceRow[]>([]);
  const [readerStatus, setReaderStatus] =
    useState<RfidReaderStatus>(EMPTY_READER_STATUS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const connectedCount = useMemo(
    () => readerStatus.ports.filter((port) => port.connected).length,
    [readerStatus.ports],
  );

  const loadScannerDashboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setRefreshing(true);
    }

    try {
      const [devicesResponse, statusResponse] = await Promise.all([
        fetch("/api/devices?active=true", { cache: "no-store" }),
        fetch("/api/rfid/status", { cache: "no-store" }),
      ]);

      const devicesPayload = (await devicesResponse.json()) as {
        devices?: ScanDeviceRow[];
        error?: string;
      };
      const statusPayload = (await statusResponse.json()) as unknown;

      if (!devicesResponse.ok) {
        throw new Error(devicesPayload.error ?? "Failed to load devices");
      }

      if (!statusResponse.ok) {
        throw new Error(
          getPayloadError(statusPayload) ?? "Failed to load RFID status",
        );
      }

      if (!isReaderStatus(statusPayload)) {
        throw new Error(
          getPayloadError(statusPayload) ?? "Failed to load RFID status",
        );
      }

      setDevices(devicesPayload.devices ?? []);
      setReaderStatus(statusPayload);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load scanner status",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialTimerId = setTimeout(() => {
      void loadScannerDashboard();
    }, 0);
    const intervalId = setInterval(() => {
      void loadScannerDashboard();
    }, STATUS_REFRESH_MS);

    return () => {
      clearTimeout(initialTimerId);
      clearInterval(intervalId);
    };
  }, [loadScannerDashboard]);

  return (
    <main className="relative flex min-h-svh w-full items-stretch justify-start overflow-hidden p-3 sm:p-4 md:p-8">
      <div
        className="absolute inset-0 surface-grid opacity-35"
        aria-hidden="true"
      />
      <Card className="relative mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden sm:min-h-[calc(100svh-2rem)] md:min-h-[calc(100svh-4rem)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-amber-400 to-rose-400" />
        <CardHeader className="space-y-4 px-3 py-5 sm:space-y-5 sm:px-5 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Home
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="px-2.5 sm:px-3"
              disabled={refreshing}
              onClick={() => void loadScannerDashboard(true)}
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>
          </div>
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-lg bg-foreground text-background sm:size-16">
              <RadioTower className="size-8" />
            </span>
            <CardTitle className="mt-4 break-words text-2xl sm:mt-5 sm:text-3xl md:text-5xl">
              Automated RFID Scanner
            </CardTitle>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
              <Badge variant="neutral" className="gap-1.5">
                <Server className="size-3.5" />
                {devices.length} active devices
              </Badge>
              <Badge variant={connectedCount > 0 ? "success" : "neutral"}>
                {connectedCount} connected
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="mx-auto flex w-full max-w-5xl flex-1 flex-col space-y-5 px-3 pb-4 sm:px-5 md:px-6">
          {readerStatus.last_sync_error ? (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <ShieldAlert className="size-5 shrink-0" />
              <span className="min-w-0 break-words">
                {readerStatus.last_sync_error}
              </span>
            </div>
          ) : null}

          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border bg-muted/45 px-3 py-16 text-center text-muted-foreground">
              <Loader2 className="size-10 animate-spin text-primary" />
              <span className="font-semibold">Loading scanner status...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/45 px-3 py-16 text-center text-muted-foreground sm:px-4">
              <RadioTower className="size-12 opacity-50" />
              <p className="font-heading text-xl font-semibold text-foreground">
                No active devices found
              </p>
              <p className="max-w-md text-sm leading-6">
                Activate a scan device from the admin panel to start listening.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {devices.map((device) => {
                const status = getDeviceStatus(device, readerStatus.ports);
                const readerLabel = getReaderLabel(device, status);

                return (
                  <div
                    key={device.id}
                    className="rounded-lg border bg-card/85 p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
                      <div className="min-w-0">
                        <h2 className="break-words font-heading text-lg font-semibold sm:text-xl">
                          {device.name}
                        </h2>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="size-4 shrink-0 text-primary" />
                          <span className="min-w-0 break-words">
                            {device.location}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={device.type === "IN" ? "default" : "secondary"}
                        className="text-sm"
                      >
                        {device.type === "IN" ? "CHECK-IN" : "CHECK-OUT"}
                      </Badge>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border bg-muted/35 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Reader
                        </p>
                        <Badge
                          variant={getReaderVariant(device, status)}
                          className="mt-2 gap-1.5"
                        >
                          {readerLabel}
                        </Badge>
                      </div>
                      <div className="rounded-lg border bg-muted/35 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Port
                        </p>
                        <p className="mt-2 break-words font-mono text-sm font-semibold">
                          {status?.port ?? device.serial_number ?? "-"}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/35 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Last Scan
                        </p>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold">
                          <Clock3 className="size-4 text-primary" />
                          {formatMalaysiaDateTime(status?.last_seen_at ?? null)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border bg-foreground p-4 text-background">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                          <PlugZap className="size-5 text-primary" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-background/55">
                            Last RFID
                          </p>
                          <p className="break-words font-mono text-sm font-semibold sm:text-base">
                            {status?.last_epc ?? "Waiting for scan"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm">
                        {status?.last_error ??
                          status?.last_message ??
                          "Ready for the next tag"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
