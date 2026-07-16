import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.TMX_SUPABASE_CONFIG?.url || localStorage.getItem('tmx_supabase_url') || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || window.TMX_SUPABASE_CONFIG?.anonKey || localStorage.getItem('tmx_supabase_anon') || ''

let supabaseClient = null;

if (supabaseUrl && supabaseAnonKey) {
    try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    } catch (e) {
        console.error('Error creating Supabase client:', e);
    }
}

export const supabase = supabaseClient;

// To maintain compatibility with existing codebase
window.TMXSupabase = {
    isEnabled: () => !!(supabaseUrl && supabaseAnonKey),
    getClient: () => supabaseClient,
    signIn: async (email, password) => {
        if (!supabaseClient) return { ok: false, error: 'Supabase client not initialized' };
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        return error ? { ok: false, error: error.message } : { ok: true, data };
    },
    signOut: async () => {
        if (!supabaseClient) return true;
        const { error } = await supabaseClient.auth.signOut();
        return !error;
    },
    getSession: () => {
        if (!supabaseClient) return Promise.resolve({ data: { session: null }, error: null });
        return supabaseClient.auth.getSession();
    },
    upsertJson: async (key, value) => {
        if (!supabaseClient) return { ok: false, error: 'Supabase client not initialized' };
        const payload = {
            key: String(key),
            value: value,
            updated_at: new Date().toISOString()
        };
        const { error } = await supabaseClient.from('site_content').upsert(payload, { onConflict: 'key' });
        return error ? { ok: false, error: error.message } : { ok: true };
    },
    readJson: async (key) => {
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.from('site_content').select('value').eq('key', String(key)).maybeSingle();
        if (error || !data || data.value === undefined) return null;
        return data.value;
    }
};
