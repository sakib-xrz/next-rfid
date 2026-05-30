import { Users } from "lucide-react";

import { UsersManagement } from "@/components/admin/users-management";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-lg p-5 md:p-6">
        <span className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <Users className="size-3.5 text-primary" />
          Driver access
        </span>
        <h1 className="mt-3 font-heading text-3xl font-semibold">User Management</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review applications, inspect licenses, assign RFID tags, and update the
          access state for approved drivers.
        </p>
      </div>
      <UsersManagement />
    </div>
  );
}
