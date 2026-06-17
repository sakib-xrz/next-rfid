"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  ActionBadge,
  GateEventStatusBadge,
} from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMalaysiaDateTime } from "@/lib/time";
import type { GateEventRow, ScanDeviceRow } from "@/lib/types";

type GateStatus = {
  enabled: boolean;
  relay_ports: Array<{ port: string; connected: boolean }>;
  relay_connected: boolean;
  station_id: string | null;
  open_pulse_ms: number;
  last_event: {
    id: string;
    device_id: string;
    status: string;
    action: string;
    created_at: string;
  } | null;
};

export function GateEventsTable() {
  const [manualOpenDeviceId, setManualOpenDeviceId] = useState("");
  const [manualOpenReason, setManualOpenReason] = useState("");
  const [showManualOpenDialog, setShowManualOpenDialog] = useState(false);
  const [openingGate, setOpeningGate] = useState(false);

  const {
    data: events = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-gate-events"],
    queryFn: async () => {
      const response = await fetch("/api/admin/gate/events", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        events?: GateEventRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load gate events");
      }
      return payload.events ?? [];
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["admin-devices-gate"],
    queryFn: async () => {
      const response = await fetch("/api/admin/devices", { cache: "no-store" });
      const payload = (await response.json()) as {
        devices?: ScanDeviceRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load devices");
      }
      return payload.devices ?? [];
    },
  });

  const { data: gateStatus } = useQuery({
    queryKey: ["gate-status"],
    queryFn: async () => {
      const response = await fetch("/api/gate/status", { cache: "no-store" });
      const payload = (await response.json()) as GateStatus & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load gate status");
      }
      return payload;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (isError && error instanceof Error) {
      toast.error(error.message);
    }
  }, [error, isError]);

  async function handleManualOpen() {
    if (!manualOpenDeviceId || !manualOpenReason.trim()) {
      toast.error("Device and reason are required");
      return;
    }

    setOpeningGate(true);
    try {
      const response = await fetch("/api/admin/gate/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: manualOpenDeviceId,
          reason: manualOpenReason.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to open gate");
      }
      toast.success("Gate open signal sent");
      setShowManualOpenDialog(false);
      setManualOpenReason("");
      await refetch();
    } catch (openError) {
      toast.error(
        openError instanceof Error ? openError.message : "Failed to open gate",
      );
    } finally {
      setOpeningGate(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-lg p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold">Gate Control</h2>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading gate events..."
                : `${events.length} recent gate events`}
            </p>
            {gateStatus && (
              <p className="mt-1 text-xs text-muted-foreground">
                Relay ports:{" "}
                {gateStatus.relay_ports.length > 0
                  ? gateStatus.relay_ports
                      .map(
                        (entry) =>
                          `${entry.port} (${entry.connected ? "connected" : "disconnected"})`,
                      )
                      .join(", ")
                  : "not configured"}{" "}
                · Station: {gateStatus.station_id ?? "all"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowManualOpenDialog(true)}>
              Manual Open
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching && !isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card/90 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading gate events...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No gate events recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{formatMalaysiaDateTime(event.created_at)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{event.device?.name ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">
                      {event.device?.location ?? "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={event.action} />
                  </TableCell>
                  <TableCell>
                    {event.user ? (
                      <div>
                        <div className="font-medium">{event.user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {event.user.rfid_number ?? event.user.email}
                        </div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <GateEventStatusBadge status={event.status} />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {event.reason ?? "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-destructive">
                    {event.error ?? "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showManualOpenDialog} onOpenChange={setShowManualOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Gate Open</DialogTitle>
            <DialogDescription>
              Send an emergency open pulse to the selected barrier gate. This
              action is logged for audit.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4 rounded-lg border bg-muted/35 p-4">
            <div className="space-y-2">
              <Label htmlFor="manual-gate-device">Device</Label>
              <Select
                value={manualOpenDeviceId}
                onValueChange={setManualOpenDeviceId}
              >
                <SelectTrigger id="manual-gate-device">
                  <SelectValue placeholder="Select gate device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name} ({device.type}) — {device.gate_relay_port ?? "no relay port"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-gate-reason">Reason</Label>
              <Input
                id="manual-gate-reason"
                value={manualOpenReason}
                onChange={(event) => setManualOpenReason(event.target.value)}
                placeholder="e.g. Emergency vehicle access"
              />
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button
              variant="outline"
              onClick={() => setShowManualOpenDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleManualOpen()} disabled={openingGate}>
              {openingGate ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Opening...
                </>
              ) : (
                "Open Gate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
