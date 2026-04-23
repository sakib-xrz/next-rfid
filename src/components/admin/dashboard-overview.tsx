"use client";

import { Activity, Clock3, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    const [activeUsers, insideUsers, pendingUsers] = await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("status", "ACTIVE"),
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .is("out_time", null),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING"),
    ]);

    setStats({
      totalActiveUsers: activeUsers.count ?? 0,
      currentlyInside: insideUsers.count ?? 0,
      pendingRequests: pendingUsers.count ?? 0,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStats();
    }, 0);
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => void loadStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => void loadStats()
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadStats, supabase]);

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
