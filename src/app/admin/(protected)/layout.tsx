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
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-4 md:px-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
