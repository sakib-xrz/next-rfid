"use client";

import { Loader2, MapPin, Plus, RadioTower, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ActionBadge, DeviceStatusBadge } from "@/components/admin/status-badges";
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
import type { ActionType, ScanDeviceRow } from "@/lib/types";

export function DevicesManagement() {
  const [devices, setDevices] = useState<ScanDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add device form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ActionType>("IN");
  const [newLocation, setNewLocation] = useState("");
  const [newSerialNumber, setNewSerialNumber] = useState("");

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/devices", { cache: "no-store" });
      const payload = (await response.json()) as {
        devices?: ScanDeviceRow[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load devices");
      }

      setDevices(payload.devices ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load devices",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleToggleStatus(deviceId: string) {
    setTogglingId(deviceId);
    try {
      const response = await fetch(`/api/admin/devices/${deviceId}/status`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to toggle status");
      }
      toast.success("Device status updated");
      await loadDevices();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle status",
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleAddDevice() {
    if (!newName.trim() || !newLocation.trim()) {
      toast.error("Name and location are required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          type: newType,
          location: newLocation.trim(),
          serial_number: newSerialNumber.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create device");
      }
      toast.success("Device created successfully");
      setShowAddDialog(false);
      setNewName("");
      setNewType("IN");
      setNewLocation("");
      setNewSerialNumber("");
      await loadDevices();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create device",
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadDevices();
    }, 0);

    return () => {
      clearTimeout(timerId);
    };
  }, [loadDevices]);

  return (
    <>
      <div className="glass-panel mb-4 rounded-lg p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold">
              Scanner Registry
            </h2>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Checking devices..."
                : `${devices.length} devices registered`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="size-4" />
              Add Device
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadDevices()}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card/90 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Device Code / Serial Number</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading devices...
                </TableCell>
              </TableRow>
            ) : devices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No scan devices found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell>
                    <ActionBadge action={device.type} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <RadioTower className="size-3.5" />
                      {device.serial_number ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="size-3.5 text-primary" />
                      {device.location}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DeviceStatusBadge active={device.is_active} />
                  </TableCell>
                  <TableCell>
                    {formatMalaysiaDateTime(device.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={togglingId === device.id}
                      onClick={() => void handleToggleStatus(device.id)}
                    >
                      {togglingId === device.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : device.is_active ? (
                        "Deactivate"
                      ) : (
                        "Activate"
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setNewName("");
            setNewType("IN");
            setNewLocation("");
            setNewSerialNumber("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Scan Device</DialogTitle>
            <DialogDescription>
              Register a new RFID scanner device. Choose whether it handles
              check-ins (IN) or check-outs (OUT).
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/35 p-4 mt-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Device Name</Label>
                <Input
                  id="device-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Main Gate Scanner"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-type">Type</Label>
                <Select
                  value={newType}
                  onValueChange={(value) => setNewType(value as ActionType)}
                >
                  <SelectTrigger id="device-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">IN (Check-in)</SelectItem>
                    <SelectItem value="OUT">OUT (Check-out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-location">Location / Gate</Label>
                <Input
                  id="device-location"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Gate A, Building B Entrance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-serial">
                  Device Code / Serial Number
                </Label>
                <Input
                  id="device-serial"
                  value={newSerialNumber}
                  onChange={(e) => setNewSerialNumber(e.target.value)}
                  placeholder="e.g. COM9, RFID-SN-001 (optional)"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setNewName("");
                setNewType("IN");
                setNewLocation("");
                setNewSerialNumber("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleAddDevice()}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Device"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
