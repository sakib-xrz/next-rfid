import { DashboardOverview } from "@/components/admin/dashboard-overview";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live overview of active users, inside count, and pending requests.
        </p>
      </div>
      <DashboardOverview />
    </div>
  );
}
