// lib/adminAccess.server.js
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildDefaultAdminAccess, coerceAdminAccessPatch } from "./adminAccess";

/** Ensure an access row exists for the admin_id; return the row. */
export async function ensureAdminAccess(admin_id) {
  const { data, error } = await supabaseAdmin
    .from("admin_access")
    .select("*")
    .eq("admin_id", admin_id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const defaults = buildDefaultAdminAccess(admin_id);

  const ins = await supabaseAdmin
    .from("admin_access")
    .insert(defaults)
    .select("*")
    .single();

  if (ins.error) throw ins.error;
  return ins.data;
}

export async function getAdminAccess(admin_id) {
  const { data, error } = await supabaseAdmin
    .from("admin_access")
    .select("*")
    .eq("admin_id", admin_id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function updateAdminAccess(admin_id, patch) {
  const next = coerceAdminAccessPatch(patch);

  const { data, error } = await supabaseAdmin
    .from("admin_access")
    .update(next)
    .eq("admin_id", admin_id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function saveAdminAccess(admin_id, patch) {
  await ensureAdminAccess(admin_id);
  return updateAdminAccess(admin_id, patch);
}