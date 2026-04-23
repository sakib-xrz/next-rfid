"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { formatDhakaDate, formatDhakaTime, formatDuration } from "@/lib/time";
import type { SessionRow } from "@/lib/types";

export function SessionsTable() {
  const supabase = useMemo(() => createClient(), []);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("id,user_id,in_time,out_time,total_time,users(name,rfid_number,email)")
      .order("in_time", { ascending: false })
      .limit(300);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSessions((data ?? []) as SessionRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSessions();
    }, 0);
    const channel = supabase
      .channel("admin-sessions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
        void loadSessions();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        void loadSessions();
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadSessions, supabase]);

  async function handleForceClose(sessionId: string) {
    setSubmittingId(sessionId);
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}/force-close`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Force close failed");
      toast.success("Session force-closed");
      await loadSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Force close failed");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>RFID/ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>In Time</TableHead>
            <TableHead>Out Time</TableHead>
            <TableHead>Total Time</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                Loading sessions...
              </TableCell>
            </TableRow>
          ) : sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                No sessions found.
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  {(Array.isArray(session.users) ? session.users[0] : session.users)?.name ?? "-"}
                </TableCell>
                <TableCell>
                  {(Array.isArray(session.users) ? session.users[0] : session.users)?.rfid_number ??
                    session.user_id.slice(0, 8)}
                </TableCell>
                <TableCell>{formatDhakaDate(session.in_time)}</TableCell>
                <TableCell>{formatDhakaTime(session.in_time)}</TableCell>
                <TableCell>{formatDhakaTime(session.out_time)}</TableCell>
                <TableCell>
                  {session.total_time === null && session.out_time === null
                    ? "Active"
                    : formatDuration(session.total_time)}
                </TableCell>
                <TableCell className="text-right">
                  {session.out_time ? (
                    <span className="text-xs text-muted-foreground">None</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={submittingId === session.id}
                      onClick={() => void handleForceClose(session.id)}
                    >
                      Force Close
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
