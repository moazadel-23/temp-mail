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
      }
    }
  }
})
