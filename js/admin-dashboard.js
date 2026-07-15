(function () {
    'use strict';

    const ADMIN_EMAIL = 'admin@tempmailx.local';
    const ADMIN_PASSWORD = 'TMX-Admin-2026!';
    const AUTH_KEY = 'tmx_admin_auth';
    let currentEditingArticle = null;
    let currentEditorLang = 'en';
    const $ = function (sel) { return document.querySelector(sel); };
    const $$ = function (sel) { return Array.from(document.querySelectorAll(sel)); };

    function setStatus(id, message, ok) {
        const el = $(id);
        if (!el) return;
        el.textContent = message || '';
        el.style.color = ok ? 'var(--ok)' : 'var(--tx2)';
    }

    function isAuthed() { return sessionStorage.getItem(AUTH_KEY) === 'true'; }

    function showApp() {
        $('#loginView').hidden = true;
        $('#dashboardView').hidden = false;
        renderAll();
    }

    function showLogin() {
        $('#loginView').hidden = false;
        $('#dashboardView').hidden = true;
        $('#loginEmail').value = ADMIN_EMAIL;
        $('#loginPassword').value = ADMIN_PASSWORD;
    }

    function textValue(value) { return window.TMXContent.getText(value, 'en'); }

    function seedArticlesIfNeeded() {
        const articles = window.TMXContent.readJson(window.TMXContent.KEYS.articles, null);
        if (!Array.isArray(articles) || !articles.length) {
            const defaults = typeof window.getDefaultArticles === 'function' ? window.getDefaultArticles() : [];
            window.TMXContent.saveArticles(defaults);
        }
    }

    function refreshCounts() {
        $('#sectionCount').textContent = String(window.TMXContent.getSections().length);
        $('#pageCount').textContent = String(window.TMXContent.getPages().length);
        $('#articleCount').textContent = String(window.TMXContent.getArticles().length);
    }

    function clearSectionForm() {
        $('#sectionEditIndex').value = '';
        $('#sectionTitle').value = '';
        $('#sectionId').value = '';
        $('#sectionTag').value = '';
        $('#sectionIcon').value = '';
        $('#sectionContent').value = '';
        $('#sectionShowHeader').checked = false;
    }

    function renderSections() {
        const list = $('#sectionsList');
        const sections = window.TMXContent.getSections();
        if (!sections.length) {
            list.innerHTML = '<div class="mini-note">No custom sections yet. Use the form to publish your first homepage section.</div>';
            return;
        }
        list.innerHTML = sections.map(function (section, index) {
            return '<div class="item-row"><div><h3>' + window.TMXContent.esc(section.title) + '</h3><p>#' + window.TMXContent.esc(section.id || '') + (section.showInHeader ? ' · Header link enabled' : '') + '</p></div><div class="item-actions"><button class="admin-btn small" data-edit-section="' + index + '"><i class="fas fa-pen"></i> Edit</button><button class="admin-btn small danger" data-delete-section="' + index + '"><i class="fas fa-trash"></i> Delete</button></div></div>';
        }).join('');
    }

    function saveSection(event) {
        event.preventDefault();
        const title = $('#sectionTitle').value.trim();
        const id = window.TMXContent.slugify($('#sectionId').value || title);
        const sections = window.TMXContent.getSections();
        const editIndex = $('#sectionEditIndex').value;
        const next = { title: title, id: id, tag: $('#sectionTag').value.trim() || 'Custom', icon: $('#sectionIcon').value.trim() || 'fas fa-puzzle-piece', content: $('#sectionContent').value.trim(), showInHeader: $('#sectionShowHeader').checked, updatedAt: new Date().toISOString() };
        if (!title || !next.content) { setStatus('#sectionStatus', 'Add a title and content first.'); return; }
        if (editIndex !== '') sections[Number(editIndex)] = next; else sections.push(next);
        window.TMXContent.saveSections(sections);
        clearSectionForm();
        renderAll();
        setStatus('#sectionStatus', 'Section saved. Open the homepage to see it.', true);
    }

    function fillSectionSample() {
        $('#sectionTitle').value = 'Why users choose TempMailX';
        $('#sectionId').value = 'why-users-choose-tempmailx';
        $('#sectionTag').value = 'Use cases';
        $('#sectionIcon').value = 'fas fa-user-check';
        $('#sectionShowHeader').checked = true;
        $('#sectionContent').value = '<div class="tmx-info-grid"><div class="tmx-info-card"><i class="fas fa-shield-halved"></i><h3>Privacy first</h3><p>Use a disposable inbox when a website needs email verification but does not need your real address.</p></div><div class="tmx-info-card"><i class="fas fa-vial"></i><h3>Testing friendly</h3><p>Developers can test signup flows, OTP emails, and product trials without creating personal accounts.</p></div><div class="tmx-info-card"><i class="fas fa-inbox"></i><h3>Cleaner inbox</h3><p>Keep promotions, one-time downloads, and unknown newsletters away from your primary mailbox.</p></div></div>';
    }

    function editSection(index) {
        const section = window.TMXContent.getSections()[index];
        if (!section) return;
        $('#sectionEditIndex').value = String(index);
        $('#sectionTitle').value = section.title || '';
        $('#sectionId').value = section.id || '';
        $('#sectionTag').value = section.tag || '';
        $('#sectionIcon').value = section.icon || '';
        $('#sectionContent').value = section.content || '';
        $('#sectionShowHeader').checked = !!section.showInHeader;
        setStatus('#sectionStatus', 'Editing section #' + (index + 1));
    }

    function deleteSection(index) {
        const sections = window.TMXContent.getSections();
        sections.splice(index, 1);
        window.TMXContent.saveSections(sections);
        renderAll();
    }

    function clearPageForm() {
        $('#pageEditIndex').value = '';
        $('#pageTitle').value = '';
        $('#pageSlug').value = '';
        $('#pageSummary').value = '';
        $('#pageBody').value = '';
        $('#pageShowHeader').checked = true;
    }

    function renderPages() {
        const list = $('#pagesList');
        const pages = window.TMXContent.getPages();
        if (!pages.length) { list.innerHTML = '<div class="mini-note">No header pages yet. Add one and enable header display.</div>'; return; }
        list.innerHTML = pages.map(function (page, index) {
            return '<div class="item-row"><div><h3>' + window.TMXContent.esc(page.title) + '</h3><p>page.html?slug=' + window.TMXContent.esc(page.slug) + (page.showInHeader ? ' · Header link enabled' : '') + '</p></div><div class="item-actions"><a class="admin-btn small" href="page.html?slug=' + encodeURIComponent(page.slug) + '"><i class="fas fa-arrow-up-right-from-square"></i> Open</a><button class="admin-btn small" data-edit-page="' + index + '"><i class="fas fa-pen"></i> Edit</button><button class="admin-btn small danger" data-delete-page="' + index + '"><i class="fas fa-trash"></i> Delete</button></div></div>';
        }).join('');
    }

    function savePage(event) {
        event.preventDefault();
        const title = $('#pageTitle').value.trim();
        const slug = window.TMXContent.slugify($('#pageSlug').value || title);
        const body = $('#pageBody').value.trim();
        if (!title || !slug || !body) { setStatus('#pageStatus', 'Add a title, slug, and page content first.'); return; }
        const pages = window.TMXContent.getPages();
        const editIndex = $('#pageEditIndex').value;
        const next = { title: title, slug: slug, summary: $('#pageSummary').value.trim(), body: body, showInHeader: $('#pageShowHeader').checked, updatedAt: new Date().toISOString() };
        if (editIndex !== '') pages[Number(editIndex)] = next; else pages.push(next);
        window.TMXContent.savePages(pages);
        clearPageForm();
        renderAll();
        setStatus('#pageStatus', 'Page saved. It is ready in the public header if enabled.', true);
    }

    function fillPageSample() {
        $('#pageTitle').value = 'Privacy Center';
        $('#pageSlug').value = 'privacy-center';
        $('#pageSummary').value = 'How TempMailX helps users reduce spam and protect their identity online.';
        $('#pageBody').value = '<h2>Who is TempMailX for?</h2><p>TempMailX is for people who need a quick inbox for signups, OTP previews, downloads, trials, and product testing without exposing their primary email address.</p><h2>Why use it?</h2><p>Temporary email reduces spam, limits tracking, and gives developers a fast way to test email-based workflows. Use it for low-risk, short-term tasks, not for banking, work accounts, or services you need to recover later.</p>';
        $('#pageShowHeader').checked = true;
    }

    function editPage(index) {
        const page = window.TMXContent.getPages()[index];
        if (!page) return;
        $('#pageEditIndex').value = String(index);
        $('#pageTitle').value = page.title || '';
        $('#pageSlug').value = page.slug || '';
        $('#pageSummary').value = page.summary || '';
        $('#pageBody').value = page.body || '';
        $('#pageShowHeader').checked = !!page.showInHeader;
        setStatus('#pageStatus', 'Editing page #' + (index + 1));
    }

    function deletePage(index) {
        const pages = window.TMXContent.getPages();
        pages.splice(index, 1);
        window.TMXContent.savePages(pages);
        renderAll();
    }

    function clearArticleForm() {
        $('#articleEditIndex').value = '';
        $('#articleTitle').value = '';
        $('#articleCategory').value = 'privacy';
        $('#articleImage').value = '';
        $('#articleExcerpt').value = '';
        $('#articleContent').value = '';
        $('#articleEditorLang').value = 'en';
        currentEditingArticle = null;
        currentEditorLang = 'en';
    }

    function renderArticles() {
        const list = $('#articlesList');
        const articles = window.TMXContent.getArticles();
        if (!articles.length) { list.innerHTML = '<div class="mini-note">No articles yet. Reset default real articles or add your own.</div>'; return; }
        list.innerHTML = articles.map(function (article, index) {
            return '<div class="item-row"><div><h3>' + window.TMXContent.esc(textValue(article.title)) + '</h3><p>' + window.TMXContent.esc(article.category || 'privacy') + ' · ' + window.TMXContent.esc(textValue(article.readTime) || '5 min read') + '</p></div><div class="item-actions"><a class="admin-btn small" href="blog.html?id=' + index + '"><i class="fas fa-arrow-up-right-from-square"></i> Open</a><button class="admin-btn small" data-edit-article="' + index + '"><i class="fas fa-pen"></i> Edit</button><button class="admin-btn small danger" data-delete-article="' + index + '"><i class="fas fa-trash"></i> Delete</button></div></div>';
        }).join('');
    }

    function loadArticleLangFields(lang) {
        if (!currentEditingArticle) return;
        const titleVal = typeof currentEditingArticle.title === 'object' 
            ? (currentEditingArticle.title[lang] || '') 
            : (lang === 'en' ? (currentEditingArticle.title || '') : '');
        const excerptVal = typeof currentEditingArticle.excerpt === 'object' 
            ? (currentEditingArticle.excerpt[lang] || '') 
            : (lang === 'en' ? (currentEditingArticle.excerpt || '') : '');
        const contentVal = typeof currentEditingArticle.content === 'object' 
            ? (currentEditingArticle.content[lang] || '') 
            : (lang === 'en' ? (currentEditingArticle.content || '') : '');
        $('#articleTitle').value = titleVal;
        $('#articleExcerpt').value = excerptVal;
        $('#articleContent').value = contentVal;
    }

    function saveArticleLangFields(lang) {
        if (!currentEditingArticle) {
            currentEditingArticle = { title: {}, excerpt: {}, content: {}, category: 'privacy', image: '' };
        }
        if (typeof currentEditingArticle.title !== 'object') currentEditingArticle.title = { en: currentEditingArticle.title || '' };
        if (typeof currentEditingArticle.excerpt !== 'object') currentEditingArticle.excerpt = { en: currentEditingArticle.excerpt || '' };
        if (typeof currentEditingArticle.content !== 'object') currentEditingArticle.content = { en: currentEditingArticle.content || '' };
        currentEditingArticle.title[lang] = $('#articleTitle').value.trim();
        currentEditingArticle.excerpt[lang] = $('#articleExcerpt').value.trim();
        currentEditingArticle.content[lang] = $('#articleContent').value.trim();
    }

    function handleArticleEditorLangChange() {
        const newLang = $('#articleEditorLang').value;
        if (newLang === currentEditorLang) return;
        saveArticleLangFields(currentEditorLang);
        loadArticleLangFields(newLang);
        currentEditorLang = newLang;
    }

    function saveArticle(event) {
        event.preventDefault();
        saveArticleLangFields(currentEditorLang);
        const titleEn = currentEditingArticle.title.en || '';
        const contentEn = currentEditingArticle.content.en || '';
        const titleAr = currentEditingArticle.title.ar || '';
        const contentAr = currentEditingArticle.content.ar || '';
        if (!titleEn && !titleAr) { setStatus('#articleStatus', 'Please enter a title for this article.'); return; }
        if (!contentEn && !contentAr) { setStatus('#articleStatus', 'Please enter some article content.'); return; }
        currentEditingArticle.category = $('#articleCategory').value;
        currentEditingArticle.image = $('#articleImage').value.trim() || 'img/1.png';
        currentEditingArticle.date = currentEditingArticle.date || new Date().toISOString().slice(0, 10);
        currentEditingArticle.lastModified = Date.now();
        currentEditingArticle.readTime = currentEditingArticle.readTime || { en: '6 min read', ar: '6 دقائق قراءة' };
        const articles = window.TMXContent.getArticles();
        const editIndex = $('#articleEditIndex').value;
        if (editIndex !== '') articles[Number(editIndex)] = currentEditingArticle; else articles.unshift(currentEditingArticle);
        window.TMXContent.saveArticles(articles);
        clearArticleForm();
        renderAll();
        setStatus('#articleStatus', 'Article saved and published to Blog/Home.', true);
    }

    function fillArticleSample() {
        $('#articleTitle').value = 'How temporary inboxes protect product teams during QA';
        $('#articleCategory').value = 'guide';
        $('#articleImage').value = 'img/3.png';
        $('#articleExcerpt').value = 'A practical guide for developers and QA teams using temporary email to test signups, OTP flows, and notification templates.';
        $('#articleContent').value = '<p>Product teams often need dozens of fresh inboxes while testing onboarding, password resets, OTP delivery, and notification templates. Temporary email makes this workflow faster because every tester can generate a clean address in seconds.</p><h3>Use separate addresses for each scenario</h3><p>Create one inbox for signup, another for password reset, and another for billing emails. This keeps test results easy to read and prevents old messages from confusing a new test run.</p><h3>Do not use it for permanent accounts</h3><p>Temporary addresses are designed for short-lived workflows. Use a team-owned inbox for accounts you need to recover later.</p>';
    }

    function editArticle(index) {
        const article = window.TMXContent.getArticles()[index];
        if (!article) return;
        currentEditingArticle = JSON.parse(JSON.stringify(article));
        currentEditorLang = 'en';
        $('#articleEditorLang').value = 'en';
        $('#articleEditIndex').value = String(index);
        $('#articleCategory').value = currentEditingArticle.category || 'privacy';
        $('#articleImage').value = currentEditingArticle.image || '';
        loadArticleLangFields('en');
        setStatus('#articleStatus', 'Editing article #' + (index + 1));
    }

    function deleteArticle(index) {
        const articles = window.TMXContent.getArticles();
        articles.splice(index, 1);
        window.TMXContent.saveArticles(articles);
        renderAll();
    }

    function loadStripeForm() {
        const settings = window.TMXContent.getStripeSettings();
        $('#stripeEndpoint').value = settings.endpoint || '';
        $('#stripeKey').value = settings.publishableKey || '';
        $('#stripeSuccess').value = settings.successUrl || '';
        $('#stripeCancel').value = settings.cancelUrl || '';
        $('#proMonthlyPrice').value = settings.prices.pro.monthly || '';
        $('#proYearlyPrice').value = settings.prices.pro.yearly || '';
        $('#businessMonthlyPrice').value = settings.prices.business.monthly || '';
        $('#businessYearlyPrice').value = settings.prices.business.yearly || '';
    }

    function saveStripe(event) {
        event.preventDefault();
        const current = window.TMXContent.getStripeSettings();
        const settings = { ...current, endpoint: $('#stripeEndpoint').value.trim(), publishableKey: $('#stripeKey').value.trim(), successUrl: $('#stripeSuccess').value.trim(), cancelUrl: $('#stripeCancel').value.trim(), prices: { pro: { monthly: $('#proMonthlyPrice').value.trim(), yearly: $('#proYearlyPrice').value.trim() }, business: { monthly: $('#businessMonthlyPrice').value.trim(), yearly: $('#businessYearlyPrice').value.trim() } } };
        window.TMXContent.saveStripeSettings(settings);
        setStatus('#stripeStatus', 'Stripe settings saved. Premium buttons will use these values.', true);
    }

    function resetStripe() {
        window.TMXContent.saveStripeSettings(window.TMXContent.DEFAULT_STRIPE);
        loadStripeForm();
        setStatus('#stripeStatus', 'Stripe placeholders restored.');
    }

    function renderAll() {
        seedArticlesIfNeeded();
        refreshCounts();
        renderSections();
        renderPages();
        renderArticles();
        loadStripeForm();
    }

    function bindEvents() {
        $('#fillLogin').addEventListener('click', function () { $('#loginEmail').value = ADMIN_EMAIL; $('#loginPassword').value = ADMIN_PASSWORD; });
        $('#loginForm').addEventListener('submit', function (event) {
            event.preventDefault();
            if ($('#loginEmail').value.trim() === ADMIN_EMAIL && $('#loginPassword').value === ADMIN_PASSWORD) { sessionStorage.setItem(AUTH_KEY, 'true'); showApp(); }
            else setStatus('#loginStatus', 'Wrong email or password.');
        });
        $('#logoutBtn').addEventListener('click', function () { sessionStorage.removeItem(AUTH_KEY); showLogin(); });
        $$('.admin-tab').forEach(function (tab) { tab.addEventListener('click', function () { $$('.admin-tab').forEach(function (item) { item.classList.remove('active'); }); $$('.admin-panel').forEach(function (item) { item.classList.remove('active'); }); tab.classList.add('active'); $('#panel-' + tab.dataset.tab).classList.add('active'); }); });
        $('#sectionForm').addEventListener('submit', saveSection);
        $('#sectionSample').addEventListener('click', fillSectionSample);
        $('#sectionClear').addEventListener('click', clearSectionForm);
        $('#pageForm').addEventListener('submit', savePage);
        $('#pageSample').addEventListener('click', fillPageSample);
        $('#pageClear').addEventListener('click', clearPageForm);
        $('#articleForm').addEventListener('submit', saveArticle);
        $('#articleEditorLang').addEventListener('change', handleArticleEditorLangChange);
        $('#articleSample').addEventListener('click', fillArticleSample);
        $('#articleClear').addEventListener('click', clearArticleForm);
        $('#resetArticles').addEventListener('click', function () { const defaults = typeof window.getDefaultArticles === 'function' ? window.getDefaultArticles() : []; window.TMXContent.saveArticles(defaults); renderAll(); });
        $('#stripeForm').addEventListener('submit', saveStripe);
        $('#stripeReset').addEventListener('click', resetStripe);
        document.addEventListener('click', function (event) {
            const sectionEdit = event.target.closest('[data-edit-section]');
            const sectionDelete = event.target.closest('[data-delete-section]');
            const pageEdit = event.target.closest('[data-edit-page]');
            const pageDelete = event.target.closest('[data-delete-page]');
            const articleEdit = event.target.closest('[data-edit-article]');
            const articleDelete = event.target.closest('[data-delete-article]');
            if (sectionEdit) editSection(Number(sectionEdit.dataset.editSection));
            if (sectionDelete) deleteSection(Number(sectionDelete.dataset.deleteSection));
            if (pageEdit) editPage(Number(pageEdit.dataset.editPage));
            if (pageDelete) deletePage(Number(pageDelete.dataset.deletePage));
            if (articleEdit) editArticle(Number(articleEdit.dataset.editArticle));
            if (articleDelete) deleteArticle(Number(articleDelete.dataset.deleteArticle));
        });
    }

    document.addEventListener('DOMContentLoaded', function () { bindEvents(); if (isAuthed()) showApp(); else showLogin(); });
})();
