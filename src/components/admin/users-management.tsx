"use client";

import {
  BadgeCheck,
  FileText,
  Loader2,
  RadioTower,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { UserStatusBadge } from "@/components/admin/status-badges";
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
import type {
  RfidReaderPortStatus,
  RfidReaderStatus,
  UserRow,
} from "@/lib/types";

const MAX_RFID_LENGTH = 24;
const RFID_CAPTURE_POLL_MS = 1000;
const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
] as const;
const MANAGEABLE_STATUSES = ["ACTIVE", "INACTIVE"] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];
type ManageableStatus = (typeof MANAGEABLE_STATUSES)[number];

function isManageableStatus(
  status: UserRow["status"],
): status is ManageableStatus {
  return MANAGEABLE_STATUSES.includes(status as ManageableStatus);
}

function isReaderStatus(payload: unknown): payload is RfidReaderStatus {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "ports" in payload &&
    Array.isArray(payload.ports)
  );
}

function getNewestCapturedPort(
  ports: RfidReaderPortStatus[],
  startedAt: string,
) {
  return ports
    .filter(
      (port) =>
        port.last_epc &&
        port.last_seen_at &&
        new Date(port.last_seen_at).getTime() > new Date(startedAt).getTime(),
    )
    .sort(
      (first, second) =>
        new Date(second.last_seen_at ?? 0).getTime() -
        new Date(first.last_seen_at ?? 0).getTime(),
    )[0];
}

export function UsersManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [rfidInput, setRfidInput] = useState("");
  const [rfidCaptureStartedAt, setRfidCaptureStartedAt] = useState<
    string | null
  >(null);
  const [rfidScannerMessage, setRfidScannerMessage] = useState(
    "Waiting for scanner...",
  );
  const [rfidScannerConnected, setRfidScannerConnected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusDraftByUserId, setStatusDraftByUserId] = useState<
    Record<string, ManageableStatus>
  >({});
  const [licensePreview, setLicensePreview] = useState<{
    open: boolean;
    front?: string;
    back?: string;
  }>({ open: false });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint =
        statusFilter === "ALL"
          ? "/api/admin/users"
          : `/api/admin/users?status=${statusFilter}`;
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = (await response.json()) as {
        users?: UserRow[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load users");
      }

      setUsers(payload.users ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  async function handleReject(userId: string) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Failed to reject user");
      toast.success("User request rejected");
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reject failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!selectedUser) return;
    const value = rfidInput.trim();
    if (!value) {
      toast.error("Scan RFID before approving");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/users/${selectedUser.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rfid_number: value.slice(0, MAX_RFID_LENGTH),
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Failed to approve user");
      toast.success("User approved and activated");
      closeAssignDialog();
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approve failed");
    } finally {
      setSubmitting(false);
    }
  }

  function openAssignDialog(user: UserRow) {
    setSelectedUser(user);
    setRfidInput("");
    setRfidCaptureStartedAt(new Date().toISOString());
    setRfidScannerConnected(false);
    setRfidScannerMessage("Waiting for next RFID scan...");
  }

  function closeAssignDialog() {
    setSelectedUser(null);
    setRfidInput("");
    setRfidCaptureStartedAt(null);
    setRfidScannerConnected(false);
    setRfidScannerMessage("Waiting for scanner...");
  }

  async function handleStatusUpdate(userId: string, status: ManageableStatus) {
    setStatusUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? "Failed to update status");
      toast.success("User status updated");
      await loadUsers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status",
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function openLicensePreview(user: UserRow) {
    setSubmitting(true);
    try {
      const [frontRes, backRes] = await Promise.all([
        fetch("/api/admin/licenses/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: user.license_front_url }),
        }),
        fetch("/api/admin/licenses/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: user.license_back_url }),
        }),
      ]);

      const frontPayload = await frontRes.json();
      const backPayload = await backRes.json();

      if (!frontRes.ok || !backRes.ok) {
        throw new Error(
          frontPayload.error ?? backPayload.error ?? "Failed to load licenses",
        );
      }

      setLicensePreview({
        open: true,
        front: frontPayload.signedUrl,
        back: backPayload.signedUrl,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to preview license",
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => {
      clearTimeout(timerId);
    };
  }, [loadUsers]);

  useEffect(() => {
    if (!selectedUser || !rfidCaptureStartedAt) return;

    let cancelled = false;
    const captureStartedAt = rfidCaptureStartedAt;

    async function captureLatestRfid() {
      try {
        const response = await fetch("/api/rfid/status", { cache: "no-store" });
        const payload = (await response.json()) as unknown;

        if (!response.ok || !isReaderStatus(payload)) {
          throw new Error("Unable to read RFID scanner status");
        }

        if (cancelled) return;

        setRfidScannerConnected(
          payload.ports.some((port) => port.connected),
        );

        const capturedPort = getNewestCapturedPort(
          payload.ports,
          captureStartedAt,
        );

        if (capturedPort?.last_epc) {
          const scannedValue = capturedPort.last_epc.slice(0, MAX_RFID_LENGTH);
          setRfidInput(scannedValue);
          setRfidScannerMessage(`Captured from ${capturedPort.device_name}`);
          return;
        }

        if (payload.ports.length === 0) {
          setRfidScannerMessage("No active COM reader is configured");
        } else if (!payload.ports.some((port) => port.connected)) {
          setRfidScannerMessage("Waiting for reader connection...");
        } else {
          setRfidScannerMessage("Waiting for next RFID scan...");
        }
      } catch (error) {
        if (!cancelled) {
          setRfidScannerConnected(false);
          setRfidScannerMessage(
            error instanceof Error
              ? error.message
              : "Unable to read RFID scanner status",
          );
        }
      }
    }

    const initialTimerId = setTimeout(() => {
      void captureLatestRfid();
    }, 0);
    const intervalId = setInterval(() => {
      void captureLatestRfid();
    }, RFID_CAPTURE_POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(initialTimerId);
      clearInterval(intervalId);
    };
  }, [rfidCaptureStartedAt, selectedUser]);

  const visibleUsers = users.filter((user) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    return [
      user.name,
      user.email,
      user.phone,
      user.institution_id,
      user.car_number,
      user.course ?? "",
      user.role,
      user.rfid_number ?? "",
      user.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <>
      <div className="glass-panel mb-4 rounded-lg p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold">Access Queue</h2>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading users..."
                : `${visibleUsers.length} visible records`}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search users, IDs, cars, RFID"
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue placeholder="Filter users" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadUsers()}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card/90 shadow-sm">
        <Table className="min-w-[1180px]">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Car Number</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>License</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading users...
                </TableCell>
              </TableRow>
            ) : visibleUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-muted-foreground"
                >
                  No users found for the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              visibleUsers.map((user) => (
                <TableRow key={user.id} className="whitespace-nowrap">
                  <TableCell className="font-semibold">
                    {user.name}
                    <div className="font-mono text-xs">
                      {user.institution_id}
                      <span className="ml-2 text-primary">{user.role}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {user.car_number}
                  </TableCell>
                  <TableCell>{user.course?.replace("_", " ") ?? "-"}</TableCell>
                  <TableCell>
                    <UserStatusBadge status={user.status} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={submitting}
                      onClick={() => void openLicensePreview(user)}
                    >
                      <FileText className="size-4" />
                      View
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.status === "PENDING" ? (
                        <>
                          <Button
                            size="icon"
                            disabled={submitting}
                            onClick={() => openAssignDialog(user)}
                          >
                            <BadgeCheck className="size-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled={submitting}
                            onClick={() => void handleReject(user.id)}
                          >
                            <XCircle className="size-4" />
                          </Button>
                        </>
                      ) : isManageableStatus(user.status) ? (
                        <>
                          <Select
                            value={statusDraftByUserId[user.id] ?? user.status}
                            onValueChange={(value) =>
                              setStatusDraftByUserId((prev) => ({
                                ...prev,
                                [user.id]: value as ManageableStatus,
                              }))
                            }
                            disabled={submitting || statusUpdatingId === user.id}
                          >
                            <SelectTrigger className="h-9 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MANAGEABLE_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              submitting ||
                              statusUpdatingId === user.id ||
                              (statusDraftByUserId[user.id] ?? user.status) ===
                              user.status
                            }
                            onClick={() =>
                              void handleStatusUpdate(
                                user.id,
                                (statusDraftByUserId[user.id] ??
                                  user.status) as ManageableStatus,
                              )
                            }
                          >
                            Update
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">
                          No action
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) closeAssignDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign RFID Tag</DialogTitle>
            <DialogDescription>
              Scan RFID for{" "}
              <span className="font-medium">{selectedUser?.name}</span>. Maximum
              24 characters.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/35 p-4 mt-5">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border bg-card/70 px-3 py-2 text-sm">
              <span className="inline-flex min-w-0 items-center gap-2">
                <RadioTower className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 break-words">
                  {rfidScannerMessage}
                </span>
              </span>
              <span
                className="size-2.5 shrink-0 rounded-full data-[connected=true]:bg-emerald-500 data-[connected=false]:bg-muted-foreground"
                data-connected={rfidScannerConnected}
              />
            </div>
            <Input
              autoFocus
              value={rfidInput}
              maxLength={MAX_RFID_LENGTH}
              onChange={(event) =>
                setRfidInput(event.target.value.slice(0, MAX_RFID_LENGTH))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleApprove();
                }
              }}
              placeholder="Scan RFID now..."
              className="text-center font-mono text-lg"
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {rfidInput.length}/{MAX_RFID_LENGTH} characters
            </p>
          </div>
          <DialogFooter className="mt-5">
            <Button variant="outline" onClick={closeAssignDialog}>
              Cancel
            </Button>
            <Button onClick={() => void handleApprove()} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Approve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={licensePreview.open}
        onOpenChange={(open) =>
          setLicensePreview((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>License Documents</DialogTitle>
            <DialogDescription>
              Admin-only license preview links.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            {licensePreview.front ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={licensePreview.front}
                alt="License front"
                className="h-auto w-full rounded-lg border object-cover"
              />
            ) : null}
            {licensePreview.back ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={licensePreview.back}
                alt="License back"
                className="h-auto w-full rounded-lg border object-cover"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
