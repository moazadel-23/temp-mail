(function () {
    'use strict';

    const URL_KEY = 'tmx_supabase_url';
    const ANON_KEY = 'tmx_supabase_anon';

    function resolveConfig() {
        const cfg = window.TMX_SUPABASE_CONFIG || {};
        const url = String(cfg.url || localStorage.getItem(URL_KEY) || '').trim();
        const anonKey = String(cfg.anonKey || localStorage.getItem(ANON_KEY) || '').trim();
        return url && anonKey ? { url: url, anonKey: anonKey } : null;
    }

    function getClient() {
        if (!window.supabase) return null;
        const config = resolveConfig();
        if (!config) return null;
        if (!getClient._client) {
            getClient._client = window.supabase.createClient(config.url, config.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
        }
        return getClient._client;
    }

    async function signIn(email, password) {
        const client = getClient();
        if (!client) {
            return { ok: false, mode: 'fallback', error: 'Supabase is not configured yet.' };
        }

        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
            return { ok: false, mode: 'supabase', error: error.message };
        }

        return { ok: true, mode: 'supabase', data: data };
    }

    async function signOut() {
        const client = getClient();
        if (!client) return true;
        const { error } = await client.auth.signOut();
        return !error;
    }

    async function getSession() {
        const client = getClient();
        if (!client) return { data: { session: null }, error: null };
        return client.auth.getSession();
    }

    async function upsertJson(key, value) {
        const client = getClient();
        if (!client) return { ok: false, error: 'Supabase client is unavailable.' };

        const payload = {
            key: String(key),
            value: value,
            updated_at: new Date().toISOString()
        };

        const { error } = await client.from('site_content').upsert(payload, { onConflict: 'key' });
        if (error) {
            return { ok: false, error: error.message };
        }

        return { ok: true };
    }

    async function readJson(key) {
        const client = getClient();
        if (!client) return null;

        const { data, error } = await client.from('site_content').select('value').eq('key', String(key)).maybeSingle();
        if (error || !data || data.value === undefined) {
            return null;
        }
        return data.value;
    }

    function isEnabled() {
        return !!resolveConfig();
    }

    window.TMXSupabase = {
        resolveConfig,
        isEnabled,
        getClient,
        signIn,
        signOut,
        getSession,
        upsertJson,
        readJson
    };
})();
