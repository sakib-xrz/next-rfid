"use client";

import {
  ArrowLeft,
  Car,
  Loader2,
  MapPin,
  Monitor,
  RadioTower,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScanDeviceRow } from "@/lib/types";

const MAX_RFID_LENGTH = 24;
const AUTO_SUBMIT_DELAY_MS = 500;

export default function ScanRfidPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rfidNumber, setRfidNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Device state
  const [devices, setDevices] = useState<ScanDeviceRow[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<ScanDeviceRow | null>(
    null,
  );

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const response = await fetch("/api/devices?active=true", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        devices?: ScanDeviceRow[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load devices");
      }

      const activeDevices = payload.devices ?? [];
      setDevices(activeDevices);

      // Auto-select if only one device is active
      if (activeDevices.length === 1) {
        setSelectedDevice(activeDevices[0]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load devices",
      );
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadDevices();
    }, 0);

    return () => {
      clearTimeout(timerId);
    };
  }, [loadDevices]);

  // Focus input when device is selected
  useEffect(() => {
    if (selectedDevice) {
      // Small delay to allow the DOM to update
      const id = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [selectedDevice]);

  async function submitScan(value: string) {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting || !selectedDevice) return;

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfid_number: trimmed,
          device_id: selectedDevice.id,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Scan failed");
      }

      toast.success(payload.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setRfidNumber("");
      inputRef.current?.focus();
      setIsSubmitting(false);
    }
  }

  function handleValueChange(value: string) {
    const trimmed = value.slice(0, MAX_RFID_LENGTH);
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    setRfidNumber(trimmed);
    if (trimmed.length === MAX_RFID_LENGTH) {
      autoSubmitTimerRef.current = setTimeout(() => {
        void submitScan(trimmed);
      }, AUTO_SUBMIT_DELAY_MS);
    }
  }

  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, []);

  function handleChangeDevice() {
    setSelectedDevice(null);
    setRfidNumber("");
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
  }

  const scanProgress = Math.round((rfidNumber.length / MAX_RFID_LENGTH) * 100);

  // === Device Selector Screen ===
  if (!selectedDevice) {
    return (
      <main className="relative flex min-h-svh w-full items-stretch justify-start overflow-hidden p-3 sm:p-4 md:p-8">
        <div className="absolute inset-0 surface-grid opacity-35" aria-hidden="true" />
        <Card className="relative mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden sm:min-h-[calc(100svh-2rem)] md:min-h-[calc(100svh-4rem)]">
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
                disabled={loadingDevices}
                onClick={() => void loadDevices()}
              >
                {loadingDevices ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Refresh
              </Button>
            </div>
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-lg bg-foreground text-background">
                <Monitor className="size-7" />
              </span>
              <CardTitle className="mt-4 text-2xl sm:mt-5 sm:text-3xl md:text-5xl">
                Select Scan Device
              </CardTitle>
              <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
                Pick the physical scanner attached to this kiosk. Only active
                devices appear here.
              </p>
            </div>
          </CardHeader>
          <CardContent className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-3 pb-4 sm:px-5 md:px-6">
            {loadingDevices ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/45 px-3 py-12 text-center text-muted-foreground sm:py-16">
                <Loader2 className="size-10 animate-spin text-primary" />
                <span className="font-semibold">Loading active devices...</span>
              </div>
            ) : devices.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/45 px-3 py-12 text-center text-muted-foreground sm:px-4 sm:py-16">
                <Monitor className="size-12 opacity-50" />
                <p className="font-heading text-xl font-semibold text-foreground">
                  No active devices found
                </p>
                <p className="max-w-md text-sm leading-6">
                  Ask an administrator to add and activate a scan device first.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => void loadDevices()}
                >
                  <RefreshCw className="size-4" />
                  Retry
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {devices.map((device) => (
                  <button
                    key={device.id}
                    type="button"
                    onClick={() => setSelectedDevice(device)}
                    className="group flex min-h-40 min-w-0 flex-col justify-between rounded-lg border bg-card/85 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg focus:outline-none focus:ring-3 focus:ring-primary/25 sm:min-h-44 sm:p-5"
                  >
                    <div className="flex flex-col gap-2 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between">
                      <span className="min-w-0 break-words font-heading text-lg font-semibold sm:text-xl">
                        {device.name}
                      </span>
                      <Badge
                        variant={
                          device.type === "IN" ? "default" : "secondary"
                        }
                        className="text-sm"
                      >
                        {device.type === "IN" ? "CHECK-IN" : "CHECK-OUT"}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="size-4 shrink-0 text-primary" />
                        {device.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RadioTower className="size-4 shrink-0 text-primary" />
                        {device.serial_number ?? "No serial number"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  // === Scan Mode Screen ===
  return (
    <main className="relative flex min-h-svh w-full items-stretch justify-start overflow-hidden p-3 sm:p-4 md:p-8">
      <div className="absolute inset-0 surface-grid opacity-35" aria-hidden="true" />
      <Card className="relative mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden sm:min-h-[calc(100svh-2rem)] md:min-h-[calc(100svh-4rem)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-amber-400 to-rose-400" />
        <CardHeader className="space-y-4 px-3 py-5 sm:space-y-5 sm:px-5 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleChangeDevice}
              className="gap-1 px-2.5 sm:px-3"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden min-[361px]:inline">Change Device</span>
            </Button>
            <Badge
              variant={selectedDevice.type === "IN" ? "default" : "secondary"}
              className="px-3 py-2 text-sm"
            >
              {selectedDevice.type === "IN" ? "CHECK-IN" : "CHECK-OUT"}
            </Badge>
          </div>
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-lg bg-foreground text-background sm:size-16">
              <ScanLine className="size-8" />
            </span>
            <CardTitle className="mt-4 break-words text-2xl sm:mt-5 sm:text-3xl md:text-5xl">
              {selectedDevice.name}
            </CardTitle>
            <div className="mt-3 flex items-center justify-center gap-2 break-words text-sm text-muted-foreground">
              <MapPin className="size-4 text-primary" />
              {selectedDevice.location}
            </div>
          </div>
        </CardHeader>
        <CardContent className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center space-y-5 px-3 pb-4 sm:px-5 md:px-6">
          <div className="grid gap-5 lg:grid-cols-[0.7fr_1fr] lg:items-stretch">
            <div className="rounded-lg border bg-foreground p-4 text-background sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-background/65">Scanner status</p>
                  <p className="font-heading text-xl font-semibold sm:text-2xl">
                    {isSubmitting ? "Processing" : "Ready"}
                  </p>
                </div>
                {isSubmitting ? (
                  <Loader2 className="size-8 animate-spin text-primary" />
                ) : (
                  <RadioTower className="size-8 text-primary" />
                )}
              </div>
              <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-3 sm:mt-8 sm:p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 sm:size-12">
                    <Car className="size-6 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-background/55">Action mode</p>
                    <p className="break-words font-heading text-lg font-semibold sm:text-xl">
                      {selectedDevice.type === "IN" ? "Vehicle Entry" : "Vehicle Exit"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-1.5 sm:mt-6 sm:gap-2">
                  {Array.from({ length: 16 }).map((_, index) => (
                    <span
                      key={index}
                      className="h-7 rounded-md bg-white/10 data-[active=true]:bg-primary sm:h-9"
                      data-active={index < Math.ceil((rfidNumber.length / MAX_RFID_LENGTH) * 16)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card/80 p-4 shadow-sm sm:p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="rfid-input" className="text-base">
                    RFID Input
                  </Label>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {rfidNumber.length}/{MAX_RFID_LENGTH}
                  </span>
                </div>
                <Input
                  id="rfid-input"
                  ref={inputRef}
                  value={rfidNumber}
                  autoFocus
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={MAX_RFID_LENGTH}
                  onChange={(event) => handleValueChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (autoSubmitTimerRef.current) {
                        clearTimeout(autoSubmitTimerRef.current);
                        autoSubmitTimerRef.current = null;
                      }
                      void submitScan(rfidNumber);
                    }
                  }}
                  className="h-16 text-center font-mono text-sm min-[420px]:text-lg sm:h-20 sm:text-2xl md:text-3xl"
                  placeholder="Scan RFID card..."
                />
                <div className="h-2 rounded-lg bg-muted">
                  <div
                    className="h-full rounded-lg bg-primary transition-all"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Auto-submits after 0.5s when the RFID value reaches full length.
                </p>
              </div>
              <div className="mt-5 flex items-center justify-center rounded-lg border bg-muted/45 px-3 py-4 text-center text-sm font-semibold text-muted-foreground sm:mt-8 sm:px-4 sm:py-5">
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Processing scan...
                  </span>
                ) : (
                  "Waiting for next scan..."
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
