import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getPublicKey() {
    return (
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
}

export async function createSupabaseServerClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = getPublicKey();

    if (!url || !key) {
        throw new Error(
        "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
        );
    }

    const cookieStore = await cookies();

    return createServerClient(url, key, {
        cookies: {
        getAll() {
            return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
            try {
            cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
            );
            } catch {
            // ok in server components
            }
        },
        },
    });
}

export const createClient = createSupabaseServerClient;