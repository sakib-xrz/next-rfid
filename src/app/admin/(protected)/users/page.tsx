import { UsersManagement } from "@/components/admin/users-management";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Review all users, approve pending requests, and update account status.
        </p>
      </div>
      <UsersManagement />
    </div>
  );
}
