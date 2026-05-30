import { Activity } from "lucide-react";

import { DashboardOverview } from "@/components/admin/dashboard-overview";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-lg p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <Activity className="size-3.5 text-primary" />
              Live control room
            </span>
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
              Dashboard
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Live overview of approved drivers, current occupancy, and requests
              waiting for an administrator.
            </p>
          </div>
        </div>
      </div>
      <DashboardOverview />
    </div>
  );
}
