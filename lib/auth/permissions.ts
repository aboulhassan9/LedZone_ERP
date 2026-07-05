import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

// Mirrors the public.has_permission(uid, key) SQL function via RPC, so the same
// authorization rule governs both RLS policies and app-level route/UI guards.
export async function hasPermission(key: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("has_permission", {
    p_user_id: user.id,
    p_key: key,
  });

  if (error) return false;
  return Boolean(data);
}

// Powers UI-level conditional rendering (sidebar links, admin sections). Backed by
// get_my_permissions(), which — unlike a direct role_permissions query — any signed-in
// user is allowed to call for themselves.
export async function getCurrentUserPermissionKeys(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("get_my_permissions");
  if (error || !data) return [];

  return data.map((row: { key: string }) => row.key);
}

export async function requirePermission(key: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowed = await hasPermission(key);
  if (!allowed) redirect("/forbidden");
}
