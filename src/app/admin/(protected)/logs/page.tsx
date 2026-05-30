import { Activity } from "lucide-react";

import { LogsTable } from "@/components/admin/logs-table";

export default function AdminLogsPage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-lg p-4 sm:p-5 md:p-6">
        <span className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <Activity className="size-3.5 text-primary" />
          Event stream
        </span>
        <h1 className="mt-3 font-heading text-2xl font-semibold sm:text-3xl">
          IN/OUT Logs
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Search the real-time ledger of physical scans, driver identity, device,
          and gate direction.
        </p>
      </div>
      <LogsTable />
    </div>
  );
}
