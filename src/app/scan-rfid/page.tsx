"use client";

import { Loader2, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ActionType } from "@/lib/types";

const MAX_RFID_LENGTH = 24;
const AUTO_SUBMIT_DELAY_MS = 500;

export default function ScanRfidPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rfidNumber, setRfidNumber] = useState("");
  const [action, setAction] = useState<ActionType>("IN");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submitScan(value: string) {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfid_number: trimmed, action }),
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

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-zinc-100 p-4 md:p-8">
      <Card className="h-full w-full max-w-6xl shadow-xl">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex items-center justify-center">
            <ScanLine className="size-8" />
          </div>
          <CardTitle className="text-center text-3xl tracking-tight md:text-4xl">
            RFID Scan Kiosk
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Full-screen kiosk mode. Scan card and submit runs automatically after 0.5s.
          </p>
        </CardHeader>
        <CardContent className="mx-auto flex h-[calc(100%-7rem)] w-full max-w-4xl flex-col justify-center space-y-8">
          <div className="space-y-3">
            <Label className="text-base md:text-lg">Current Mode</Label>
            <RadioGroup
              value={action}
              onValueChange={(value) => setAction(value as ActionType)}
              className="grid grid-cols-2 gap-3"
            >
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-4 text-base">
                <RadioGroupItem value="IN" id="action-in" />
                <span className="font-medium">IN</span>
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-4 text-base">
                <RadioGroupItem value="OUT" id="action-out" />
                <span className="font-medium">OUT</span>
              </label>
            </RadioGroup>
          </div>

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
              {rfidNumber.length}/{MAX_RFID_LENGTH} characters
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
