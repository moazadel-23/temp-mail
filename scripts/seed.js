import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env file manually
const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials not found in .env file!');
    process.exit(1);
}

// Define global.window to avoid ReferenceError when importing src/articles.js
global.window = {};
await import('../src/articles.js');
const articles = global.window.getDefaultArticles();

console.log(`Loaded ${articles.length} articles from src/articles.js`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rows = [];
for (const art of articles) {
    const baseSlug = art.slug || String(art.title?.en || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
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

console.log(`Uploading ${rows.length} rows (English & Arabic versions) to Supabase 'articles' table...`);

const { data, error } = await supabase.from('articles').upsert(rows, { onConflict: 'slug' });

if (error) {
    console.error('Failed to seed Supabase database:', error.message);
    process.exit(1);
}

console.log('Successfully seeded database with all 6 articles!');
