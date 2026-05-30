"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ActionBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMalaysiaDateTime } from "@/lib/time";
import type { LogRow } from "@/lib/types";

export function LogsTable() {
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    rfid: "",
    device: "",
  });

  const {
    data: logs = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const response = await fetch("/api/admin/logs", { cache: "no-store" });
      const payload = (await response.json()) as { logs?: LogRow[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load logs");
      }
      return payload.logs ?? [];
    },
  });

  useEffect(() => {
    if (isError && error instanceof Error) {
      toast.error(error.message);
    }
  }, [error, isError]);

  const filtered = logs.filter((log) => {
    const user = Array.isArray(log.users) ? log.users[0] : log.users;
    const name = user?.name?.toLowerCase() ?? "";
    const email = user?.email?.toLowerCase() ?? "";
    const rfid = (user?.rfid_number ?? "").toLowerCase();
    const device = `${log.device?.name ?? ""} ${log.device?.location ?? ""}`.toLowerCase();
    return (
      name.includes(filters.name.toLowerCase()) &&
      email.includes(filters.email.toLowerCase()) &&
      rfid.includes(filters.rfid.toLowerCase()) &&
      device.includes(filters.device.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-lg p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold">Scan Ledger</h2>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading logs..." : `${filtered.length} matching events`}
            </p>
          </div>
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
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["name", "Search by user name"],
            ["email", "Search by email"],
            ["rfid", "Search by RFID"],
            ["device", "Search by device"],
          ].map(([key, placeholder]) => (
            <div key={key} className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={placeholder}
                value={filters[key as keyof typeof filters]}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    [key]: event.target.value,
                  }))
                }
                className="pl-9"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card/90 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>RFID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Loading logs...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-semibold">
                    {(Array.isArray(log.users) ? log.users[0] : log.users)?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(Array.isArray(log.users) ? log.users[0] : log.users)?.email ?? "-"}
                  </TableCell>
                  <TableCell>
                    {(Array.isArray(log.users) ? log.users[0] : log.users)?.rfid_number ?? "-"}
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={log.action} />
                  </TableCell>
                  <TableCell>
                    {log.device ? (
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="size-3.5 text-primary" />
                        {log.device.name} / {log.device.location}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{formatMalaysiaDateTime(log.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
