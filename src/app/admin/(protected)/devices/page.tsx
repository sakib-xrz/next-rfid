import { Monitor } from "lucide-react";

import { DevicesManagement } from "@/components/admin/devices-management";

export default function AdminDevicesPage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-lg p-4 sm:p-5 md:p-6">
        <span className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <Monitor className="size-3.5 text-primary" />
          Scanner fleet
        </span>
        <h1 className="mt-3 font-heading text-2xl font-semibold sm:text-3xl">
          Scan Devices
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage kiosk scanners, assign each gate direction, and keep inactive
          devices away from the live scan screen.
        </p>
      </div>
      <DevicesManagement />
    </div>
  );
}
