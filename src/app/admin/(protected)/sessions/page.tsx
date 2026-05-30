import { Clock3 } from "lucide-react";

import { SessionsTable } from "@/components/admin/sessions-table";

export default function AdminSessionsPage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-lg p-5 md:p-6">
        <span className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <Clock3 className="size-3.5 text-primary" />
          Time on site
        </span>
        <h1 className="mt-3 font-heading text-3xl font-semibold">Sessions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review active and historical visit sessions, including duration and the
          scanner that opened each visit.
        </p>
      </div>
      <SessionsTable />
    </div>
  );
}
