import './articles.js'
import './lib/supabase.js'
import './site-content.js'
import './i18n.js'
import './app.js'

// Register Service Worker for PWA / caching support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('ServiceWorker registered successfully on scope:', reg.scope))
      .catch(err => console.error('ServiceWorker registration failed:', err));
  });
}
