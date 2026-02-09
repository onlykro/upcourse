// app/services/resources.server.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
        "Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_*_KEY."
    );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
});

const TABLE = "resources";
const BUCKET = "resources";

const toStr = (v) => String(v ?? "").trim();

/**
 * Create signed URL (works for private/public), fallback to public URL if bucket is public.
 * Note: Supabase signed URLs are typically capped at 7 days.
 */
export async function resolveResourceUrl(file_key, { expiresIn = 60 * 60 * 24 * 6 } = {}) {
    const key = toStr(file_key);
    if (!key) return "";

    const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(key, expiresIn);

    if (signed?.signedUrl) return signed.signedUrl;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return pub?.publicUrl || "";
}

async function deleteStorageObject(key) {
    const k = toStr(key);
    if (!k) return;

    const { error } = await supabase.storage.from(BUCKET).remove([k]);
    if (error && !/does not exist/i.test(error.message)) throw error;
}

async function countResourcesUsingFileKey(key) {
    const k = toStr(key);
    if (!k) return 0;

    const { count, error } = await supabase
        .from(TABLE)
        .select("file_key", { count: "exact", head: true })
        .eq("file_key", k);

    if (error) throw error;
    return count || 0;
    }

    function attachUrl(row) {
    // runtime fields for UI only
    return row;
}

/**
 * GET list (optionally by subject_id) + attach runtime signed url `_url`
 */
export async function getResources({ subject_id = "", search = "", limit = 200 } = {}) {
    const subj = toStr(subject_id);
    const q = toStr(search);

    let query = supabase
        .from(TABLE)
        .select("*")
        .limit(Math.max(1, Math.min(2000, Number(limit) || 200)));

    if (subj) query = query.eq("subject_id", subj);

    if (q) {
        const like = `%${q}%`;
        // adjust columns if yours differ
        query = query.or(
        `resource_title.ilike.${like},resource_description.ilike.${like},resource_id.ilike.${like}`
        );
    }

    // newest first
    query = query.order("updated_at", { ascending: false, nullsFirst: false });

    const { data, error } = await query;
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];

    // compute runtime signed URLs in parallel
    await Promise.all(
        rows.map(async (r) => {
        r._url = r.file_key ? await resolveResourceUrl(r.file_key) : "";
        return r;
        })
    );

    return rows.map(attachUrl);
    }

    export async function getResourceById(id) {
    const key = toStr(id);
    if (!key) return null;

    // support either resource_id or id as PK
    let { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("resource_id", key)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        const alt = await supabase.from(TABLE).select("*").eq("id", key).maybeSingle();
        if (alt.error) throw alt.error;
        data = alt.data || null;
    }

    if (!data) return null;

    data._url = data.file_key ? await resolveResourceUrl(data.file_key) : "";
    return data;
}

/**
 * POST create (do NOT store file_url; store file_key)
 */
export async function createResource(payload) {
    const body = { ...(payload || {}) };
    if ("file_url" in body) delete body.file_url; // never persist signed urls

    const { data, error } = await supabase
        .from(TABLE)
        .insert([body])
        .select()
        .maybeSingle();

    if (error) return { success: false, error: error.message };

    const row = data || null;
    if (row) row._url = row.file_key ? await resolveResourceUrl(row.file_key) : "";
    return { success: true, resource: row };
}

/**
 * PUT update + safe cleanup if file_key replaced
 * We fetch prev file_key internally (so client doesn’t need to pass it)
 */
export async function updateResource(id, fields) {
    try {
        const rid = toStr(id);
        if (!rid) return { success: false, error: "Missing resource id." };

        const patch = { ...(fields || {}) };
        if ("file_url" in patch) delete patch.file_url; // never persist signed urls
        if ("id" in patch) delete patch.id;

        // fetch prev row to detect file replacement
        const prev = await getResourceById(rid);
        const prevFileKey = prev?.file_key || "";

        // update (try resource_id, fallback to id)
        let updated = null;

        const r1 = await supabase
        .from(TABLE)
        .update(patch)
        .eq("resource_id", rid)
        .select()
        .maybeSingle();

        if (r1.error) return { success: false, error: r1.error.message };
        updated = r1.data || null;

        if (!updated) {
        const r2 = await supabase
            .from(TABLE)
            .update(patch)
            .eq("id", rid)
            .select()
            .maybeSingle();
        if (r2.error) return { success: false, error: r2.error.message };
        updated = r2.data || null;
        }

        if (!updated) return { success: false, error: "Resource not found." };

        // cleanup old storage object if file_key changed and no one else uses it
        const nextFileKey = updated.file_key || "";
        if (prevFileKey && prevFileKey !== nextFileKey) {
        const uses = await countResourcesUsingFileKey(prevFileKey);
        if (uses <= 0) await deleteStorageObject(prevFileKey);
        }

        updated._url = updated.file_key ? await resolveResourceUrl(updated.file_key) : "";
        return { success: true, resource: updated };
    } catch (e) {
        return { success: false, error: e?.message || "Failed to update resource" };
    }
}

/**
 * DELETE DB row + safe cleanup of Storage object (only if unreferenced)
 */
export async function deleteResourceAndFile(id) {
    try {
        const rid = toStr(id);
        if (!rid) return { success: false, error: "Missing resource id." };

        const row = await getResourceById(rid);
        if (!row) return { success: false, error: "Resource not found." };

        // delete row (try resource_id then id)
        const d1 = await supabase.from(TABLE).delete().eq("resource_id", rid);
        if (d1.error && !/0 rows/i.test(d1.error.message)) {
        // fallback
        const d2 = await supabase.from(TABLE).delete().eq("id", rid);
        if (d2.error) return { success: false, error: d2.error.message };
        }

        if (row.file_key) {
        const uses = await countResourcesUsingFileKey(row.file_key);
        if (uses <= 0) await deleteStorageObject(row.file_key);
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: e?.message || "Failed to delete resource" };
    }
}