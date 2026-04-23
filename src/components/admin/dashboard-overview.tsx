"use client";

import { Activity, Clock3, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

  const loadStats = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    void loadStats();
    const intervalId = setInterval(() => {
      void loadStats();
    }, 10_000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadStats]);

  const cards = [
    {
      title: "Total Active Users",
      value: stats.totalActiveUsers,
      icon: UserCheck,
      hint: "Users allowed to scan",
    },
    {
      title: "Currently Inside",
      value: stats.currentlyInside,
      icon: Activity,
      hint: "Open sessions now",
    },
    {
      title: "Pending Requests",
      value: stats.pendingRequests,
      icon: Clock3,
      hint: "Awaiting admin action",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{loading ? "-" : card.value}</p>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
