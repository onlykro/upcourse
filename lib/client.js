import { createBrowserClient } from "@supabase/ssr";

function getPublicKey() {
    return (
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
}

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = getPublicKey();

    if (!url || !key) {
        throw new Error(
        "Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
        );
    }

    return createBrowserClient(url, key);
}