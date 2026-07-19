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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { data, error } = await supabase.from('articles').select('*');
if (error) {
    console.error('Error fetching articles:', error);
} else {
    console.log('Successfully fetched articles. Count:', data.length);
    if (data.length > 0) {
        console.log('Sample columns:', Object.keys(data[0]));
        console.log('First article title:', data[0].title);
    }
}
