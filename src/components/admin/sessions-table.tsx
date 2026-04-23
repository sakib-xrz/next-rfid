"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { formatDhakaDate, formatDhakaTime, formatDuration } from "@/lib/time";
import type { SessionRow } from "@/lib/types";

export function SessionsTable() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const {
    data: sessions = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("id,user_id,in_time,out_time,total_time,users(name,rfid_number,email)")
      .order("in_time", { ascending: false })
      .limit(300);

    if (error) {
        throw error;
    }

      return (data ?? []) as SessionRow[];
    },
  });

  useEffect(() => {
    if (isError && error instanceof Error) {
      toast.error(error.message);
    }
  }, [error, isError]);

  const forceCloseMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/admin/sessions/${sessionId}/force-close`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Force close failed");
      return sessionId;
    },
    onSuccess: async () => {
      toast.success("Session force-closed");
      await queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Force close failed");
    },
  });

  function handleForceClose(sessionId: string) {
    forceCloseMutation.mutate(sessionId);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
            <TableHead>RFID/ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>In Time</TableHead>
            <TableHead>Out Time</TableHead>
            <TableHead>Total Time</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
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
                      disabled={
                        forceCloseMutation.isPending && forceCloseMutation.variables === session.id
                      }
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
    </div>
  );
}
