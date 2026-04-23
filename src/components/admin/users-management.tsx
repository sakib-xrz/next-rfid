"use client";

import { Loader2 } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDhakaDateTime } from "@/lib/time";
import type { UserRow } from "@/lib/types";

const MAX_RFID_LENGTH = 24;

export function UsersManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [rfidInput, setRfidInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [licensePreview, setLicensePreview] = useState<{
    open: boolean;
    front?: string;
    back?: string;
  }>({ open: false });

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users/pending", { cache: "no-store" });
      const payload = (await response.json()) as { users?: UserRow[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load pending users");
      }

      setUsers(payload.users ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load pending users");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleReject(userId: string) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reject`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to reject user");
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
      const response = await fetch(`/api/admin/users/${selectedUser.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfid_number: value.slice(0, MAX_RFID_LENGTH) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to approve user");
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
        throw new Error(frontPayload.error ?? backPayload.error ?? "Failed to load licenses");
      }

      setLicensePreview({
        open: true,
        front: frontPayload.signedUrl,
        back: backPayload.signedUrl,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to preview license");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadUsers();
    const intervalId = setInterval(() => {
      void loadUsers();
    }, 10_000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadUsers]);

  return (
    <>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Car Number</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Loading pending requests...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No pending requests.
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
                  <TableCell>{formatDhakaDateTime(user.created_at)}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={submitting}
                      onClick={() => void openLicensePreview(user)}
                    >
                      License
                    </Button>
                    <Button
                      size="sm"
                      disabled={submitting}
                      onClick={() => setSelectedUser(user)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={submitting}
                      onClick={() => void handleReject(user.id)}
                    >
                      Reject
                    </Button>
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
              Scan RFID for <span className="font-medium">{selectedUser?.name}</span>. Maximum 24
              characters.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={rfidInput}
            maxLength={MAX_RFID_LENGTH}
            onChange={(event) => setRfidInput(event.target.value.slice(0, MAX_RFID_LENGTH))}
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
        onOpenChange={(open) => setLicensePreview((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>License Documents</DialogTitle>
            <DialogDescription>Signed URLs expire after 5 minutes.</DialogDescription>
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
