"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, RefreshCw, XCircle } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { ActionBadge } from "@/components/admin/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDuration,
  formatMalaysiaDate,
  formatMalaysiaTime,
} from "@/lib/time";
import type { SessionRow } from "@/lib/types";

export function SessionsTable() {
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
      const response = await fetch("/api/admin/sessions", { cache: "no-store" });
      const payload = (await response.json()) as {
        sessions?: SessionRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load sessions");
      }
      return payload.sessions ?? [];
    },
  });

  useEffect(() => {
    if (isError && error instanceof Error) {
      toast.error(error.message);
    }
  }, [error, isError]);

  const forceCloseMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(
        `/api/admin/sessions/${sessionId}/force-close`,
        {
          method: "POST",
        },
      );
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
      <div className="glass-panel rounded-lg p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold">
              Visit Sessions
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading sessions..."
                : `${sessions.length} sessions visible`}
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
      </div>
      <div className="overflow-hidden rounded-lg border bg-card/90 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>RFID/ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>In Time</TableHead>
              <TableHead>Out Time</TableHead>
              <TableHead>Total Time</TableHead>
              <TableHead>Gate</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading sessions...
                </TableCell>
              </TableRow>
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  No sessions found.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-semibold">
                    {(Array.isArray(session.users)
                      ? session.users[0]
                      : session.users
                    )?.name ?? "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {(Array.isArray(session.users)
                      ? session.users[0]
                      : session.users
                    )?.rfid_number ?? session.user_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>{formatMalaysiaDate(session.in_time)}</TableCell>
                  <TableCell>{formatMalaysiaTime(session.in_time)}</TableCell>
                  <TableCell>{formatMalaysiaTime(session.out_time)}</TableCell>
                  <TableCell>
                    {session.total_time === null && session.out_time === null ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      formatDuration(session.total_time)
                    )}
                  </TableCell>
                  <TableCell>
                    {session.device ? (
                      <span className="inline-flex flex-col gap-1">
                        <ActionBadge action={session.device.type} />
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {session.device.location}
                        </span>
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {session.out_time ? (
                      <Badge variant="neutral">Closed</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={
                          forceCloseMutation.isPending &&
                          forceCloseMutation.variables === session.id
                        }
                        onClick={() => void handleForceClose(session.id)}
                      >
                        {forceCloseMutation.isPending &&
                        forceCloseMutation.variables === session.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
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
