"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, LogIn, RadioTower, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email.toLowerCase(),
          password: values.password,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Login failed");
      }

      toast.success("Login successful");
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 surface-grid opacity-35" aria-hidden="true" />
      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1fr] lg:items-stretch">
        <section className="glass-panel hidden rounded-lg p-8 lg:flex lg:flex-col lg:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to GateFlow
          </Link>
          <div className="space-y-5 mt-5">
            <span className="flex size-14 items-center justify-center rounded-lg bg-foreground text-background">
              <RadioTower className="size-7" />
            </span>
            <div className="space-y-3">
              <h1 className="font-heading text-4xl font-semibold leading-tight">
                Secure gate command for approved administrators.
              </h1>
              <p className="leading-7 text-muted-foreground">
                Review requests, activate drivers, manage scanners, and keep every
                IN/OUT session accountable from one responsive console.
              </p>
            </div>
          </div>
        </section>

        <Card className="w-full">
          <CardHeader className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground lg:hidden"
              >
                <ArrowLeft className="size-4" />
                Home
              </Link>
              <span className="ml-auto inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Protected
              </span>
            </div>
            <div>
              <CardTitle className="text-3xl">Admin Login</CardTitle>
              <CardDescription className="mt-2">
                Sign in with your admin account credentials.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                  {...form.register("email")}
                />
                <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter password"
                  {...form.register("password")}
                />
                <p className="text-xs text-destructive">
                  {form.formState.errors.password?.message}
                </p>
              </div>
              <Button className="w-full" disabled={isLoading} type="submit">
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="size-4" /> Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
