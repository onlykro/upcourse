// lib/admins.server.js
import { supabaseAdmin } from "@/lib/supabase/admin";

// List admins
export async function listAdmins() {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Create admin Auth user + row in admins table
export async function createAdminWithAuth(payload) {
  const { email, password } = payload || {};
  if (!email || !password) throw new Error("email and password are required");

  // 1) Create Supabase Auth user
  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created.error) throw created.error;

  const userId = created.data?.user?.id;
  if (!userId) throw new Error("Failed to create auth user");

  // 2) Insert into admins table using auth user id as admin_id (TEXT)
  const adminRow = {
    admin_id: userId, // IMPORTANT
    email,
    first_name: payload.first_name?.trim() || "",
    middle_name: payload.middle_name?.trim() || "",
    last_name: payload.last_name?.trim() || "",
    suffix: payload.suffix?.trim() || "",
    username: payload.username?.trim() || null,
    admin_role: payload.admin_role || "Facilitator",
    admin_level: payload.admin_level || "Admin",
    section: payload.section || "",
    is_adviser: !!payload.is_adviser,
    adviser_section: payload.is_adviser ? (payload.adviser_section || "") : null,
    admin_status: payload.admin_status || "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const ins = await supabaseAdmin
    .from("admins")
    .insert(adminRow)
    .select("*")
    .single();

  if (ins.error) {
    // Rollback auth user if DB insert fails
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    throw ins.error;
  }

  return ins.data;
}

// Update admin row (NOT password)
export async function updateAdminRow(admin_id, patch) {
  if (!admin_id) throw new Error("admin_id is required");

  const clean = { ...(patch || {}) };
  delete clean.admin_id;
  delete clean.password; // password handled via auth

  clean.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("admins")
    .update(clean)
    .eq("admin_id", admin_id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// Reset password in Supabase Auth
export async function resetAdminPassword(admin_id, newPassword) {
  if (!admin_id || !newPassword) throw new Error("admin_id and newPassword are required");

  const res = await supabaseAdmin.auth.admin.updateUserById(admin_id, {
    password: newPassword,
  });

  if (res.error) throw res.error;
  return true;
}

// Delete admin (DB + Auth user)
export async function deleteAdminEverywhere(admin_id) {
  if (!admin_id) throw new Error("admin_id is required");

  // Delete from admins table (cascades admin_access)
  const del = await supabaseAdmin.from("admins").delete().eq("admin_id", admin_id);
  if (del.error) throw del.error;

  // Delete auth user
  await supabaseAdmin.auth.admin.deleteUser(admin_id).catch(() => {});
  return true;
}
