import { DevicesManagement } from "@/components/admin/devices-management";


export default function AdminDevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scan Devices</h1>
        <p className="text-sm text-muted-foreground">
          Manage scan devices, add new scanners, and toggle active status.
        </p>
      </div>
      <DevicesManagement />
    </div>
  );
}
