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
    },
    upsertArticlesTable: async (articles) => {
        if (!supabaseClient) return { ok: false, error: 'Supabase client not initialized' };
        
        const rows = [];
        for (const art of articles) {
            const baseSlug = art.slug || String(art.title?.en || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            if (!baseSlug) continue;
            
            // English Row
            rows.push({
                title: art.title?.en || '',
                slug: baseSlug,
                category: art.category || 'general',
                language: 'en',
                author: art.author || 'TempSnap Team',
                publish_date: art.date || new Date().toISOString().slice(0, 10),
                read_time: art.readTime?.en || '5 min read',
                image_url: art.image || '',
                excerpt: art.excerpt?.en || '',
                article_html: art.content?.en || '',
                updated_at: new Date().toISOString()
            });

            // Arabic Row
            rows.push({
                title: art.title?.ar || '',
                slug: baseSlug + '-ar',
                category: art.category || 'general',
                language: 'ar',
                author: art.author || 'TempSnap Team',
                publish_date: art.date || new Date().toISOString().slice(0, 10),
                read_time: art.readTime?.ar || 'قراءة 5 دقائق',
                image_url: art.image || '',
                excerpt: art.excerpt?.ar || '',
                article_html: art.content?.ar || '',
                updated_at: new Date().toISOString()
            });
        }

        if (!rows.length) return { ok: true };
        const { error } = await supabaseClient.from('articles').upsert(rows, { onConflict: 'slug' });
        return error ? { ok: false, error: error.message } : { ok: true };
    },
    fetchArticlesTable: async () => {
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.from('articles').select('*');
        if (error || !data) return null;
        
        const articlesMap = {};
        for (const row of data) {
            const isAr = row.language === 'ar';
            const baseSlug = isAr ? row.slug.replace(/-ar$/, '') : row.slug;
            
            if (!articlesMap[baseSlug]) {
                articlesMap[baseSlug] = {
                    category: row.category,
                    image: row.image_url,
                    date: row.publish_date,
                    author: row.author,
                    slug: baseSlug,
                    readTime: {},
                    title: {},
                    excerpt: {},
                    content: {}
                };
            }
            
            const art = articlesMap[baseSlug];
            if (isAr) {
                art.title.ar = row.title;
                art.excerpt.ar = row.excerpt;
                art.content.ar = row.article_html;
                art.readTime.ar = row.read_time;
            } else {
                art.title.en = row.title;
                art.excerpt.en = row.excerpt;
                art.content.en = row.article_html;
                art.readTime.en = row.read_time;
            }
        }
        
        const list = Object.values(articlesMap);
        for (const art of list) {
            if (!art.title.en) art.title.en = art.title.ar || '';
            if (!art.title.ar) art.title.ar = art.title.en || '';
            if (!art.excerpt.en) art.excerpt.en = art.excerpt.ar || '';
            if (!art.excerpt.ar) art.excerpt.ar = art.excerpt.en || '';
            if (!art.content.en) art.content.en = art.content.ar || '';
            if (!art.content.ar) art.content.ar = art.content.en || '';
            if (!art.readTime.en) art.readTime.en = art.readTime.ar || '';
            if (!art.readTime.ar) art.readTime.ar = art.readTime.en || '';
        }
        
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        return list;
    }
};
