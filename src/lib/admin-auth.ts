import { redirect } from "next/navigation";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireAdminUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return { ok: false as const, reason: "Unauthorized" };
  }

  const admin = createAdminSupabaseClient();
  const { data: dbUser, error } = await admin
    .from("users")
    .select("id, email, role, status")
    .eq("email", user.email.toLowerCase())
    .single();

  if (error || !dbUser || dbUser.role !== "ADMIN") {
    return { ok: false as const, reason: "Forbidden" };
  }

  return { ok: true as const, authUser: user, dbUser };
}

export async function requireAdminOrRedirect() {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    redirect("/admin/login");
  }

  return adminCheck;
}
