import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminOrRedirect } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminOrRedirect();

  return (
    <div className="min-h-screen bg-zinc-100">
      <AdminNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
