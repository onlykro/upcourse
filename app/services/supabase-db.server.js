import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ─── TABLE NAMES ─────────────────────────────────────────────
const USERS_TABLE = "users";
const ADMINS_TABLE = "admins";

/* ------------------------------------------------------------------
    1) USERS (STUDENTS)
------------------------------------------------------------------ */

// GET ALL USERS
export const getData = async () => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from(USERS_TABLE).select("*");
    if (error) {
        console.error("Supabase Error (getData):", error);
        return [];
    }
    return data || [];
};

// ADD A NEW USER
export const addStudent = async (student) => {
    const supabase = await createSupabaseServerClient();

    if (!student?.email) {
        return { success: false, error: "email is required" };
    }

    const newStudent = {
        ...student,
        created_at: student.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from(USERS_TABLE).insert(newStudent);
    if (error) {
        console.error("Error adding student:", error);
        return { success: false, error: error.message || error };
    }

    return { success: true };
};

// UPDATE A USER (by supabase_id)
export const updateStudent = async (student) => {
    const supabase = await createSupabaseServerClient();

    if (!student?.supabase_id) {
        return { success: false, error: "supabase_id is required for update" };
    }

    const patch = {
        first_name: student.first_name ?? "",
        middle_name: student.middle_name ?? "",
        last_name: student.last_name ?? "",
        suffix: student.suffix ?? "",
        birthdate: student.birthdate ?? "",
        gender: student.gender ?? "",
        street: student.street ?? "",
        brgy: student.brgy ?? "",
        city: student.city ?? "",
        province: student.province ?? "",
        username: student.username ?? "",
        password: student.password ?? "",
        user_level: student.user_level ?? "",
        user_status: student.user_status ?? "",
        program: student.program ?? "",
        strand: student.strand ?? "",
        grade_level: student.grade_level ?? "",
        school_level: student.school_level ?? "",
        profile_picture: student.profile_picture ?? "",
        email: student.email ?? "",
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from(USERS_TABLE)
        .update(patch)
        .eq("supabase_id", student.supabase_id)
        .select()
        .single();

    if (error) {
        console.error("Error updating student:", error);
        return { success: false, error: error.message || error };
    }

    return { success: true, data };
};

// DISABLE / ENABLE A USER ACCOUNT (by supabase_id)
export const setUserDisabled = async ({ supabase_id, is_disabled }) => {
    const supabase = await createSupabaseServerClient();

    if (!supabase_id || typeof is_disabled !== "boolean") {
        return { success: false, error: "supabase_id and boolean is_disabled are required" };
    }

    const { data, error } = await supabase
        .from(USERS_TABLE)
        .update({ is_disabled, updated_at: new Date().toISOString() })
        .eq("supabase_id", supabase_id)
        .select("supabase_id, is_disabled")
        .single();

    if (error) {
        console.error("setUserDisabled error:", error);
        return { success: false, error: error.message || error };
    }

    return { success: true, data };
    };

    // DELETE A USER (by supabase_id)
    export const deleteStudent = async ({ supabase_id }) => {
    const supabase = await createSupabaseServerClient();

    if (!supabase_id) {
        return { success: false, error: "supabase_id is required for delete" };
    }

    const { error } = await supabase
        .from(USERS_TABLE)
        .delete()
        .eq("supabase_id", supabase_id);

    if (error) {
        console.error("Error deleting student:", error);
        return { success: false, error: error.message || error };
    }

    return { success: true };
};

/* ------------------------------------------------------------------
    2) ADMINS
------------------------------------------------------------------ */

function normalizeAdminStatus(s) {
  const v = String(s || "").trim().toLowerCase();
  if (v === "inactive") return "inactive";
  return "active";
}

export const getAllAdmins = async () => {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from(ADMINS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase Error (getAllAdmins):", error);
    return [];
  }

  return data || [];
};

export async function checkUsername(username) {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from(ADMINS_TABLE)
    .select("username", { count: "exact", head: true })
    .eq("username", username);

  if (error) {
    console.error("checkUsername error:", error);
    return false;
  }

  return (count || 0) > 0;
}

// ADD A NEW ADMIN
export const addAdmin = async (adminData) => {
  const supabase = await createSupabaseServerClient();

  const email = String(adminData?.email || "").trim();
  const username = String(adminData?.username || "").trim();

  if (!email || !username) {
    return { success: false, error: "email and username are required" };
  }

  // unique email/username
  const { data: dup, error: dupErr } = await supabase
    .from(ADMINS_TABLE)
    .select("admin_id")
    .or(`email.eq.${email},username.eq.${username}`)
    .limit(1);

  if (dupErr) {
    console.error("dup check error:", dupErr);
    return { success: false, error: dupErr.message || dupErr };
  }
  if (dup && dup.length) {
    return { success: false, error: "Email or username already exists" };
  }

  // generate text admin_id
  const year = new Date().getFullYear();
  const randomSix = Math.random().toString().slice(2, 8);
  const admin_id = `${year}-${randomSix}`;

  const newAdmin = {
    admin_id,
    first_name: adminData.first_name?.trim() || "",
    middle_name: adminData.middle_name?.trim() || "",
    last_name: adminData.last_name?.trim() || "",
    suffix: adminData.suffix?.trim() || "",
    username,
    email,
    password: adminData.password || "", // ⚠️ temporary until Supabase Auth
    admin_role: adminData.admin_role || "Facilitator",
    admin_level: adminData.admin_level || "Admin",
    section: adminData.section || "",
    is_adviser: !!adminData.is_adviser,
    adviser_section: adminData.is_adviser ? (adminData.adviser_section || "") : null,

    // ✅ normalize here
    admin_status: normalizeAdminStatus(adminData.admin_status),

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from(ADMINS_TABLE).insert(newAdmin);
  if (error) {
    console.error("Error adding admin:", error);
    return { success: false, error: error.message || error };
  }

  return { success: true, admin_id };
};

// UPDATE AN ADMIN
export const updateAdmin = async (adminData) => {
  const supabase = await createSupabaseServerClient();

  const admin_id = String(adminData?.admin_id || "").trim();
  if (!admin_id) {
    return { success: false, error: "admin_id is required for update" };
  }

  const patch = {
    first_name: (adminData.first_name ?? "").trim(),
    middle_name: (adminData.middle_name ?? "").trim(),
    last_name: (adminData.last_name ?? "").trim(),
    suffix: (adminData.suffix ?? "").trim(),
    username: adminData.username ?? "",
    password: adminData.password ?? "",
    email: adminData.email ?? "",
    admin_role: adminData.admin_role ?? "Facilitator",
    admin_level: adminData.admin_level ?? "Admin",
    section: adminData.section || "",
    is_adviser: !!adminData.is_adviser,
    adviser_section: adminData.is_adviser ? (adminData.adviser_section || "") : null,

    // ✅ normalize here
    admin_status: normalizeAdminStatus(adminData.admin_status),

    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(ADMINS_TABLE)
    .update(patch)
    .eq("admin_id", admin_id)
    .select()
    .single();

  if (error) {
    console.error("Error updating admin:", error);
    return { success: false, error: error.message || error };
  }

  return { success: true, data };
};

// DELETE AN ADMIN
export const deleteAdmin = async ({ admin_id }) => {
  const supabase = await createSupabaseServerClient();

  const id = String(admin_id || "").trim();
  if (!id) {
    return { success: false, error: "admin_id is required for delete" };
  }

  const { error } = await supabase.from(ADMINS_TABLE).delete().eq("admin_id", id);

  if (error) {
    console.error("Error deleting admin:", error);
    return { success: false, error: error.message || error };
  }

  return { success: true };
};

/* ----------------------- PASSWORD MANAGEMENT ------------------------ */
export const updateAdminPassword = async ({ target_admin_id, new_password }) => {
  const supabase = await createSupabaseServerClient();

  const id = String(target_admin_id || "").trim();
  const pw = String(new_password || "");

  if (!id || !pw) {
    return { success: false, error: "target_admin_id and new_password are required" };
  }

  const { data, error } = await supabase
    .from(ADMINS_TABLE)
    .update({ password: pw, updated_at: new Date().toISOString() })
    .eq("admin_id", id)
    .select("admin_id")
    .single();

  if (error) {
    console.error("updateAdminPassword error:", error);
    return { success: false, error: error.message || error };
  }

  return { success: true, data };
};

/* ------------------------------------------------------------------
    3) LOGIN (temporary)
------------------------------------------------------------------ */

export const loginAdmin = async (login, password) => {
  const supabase = await createSupabaseServerClient();
  const cleanLogin = String(login || "").trim();

  const { data, error } = await supabase
    .from(ADMINS_TABLE) // ✅ use constant
    .select("*")
    .or(`email.eq.${cleanLogin},username.eq.${cleanLogin}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("loginAdmin error:", error);
    return { success: false, error: "Login error. Check server logs." };
  }

  if (!data) return { success: false, error: "Admin not found." };

  const status = String(data.admin_status || "").trim().toLowerCase();
  if (status !== "active") return { success: false, error: "Account is inactive." };

  if (String(data.password ?? "") !== String(password ?? "")) {
    return { success: false, error: "Invalid password." };
  }

  return { success: true, admin: data };
};
