(function () {
    'use strict';

    const KEYS = {
        sections: 'tmx_sections',
        pages: 'tmx_pages',
        stripe: 'tmx_stripe_settings',
        articles: 'tmx_articles_v2',
        articleVersion: 'tmx_articles_ver'
    };

    const DEFAULT_STRIPE = {
        endpoint: '/api/create-checkout-session',
        publishableKey: '',
        successUrl: '',
        cancelUrl: '',
        currency: 'USD',
        prices: {
            pro: { monthly: 'price_replace_pro_monthly', yearly: 'price_replace_pro_yearly' },
            business: { monthly: 'price_replace_business_monthly', yearly: 'price_replace_business_yearly' }
        },
        planAmounts: {
            pro: { monthly: '9.99', yearly: '7.99' },
            business: { monthly: '29.99', yearly: '23.99' }
        }
    };

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return parsed == null ? fallback : parsed;
        } catch (err) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        if (window.TMXSupabase && window.TMXSupabase.isEnabled()) {
            if (key === KEYS.articles && typeof window.TMXSupabase.upsertArticlesTable === 'function') {
                window.TMXSupabase.upsertArticlesTable(value).catch(function (e) { console.error('Supabase articles table sync error:', e); });
            } else if (typeof window.TMXSupabase.upsertJson === 'function') {
                window.TMXSupabase.upsertJson(key, value).catch(function () {});
            }
        }
    }

    function esc(value) {
        const d = document.createElement('div');
        d.textContent = value == null ? '' : String(value);
        return d.innerHTML;
    }

    function slugify(value) {
        return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    }

    function getText(value, lang) {
        if (value && typeof value === 'object') return value[lang] || value.en || value.ar || Object.values(value)[0] || '';
        return value || '';
    }

    function getSections() {
        const sections = readJson(KEYS.sections, []);
        return Array.isArray(sections) ? sections : [];
    }

    function saveSections(sections) {
        writeJson(KEYS.sections, Array.isArray(sections) ? sections : []);
    }

    function getPages() {
        const pages = readJson(KEYS.pages, []);
        return Array.isArray(pages) ? pages : [];
    }

    function savePages(pages) {
        writeJson(KEYS.pages, Array.isArray(pages) ? pages : []);
    }

    function getStripeSettings() {
        const saved = readJson(KEYS.stripe, {});
        const savedPrices = saved.prices || {};
        const savedAmounts = saved.planAmounts || {};
        return {
            ...DEFAULT_STRIPE,
            ...saved,
            prices: {
                ...DEFAULT_STRIPE.prices,
                ...savedPrices,
                pro: { ...DEFAULT_STRIPE.prices.pro, ...(savedPrices.pro || {}) },
                business: { ...DEFAULT_STRIPE.prices.business, ...(savedPrices.business || {}) }
            },
            planAmounts: {
                ...DEFAULT_STRIPE.planAmounts,
                ...savedAmounts,
                pro: { ...DEFAULT_STRIPE.planAmounts.pro, ...(savedAmounts.pro || {}) },
                business: { ...DEFAULT_STRIPE.planAmounts.business, ...(savedAmounts.business || {}) }
            }
        };
    }

    function saveStripeSettings(settings) {
        writeJson(KEYS.stripe, settings);
    }

    function getArticles() {
        let articles = readJson(KEYS.articles, null);
        if (window.TMXSupabase && window.TMXSupabase.isEnabled()) {
            return Array.isArray(articles) ? articles : [];
        }
        const version = localStorage.getItem(KEYS.articleVersion);
        if (!Array.isArray(articles) || !articles.length || version !== '8') {
            articles = typeof window.getDefaultArticles === 'function' ? window.getDefaultArticles() : [];
            saveArticles(articles);
        }
        return articles;
    }

    function saveArticles(articles) {
        writeJson(KEYS.articles, Array.isArray(articles) ? articles : []);
        localStorage.setItem(KEYS.articleVersion, '8');
    }
    async function syncFromSupabase() {
        if (!window.TMXSupabase || !window.TMXSupabase.isEnabled()) return false;

        const keys = [KEYS.sections, KEYS.pages, KEYS.stripe, KEYS.articles, KEYS.articleVersion];
        let synced = false;

        for (const key of keys) {
            try {
                let value;
                if (key === KEYS.articles) {
                    if (typeof window.TMXSupabase.fetchArticlesTable === 'function') {
                        value = await window.TMXSupabase.fetchArticlesTable();
                    } else {
                        value = await window.TMXSupabase.readJson(key);
                    }
                } else {
                    value = await window.TMXSupabase.readJson(key);
                }

                if (value === null || value === undefined) continue;
                if (key === KEYS.articleVersion) {
                    localStorage.setItem(key, String(value));
                } else {
                    localStorage.setItem(key, JSON.stringify(value));
                }
                synced = true;
            } catch (err) {
                console.warn('Supabase sync skipped for', key, err);
            }
        }

        if (synced) {
            window.dispatchEvent(new CustomEvent('tmx-sync-complete'));
        }

        return synced;
    }

    function renderDynamicNav() {
        const nav = document.getElementById('mainNav');
        if (!nav) return;
        nav.querySelectorAll('[data-dynamic-nav="true"]').forEach(function (el) { el.remove(); });
        const faq = Array.from(nav.querySelectorAll('a')).find(function (a) {
            return a.getAttribute('href') === '#faq' || a.getAttribute('href') === 'index.html#faq';
        });
        const frag = document.createDocumentFragment();
        const onIndex = /index\.html$/.test(location.pathname) || /\/$/.test(location.pathname) || location.pathname === '';

        getSections().filter(function (section) { return section.showInHeader; }).forEach(function (section) {
            const id = section.id || slugify(section.title);
            const a = document.createElement('a');
            a.href = (onIndex ? '' : 'index.html') + '#' + id;
            a.textContent = section.navLabel || section.title || 'Section';
            a.dataset.dynamicNav = 'true';
            frag.appendChild(a);
        });

        getPages().filter(function (page) { return page.showInHeader; }).forEach(function (page) {
            const a = document.createElement('a');
            a.href = 'page.html?slug=' + encodeURIComponent(page.slug || slugify(page.title));
            a.textContent = page.navLabel || page.title || 'Page';
            a.dataset.dynamicNav = 'true';
            frag.appendChild(a);
        });

        if (faq && faq.parentNode) nav.insertBefore(frag, faq);
        else nav.appendChild(frag);
    }

    function renderCustomSections(container) {
        const target = container || document.getElementById('customSections');
        if (!target) return;
        const sections = getSections();
        if (!sections.length) { target.innerHTML = ''; return; }
        target.innerHTML = sections.map(function (section) {
            const id = section.id || slugify(section.title);
            const icon = section.icon || 'fas fa-puzzle-piece';
            const tag = section.tag || 'Custom';
            return '<section class="custom-section" id="' + esc(id) + '"><div class="wrap"><div class="sec-head"><span class="tag"><i class="' + esc(icon) + '"></i> ' + esc(tag) + '</span><h2>' + esc(section.title || 'Untitled section') + '</h2>' + (section.summary ? '<p>' + esc(section.summary) + '</p>' : '') + '</div><div class="custom-section-body">' + (section.content || '') + '</div></div></section>';
        }).join('');
    }

    function renderDynamicPage() {
        const root = document.getElementById('dynamicPageRoot');
        if (!root) return;
        const slug = new URLSearchParams(location.search).get('slug') || '';
        const page = getPages().find(function (item) { return item.slug === slug; });
        if (!page) {
            document.title = 'Page not found - TempSnap';
            root.innerHTML = '<section class="page-hero"><div class="wrap"><span class="tag">Not Found</span><h1>Page not found</h1><p>This page is not available yet. Create it from admin-dashboard.html.</p></div></section>';
            return;
        }
        document.title = page.title + ' - TempSnap';
        
        // Dynamic SEO adjustments for dynamically generated pages
        const fullUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?slug=' + encodeURIComponent(slug);
        const desc = page.summary || page.title + ' - TempSnap custom page.';
        document.getElementById('metaDescription')?.setAttribute('content', desc);
        document.getElementById('canonicalLink')?.setAttribute('href', fullUrl);
        
        // Dynamically inject/overwrite schema
        let schemaScript = document.getElementById('dynamicPageSchema');
        if (!schemaScript) {
            schemaScript = document.createElement('script');
            schemaScript.type = 'application/ld+json';
            schemaScript.id = 'dynamicPageSchema';
            document.head.appendChild(schemaScript);
        }
        schemaScript.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": page.title,
            "description": desc,
            "url": fullUrl
        });

        root.innerHTML = '<section class="page-hero"><div class="wrap"><span class="tag">' + esc(page.badge || 'TempSnap') + '</span><h1>' + esc(page.title) + '</h1>' + (page.summary ? '<p>' + esc(page.summary) + '</p>' : '') + '</div></section><section class="page-content-section"><div class="wrap"><article class="page-content">' + (page.body || '') + '</article></div></section>';
    }

    function syncSupabaseForKey(key, value) {
        if (window.TMXSupabase && typeof window.TMXSupabase.upsertJson === 'function') {
            window.TMXSupabase.upsertJson(key, value).catch(function () {});
        }
    }

    function applyStripeSettings() {
        const settings = getStripeSettings();
        document.querySelectorAll('.pre-card').forEach(function (card) {
            const title = card.querySelector('h3');
            if (!title) return;
            const key = title.textContent.trim().toLowerCase();
            if (!settings.planAmounts[key]) return;
            const amount = card.querySelector('.amount');
            if (!amount) return;
            amount.dataset.monthly = settings.planAmounts[key].monthly || amount.dataset.monthly;
            amount.dataset.yearly = settings.planAmounts[key].yearly || amount.dataset.yearly;
        });
    }

    async function createCheckout(plan, billing) {
        const settings = getStripeSettings();
        const priceId = settings.prices && settings.prices[plan] && settings.prices[plan][billing];
        if (!priceId || priceId.indexOf('price_replace_') === 0) throw new Error('Add a real Stripe price ID from admin-dashboard.html > Stripe before checkout can run.');
        if (!settings.endpoint) throw new Error('Add your backend checkout endpoint from admin-dashboard.html > Stripe.');
        const payload = {
            priceId: priceId,
            plan: plan,
            billing: billing,
            successUrl: settings.successUrl || location.origin + '/success.html',
            cancelUrl: settings.cancelUrl || location.href
        };
        const response = await fetch(settings.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || data.message || 'Checkout endpoint returned HTTP ' + response.status);
        if (data.url) { window.location.href = data.url; return; }
        if (data.sessionId && window.Stripe && settings.publishableKey) {
            const stripe = window.Stripe(settings.publishableKey);
            await stripe.redirectToCheckout({ sessionId: data.sessionId });
            return;
        }
        throw new Error('Checkout endpoint must return a Stripe Checkout url or sessionId.');
    }

    function wireMenu() {
        const btn = document.getElementById('menuBtn');
        const nav = document.getElementById('mainNav');
        if (!btn || !nav || btn.dataset.tmxWired) return;
        btn.dataset.tmxWired = 'true';
        btn.addEventListener('click', function () { nav.classList.toggle('open'); });
        nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); }); });
    }

    window.TMXContent = {
        KEYS, DEFAULT_STRIPE, esc, slugify, getText, readJson, writeJson,
        getSections, saveSections, getPages, savePages, getArticles, saveArticles,
        getStripeSettings, saveStripeSettings, renderDynamicNav, renderCustomSections,
        renderDynamicPage, applyStripeSettings, createCheckout, syncFromSupabase
    };

    document.addEventListener('DOMContentLoaded', async function () {
        await syncFromSupabase();
        renderDynamicNav();
        renderDynamicPage();
        applyStripeSettings();
        wireMenu();
    });
})();
