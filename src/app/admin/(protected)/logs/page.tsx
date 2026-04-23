import { LogsTable } from "@/components/admin/logs-table";

export default function AdminLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">IN/OUT Logs</h1>
        <p className="text-sm text-muted-foreground">
          Real-time ledger of every successful physical scan.
        </p>
      </div>
      <LogsTable />
    </div>
  );
}
