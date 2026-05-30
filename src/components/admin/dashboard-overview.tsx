"use client";

import { Activity, Clock3, Loader2, RefreshCw, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stats = {
  totalActiveUsers: number;
  currentlyInside: number;
  pendingRequests: number;
};

const initialStats: Stats = {
  totalActiveUsers: 0,
  currentlyInside: 0,
  pendingRequests: 0,
};

export function DashboardOverview() {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetch("/api/admin/dashboard/stats", { cache: "no-store" });
      const payload = (await response.json()) as Partial<Stats> & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load dashboard stats");
      }

      setStats({
        totalActiveUsers: payload.totalActiveUsers ?? 0,
        currentlyInside: payload.currentlyInside ?? 0,
        pendingRequests: payload.pendingRequests ?? 0,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard stats");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadStats(true);
    }, 0);

    return () => {
      clearTimeout(timerId);
    };
  }, [loadStats]);

  const cards = [
    {
      title: "Total Active Users",
      value: stats.totalActiveUsers,
      icon: UserCheck,
      hint: "Users allowed to scan",
      bar: "bg-primary",
    },
    {
      title: "Currently Inside",
      value: stats.currentlyInside,
      icon: Activity,
      hint: "Open sessions now",
      bar: "bg-amber-400",
    },
    {
      title: "Pending Requests",
      value: stats.pendingRequests,
      icon: Clock3,
      hint: "Awaiting admin action",
      bar: "bg-rose-400",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold">Live Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Refreshed on demand from the admin API.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={loading || refreshing}
          onClick={() => void loadStats(false)}
        >
          {refreshing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="size-4" />
              Refresh
            </>
          )}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ icon: Icon, ...card }) => (
          <Card key={card.title} className="overflow-hidden">
            <div className={`h-1 ${card.bar}`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">{card.title}</CardTitle>
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-primary">
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-4xl font-semibold">
                {loading ? "-" : card.value}
              </p>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
