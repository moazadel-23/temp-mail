import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        blog: resolve(__dirname, 'blog.html'),
        contact: resolve(__dirname, 'contact.html'),
        cookies: resolve(__dirname, 'cookies.html'),
        page: resolve(__dirname, 'page.html'),
        premium: resolve(__dirname, 'premium.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        sync: resolve(__dirname, 'sync.html'),
        adminLogin: resolve(__dirname, 'admin-login.html'),
        adminDashboard: resolve(__dirname, 'admin-dashboard.html'),
        about: resolve(__dirname, 'about.html'),
        disclaimer: resolve(__dirname, 'disclaimer.html'),
        faq: resolve(__dirname, 'faq.html'),
        404: resolve(__dirname, '404.html'),
        art1: resolve(__dirname, 'article-what-is-temporary-email.html'),
        art2: resolve(__dirname, 'article-receive-otp-securely.html'),
        art3: resolve(__dirname, 'article-keep-inbox-clean.html'),
        art4: resolve(__dirname, 'article-why-not-real-email.html'),
        art5: resolve(__dirname, 'article-smart-privacy-routine.html'),
        art6: resolve(__dirname, 'article-complete-privacy-guide.html'),
        art7: resolve(__dirname, 'article-temp-mail-vs-gmail.html'),
        art8: resolve(__dirname, 'article-is-temp-mail-safe.html'),
        art9: resolve(__dirname, 'article-how-it-works.html'),
        art10: resolve(__dirname, 'article-never-use-real-email.html'),
        art11: resolve(__dirname, 'article-protect-email-privacy.html'),
        art12: resolve(__dirname, 'article-10-smart-ways.html'),
      }
    }
  }
})
