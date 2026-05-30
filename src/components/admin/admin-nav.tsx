"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/devices", label: "Devices" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/signout", { method: "POST" });
    toast.success("Logged out");
    router.replace("/admin/login");
  }

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/admin" className="font-semibold">
          RFID Admin
        </Link>
        <nav className="flex items-center gap-1 rounded-lg border p-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors",
                pathname === link.href && "bg-primary text-primary-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
