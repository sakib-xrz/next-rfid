"use client";

import {
  Activity,
  Clock3,
  LayoutDashboard,
  LogOut,
  Monitor,
  RadioTower,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/logs", label: "Logs", icon: Activity },
  { href: "/admin/sessions", label: "Sessions", icon: Clock3 },
  { href: "/admin/devices", label: "Devices", icon: Monitor },
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
    <header className="sticky top-0 z-40 border-b bg-background/78 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex min-w-0 items-center gap-2 font-heading font-semibold sm:gap-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background sm:size-10">
              <RadioTower className="size-5" />
            </span>
            <span className="truncate">GateFlow Admin</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="px-2.5 sm:px-3"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            <span className="max-[360px]:hidden">Logout</span>
          </Button>
        </div>
        <nav className="flex w-full max-w-full gap-1 overflow-x-auto rounded-lg border bg-card/70 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map(({ icon: Icon, ...link }) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-3",
                pathname === link.href && "bg-primary text-primary-foreground shadow-sm"
              )}
            >
              <Icon className="size-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
