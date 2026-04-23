import Link from "next/link";

import { RequestJoinDialog } from "@/components/request-join-dialog";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-50 via-background to-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight">Car Attendance System</p>
          <div className="flex items-center gap-2">
            <Link href="/scan-rfid" className="text-sm text-muted-foreground hover:text-foreground">
              RFID Kiosk
            </Link>
            <Link href="/admin/login" className="text-sm text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          </div>
        </header>

        <section className="flex flex-1 items-center py-16">
          <div className="grid w-full gap-10 md:grid-cols-2 md:items-center">
            <div className="space-y-5">
              <p className="inline-flex rounded-full border px-3 py-1 text-xs text-muted-foreground">
                Campus Gate Automation
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Smart Car Entry with RFID and Live Tracking
              </h1>
              <p className="max-w-xl text-muted-foreground">
                Seamless gate attendance for students, lecturers, staff, and administrators.
                Request access once, then scan in seconds at the kiosk.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <RequestJoinDialog />
                <Link href="/scan-rfid" className="text-sm font-medium text-muted-foreground">
                  Open Scan Screen
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">How it works</h2>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>1. Submit request with profile and license images.</li>
                  <li>2. Admin approves request and assigns RFID card.</li>
                  <li>3. Scan IN/OUT at kiosk and monitor sessions live.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
