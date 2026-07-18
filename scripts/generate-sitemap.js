import fs from 'fs';
import path from 'path';

const domain = 'https://tempsnap.online';
const pages = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: 'blog.html', priority: '0.8', changefreq: 'weekly' },
  { path: 'premium.html', priority: '0.7', changefreq: 'monthly' },
  { path: 'privacy.html', priority: '0.5', changefreq: 'monthly' },
  { path: 'terms.html', priority: '0.5', changefreq: 'monthly' },
  { path: 'cookies.html', priority: '0.5', changefreq: 'monthly' },
  { path: 'contact.html', priority: '0.7', changefreq: 'monthly' },
  { path: 'about.html', priority: '0.7', changefreq: 'monthly' },
  { path: 'disclaimer.html', priority: '0.5', changefreq: 'monthly' },
  { path: 'faq.html', priority: '0.8', changefreq: 'weekly' }
];

const today = new Date().toISOString().split('T')[0];

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

pages.forEach(p => {
  const urlPath = p.path ? `${p.path}` : '';
  sitemap += `    <url>
        <loc>${domain}/${urlPath}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${p.changefreq}</changefreq>
        <priority>${p.priority}</priority>
    </url>
`;
});

sitemap += `</urlset>
`;

// Write to public/sitemap.xml
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
console.log('Generated public/sitemap.xml successfully!');

// Also write to dist/sitemap.xml if the dist directory exists
const distDir = path.resolve('dist');
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
  console.log('Copied sitemap.xml to dist/ successfully!');
}
