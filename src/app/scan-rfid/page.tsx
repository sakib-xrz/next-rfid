"use client";

import { ArrowLeft, Loader2, MapPin, Monitor, RefreshCw, ScanLine } from "lucide-react";
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
    void loadDevices();
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

  // === Device Selector Screen ===
  if (!selectedDevice) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-zinc-100 p-4 md:p-8">
        <Card className="h-full w-full max-w-4xl shadow-xl">
          <CardHeader className="space-y-4 pb-2">
            <div className="flex items-center justify-center">
              <Monitor className="size-8" />
            </div>
            <CardTitle className="text-center text-3xl tracking-tight md:text-4xl">
              Select Scan Device
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              Choose which scanner device this kiosk is connected to.
            </p>
          </CardHeader>
          <CardContent className="mx-auto flex h-[calc(100%-7rem)] w-full max-w-3xl flex-col justify-center">
            {loadingDevices ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="size-8 animate-spin" />
                <span>Loading devices...</span>
              </div>
            ) : devices.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <Monitor className="size-10 opacity-40" />
                <p className="text-lg font-medium">No active devices found</p>
                <p className="text-sm">
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
                    className="group flex flex-col gap-3 rounded-xl border-2 border-zinc-200 bg-white p-6 text-left transition-all hover:border-primary hover:shadow-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">
                        {device.name}
                      </span>
                      <Badge
                        variant={
                          device.type === "IN" ? "default" : "secondary"
                        }
                        className="text-sm"
                      >
                        {device.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4 shrink-0" />
                      {device.location}
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
    <main className="flex h-screen w-screen items-center justify-center bg-zinc-100 p-4 md:p-8">
      <Card className="h-full w-full max-w-6xl shadow-xl">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChangeDevice}
              className="gap-1"
            >
              <ArrowLeft className="size-4" />
              Change Device
            </Button>
            <Badge
              variant={selectedDevice.type === "IN" ? "default" : "secondary"}
              className="px-4 py-1.5 text-base"
            >
              {selectedDevice.type === "IN" ? "CHECK-IN" : "CHECK-OUT"}
            </Badge>
          </div>
          <div className="flex items-center justify-center">
            <ScanLine className="size-8" />
          </div>
          <CardTitle className="text-center text-3xl tracking-tight md:text-4xl">
            {selectedDevice.name}
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {selectedDevice.location}
          </div>
        </CardHeader>
        <CardContent className="mx-auto flex h-[calc(100%-10rem)] w-full max-w-4xl flex-col justify-center space-y-8">
          <div className="space-y-3">
            <Label htmlFor="rfid-input" className="text-base">
              RFID Input
            </Label>
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
              className="h-20 text-center text-2xl tracking-widest md:text-3xl"
              placeholder="Scan RFID card..."
            />
            <p className="text-center text-xs text-muted-foreground">
              {rfidNumber.length}/{MAX_RFID_LENGTH} characters &middot;
              Auto-submits after 0.5s at full length
            </p>
          </div>
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Processing scan...
              </span>
            ) : (
              "Waiting for next scan..."
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
