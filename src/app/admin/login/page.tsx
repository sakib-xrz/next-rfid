"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email.toLowerCase(),
        password: values.password,
      });
      if (error) throw error;

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
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Login with your Supabase auth credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
              <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" {...form.register("password")} />
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
    </main>
  );
}
