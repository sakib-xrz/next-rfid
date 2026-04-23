import { SessionsTable } from "@/components/admin/sessions-table";

export default function AdminSessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          View active and historical visit sessions. Force close orphaned sessions as needed.
        </p>
      </div>
      <SessionsTable />
    </div>
  );
}
