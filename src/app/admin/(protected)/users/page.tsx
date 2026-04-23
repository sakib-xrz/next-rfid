import { UsersManagement } from "@/components/admin/users-management";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Approve pending registration requests by scanning RFID tags, or reject requests.
        </p>
      </div>
      <UsersManagement />
    </div>
  );
}
