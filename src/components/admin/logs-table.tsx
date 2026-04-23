"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMalaysiaDateTime } from "@/lib/time";
import type { LogRow } from "@/lib/types";

export function LogsTable() {
  const [filters, setFilters] = useState({ name: "", email: "", rfid: "" });

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
    return (
      name.includes(filters.name.toLowerCase()) &&
      email.includes(filters.email.toLowerCase()) &&
      rfid.includes(filters.rfid.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="grid w-full gap-3 md:grid-cols-3">
          <Input
            placeholder="Search by user name"
            value={filters.name}
            onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            placeholder="Search by email"
            value={filters.email}
            onChange={(event) => setFilters((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            placeholder="Search by RFID"
            value={filters.rfid}
            onChange={(event) => setFilters((prev) => ({ ...prev, rfid: event.target.value }))}
          />
        </div>
        <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
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

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>RFID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Time (Asia/Kuala_Lumpur)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Loading logs...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{(Array.isArray(log.users) ? log.users[0] : log.users)?.name ?? "-"}</TableCell>
                  <TableCell>{(Array.isArray(log.users) ? log.users[0] : log.users)?.email ?? "-"}</TableCell>
                  <TableCell>
                    {(Array.isArray(log.users) ? log.users[0] : log.users)?.rfid_number ?? "-"}
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
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
