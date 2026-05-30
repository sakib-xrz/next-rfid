import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Car,
  CircuitBoard,
  RadioTower,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import { RequestJoinDialog } from "@/components/request-join-dialog";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <section className="relative border-b bg-background/40">
        <div className="absolute inset-0 surface-grid opacity-40" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex min-w-0 items-center gap-2 font-heading font-semibold sm:gap-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background sm:size-10">
                <RadioTower className="size-5" />
              </span>
              <span className="truncate">GateFlow RFID</span>
            </Link>
            <nav className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Button asChild variant="ghost" size="sm" className="px-2.5 sm:px-3">
                <Link href="/scan-rfid">Kiosk</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="px-2.5 sm:px-3">
                <Link href="/admin/login">Admin</Link>
              </Button>
            </nav>
          </header>

          <div className="grid flex-1 items-center gap-7 py-8 sm:gap-10 sm:py-10 lg:grid-cols-[1fr_0.92fr] lg:gap-14 lg:py-14">
            <div className="max-w-3xl space-y-6 sm:space-y-7">
              <div className="inline-flex max-w-full items-center gap-2 rounded-lg border bg-card/80 px-3 py-2 text-sm font-semibold text-muted-foreground shadow-sm">
                <ScanLine className="size-4 text-primary" />
                <span className="min-w-0 truncate">
                  Campus gate operations, live by default
                </span>
              </div>
              <div className="space-y-5">
                <h1 className="font-heading text-4xl font-semibold leading-tight text-foreground sm:text-5xl md:text-6xl">
                  GateFlow RFID
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                  A modern car attendance experience for campuses: request access,
                  approve drivers, scan vehicles, and watch every gate session update
                  in one calm control room.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <RequestJoinDialog triggerClassName="w-full sm:w-auto" />
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href="/scan-rfid">
                    Open Scan Screen
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-3 pt-3 sm:grid-cols-3">
                {[
                  ["< 1s", "scan response"],
                  ["24/7", "live session ledger"],
                  ["3-step", "approval workflow"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-lg border bg-card/75 p-4 shadow-sm backdrop-blur"
                  >
                    <p className="font-heading text-2xl font-semibold">{value}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel relative overflow-hidden rounded-lg p-3 sm:p-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-amber-400 to-rose-400" />
              <div className="grid gap-4">
                <div className="rounded-lg border bg-foreground p-4 text-background sm:p-5">
                  <div className="flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-background/65">Main Gate A</p>
                      <p className="font-heading text-2xl font-semibold sm:text-3xl">
                        RFID Kiosk
                      </p>
                    </div>
                    <span className="w-fit rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
                      ONLINE
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 sm:mt-8 sm:grid-cols-[1fr_0.72fr]">
                    <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                      <div className="mb-8 flex items-center justify-between text-sm text-background/70">
                        <span>RFID READ</span>
                        <CircuitBoard className="size-5 text-primary" />
                      </div>
                      <div className="h-3 rounded-lg bg-white/15">
                        <div className="h-full w-4/5 rounded-lg bg-primary" />
                      </div>
                      <div className="mt-5 grid grid-cols-6 gap-1">
                        {Array.from({ length: 18 }).map((_, index) => (
                          <span
                            key={index}
                            className="h-6 rounded-md bg-white/10 data-[active=true]:bg-primary/80 sm:h-8"
                            data-active={index < 14}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-background p-4 text-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-lg bg-secondary">
                          <Car className="size-5 text-secondary-foreground" />
                        </span>
                        <div>
                          <p className="text-xs text-muted-foreground">PLATE</p>
                          <p className="font-mono text-lg font-semibold">WXY 1234</p>
                        </div>
                      </div>
                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Driver</span>
                          <span className="font-semibold">Approved</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Action</span>
                          <span className="font-semibold text-primary">CHECK-IN</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Session</span>
                          <span className="font-semibold">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      icon: BadgeCheck,
                      title: "Approve",
                      copy: "Assign RFID once",
                    },
                    {
                      icon: ScanLine,
                      title: "Scan",
                      copy: "IN/OUT kiosk flow",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Audit",
                      copy: "Every event logged",
                    },
                  ].map(({ icon: Icon, title, copy }) => (
                    <div key={title} className="rounded-lg border bg-card/80 p-4">
                      <Icon className="size-5 text-primary" />
                      <p className="mt-3 font-heading font-semibold">{title}</p>
                      <p className="text-sm text-muted-foreground">{copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
