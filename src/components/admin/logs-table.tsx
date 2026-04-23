"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { formatDhakaDateTime } from "@/lib/time";
import type { LogRow } from "@/lib/types";

export function LogsTable() {
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [filters, setFilters] = useState({ name: "", email: "", rfid: "" });
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("logs")
      .select("id,user_id,action,created_at,users(name,email,rfid_number)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setLogs((data ?? []) as LogRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLogs();
    }, 0);

    const channel = supabase
      .channel("admin-logs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "logs" }, () => {
        void loadLogs();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        void loadLogs();
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadLogs, supabase]);

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
      <div className="grid gap-3 md:grid-cols-3">
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

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>RFID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Time (Asia/Dhaka)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
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
                  <TableCell>{formatDhakaDateTime(log.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
