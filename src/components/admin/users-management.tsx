"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
import type { UserRow } from "@/lib/types";

const MAX_RFID_LENGTH = 24;
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

export function UsersManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [rfidInput, setRfidInput] = useState("");
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
      setSelectedUser(null);
      setRfidInput("");
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approve failed");
    } finally {
      setSubmitting(false);
    }
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

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-[190px]">
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

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Car Number</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  No users found for the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.car_number}</TableCell>
                  <TableCell>{user.course ?? "-"}</TableCell>
                  <TableCell>{user.status}</TableCell>
                  <TableCell>{formatMalaysiaDateTime(user.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={submitting}
                      onClick={() => void openLicensePreview(user)}
                    >
                      License
                    </Button>
                    {user.status === "PENDING" ? (
                      <>
                        <Button
                          size="sm"
                          disabled={submitting}
                          onClick={() => setSelectedUser(user)}
                          className="ml-2"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={submitting}
                          onClick={() => void handleReject(user.id)}
                          className="ml-2"
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <div className="ml-2 inline-flex items-center gap-2">
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
                          <SelectTrigger className="h-8 w-[140px]">
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
                      </div>
                    )}
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
          if (!open) setSelectedUser(null);
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
            className="text-center text-lg tracking-widest"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
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
