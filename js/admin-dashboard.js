(function () {
    'use strict';

    const ADMIN_EMAIL = 'admin@baridtemp.local';
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
        renderAll();
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
        $('#sectionTitle').value = 'Why users choose BaridTemp';
        $('#sectionId').value = 'why-users-choose-baridtemp';
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
        $('#pageSummary').value = 'How BaridTemp helps users reduce spam and protect their identity online.';
        $('#pageBody').value = '<h2>Who is BaridTemp for?</h2><p>BaridTemp is for people who need a quick inbox for signups, OTP previews, downloads, trials, and product testing without exposing their primary email address.</p><h2>Why use it?</h2><p>Temporary email reduces spam, limits tracking, and gives developers a fast way to test email-based workflows. Use it for low-risk, short-term tasks, not for banking, work accounts, or services you need to recover later.</p>';
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

    function compressImage(file, callback) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.7 quality to keep size low for localStorage
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                callback(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function generateImageId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 5; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return 'img_' + id;
    }

    function saveLocalImage(id, dataUrl) {
        let stored = {};
        try { stored = JSON.parse(localStorage.getItem('tmx_uploaded_images')) || {}; } catch(e) {}
        stored[id] = dataUrl;
        localStorage.setItem('tmx_uploaded_images', JSON.stringify(stored));
    }

    function getLocalImage(id) {
        if (!id) return '';
        if (id.startsWith('data:') || id.startsWith('http') || id.includes('/')) return id;
        try {
            const stored = JSON.parse(localStorage.getItem('tmx_uploaded_images')) || {};
            return stored[id] || id;
        } catch (e) {
            return id;
        }
    }

    function updateImagePreview() {
        const val = $('#articleImage').value.trim();
        const container = $('#imagePreviewContainer');
        const preview = $('#imagePreview');
        const info = $('#imagePreviewInfo');
        
        if (!container || !preview || !info) return;

        if (val) {
            const actualSrc = getLocalImage(val);
            preview.src = actualSrc;
            container.style.display = 'flex';
            if (val.startsWith('img_')) {
                info.textContent = 'Uploaded image (' + val + ')';
            } else if (val.startsWith('data:image')) {
                info.textContent = 'Base64 image (' + Math.round(val.length / 1024) + ' KB)';
            } else {
                info.textContent = 'External URL image';
            }
        } else {
            container.style.display = 'none';
            preview.src = '';
            info.textContent = '';
        }
    }

    function clearArticleForm() {
        $('#articleEditIndex').value = '';
        $('#articleTitle').value = '';
        $('#articleCategory').value = 'privacy';
        $('#articleImage').value = '';
        $('#articleExcerpt').value = '';
        $('#articleContent').value = '';
        $('#articleEditorLang').value = 'en';
        $('#articleAuthor').value = '';
        $('#articleDate').value = '';
        $('#articleReadTime').value = '';
        currentEditingArticle = null;
        currentEditorLang = 'en';
        updateImagePreview();
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
        const readTimeVal = typeof currentEditingArticle.readTime === 'object'
            ? (currentEditingArticle.readTime[lang] || '')
            : (lang === 'en' ? (currentEditingArticle.readTime || '') : '');
        $('#articleTitle').value = titleVal;
        $('#articleExcerpt').value = excerptVal;
        $('#articleContent').value = contentVal;
        $('#articleReadTime').value = readTimeVal;
    }

    function saveArticleLangFields(lang) {
        if (!currentEditingArticle) {
            currentEditingArticle = { title: {}, excerpt: {}, content: {}, category: 'privacy', image: '' };
        }
        if (typeof currentEditingArticle.title !== 'object') currentEditingArticle.title = { en: currentEditingArticle.title || '' };
        if (typeof currentEditingArticle.excerpt !== 'object') currentEditingArticle.excerpt = { en: currentEditingArticle.excerpt || '' };
        if (typeof currentEditingArticle.content !== 'object') currentEditingArticle.content = { en: currentEditingArticle.content || '' };
        if (typeof currentEditingArticle.readTime !== 'object') {
            currentEditingArticle.readTime = { en: currentEditingArticle.readTime || '', ar: '' };
        }
        currentEditingArticle.title[lang] = $('#articleTitle').value.trim();
        currentEditingArticle.excerpt[lang] = $('#articleExcerpt').value.trim();
        currentEditingArticle.content[lang] = $('#articleContent').value.trim();
        currentEditingArticle.readTime[lang] = $('#articleReadTime').value.trim();
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
        currentEditingArticle.author = $('#articleAuthor').value.trim() || 'BaridTemp Team';
        currentEditingArticle.date = $('#articleDate').value || new Date().toISOString().slice(0, 10);
        currentEditingArticle.lastModified = Date.now();

        // Calculate dynamic read time if fields are empty
        const customEn = currentEditingArticle.readTime.en ? currentEditingArticle.readTime.en.trim() : '';
        const customAr = currentEditingArticle.readTime.ar ? currentEditingArticle.readTime.ar.trim() : '';

        if (!customEn || !customAr) {
            const enWords = (currentEditingArticle.content.en || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
            const arWords = (currentEditingArticle.content.ar || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
            
            const enMin = Math.max(1, Math.round(enWords / 200));
            const arMin = Math.max(1, Math.round(arWords / 200));

            let arReadText = '';
            if (arMin === 1) arReadText = 'دقيقة واحدة قراءة';
            else if (arMin === 2) arReadText = 'دقيقتان قراءة';
            else if (arMin >= 3 && arMin <= 10) arReadText = 'قراءة في ' + arMin + ' دقائق';
            else arReadText = 'قراءة في ' + arMin + ' دقيقة';

            if (!customEn) currentEditingArticle.readTime.en = enMin + ' min read';
            if (!customAr) currentEditingArticle.readTime.ar = arReadText;
        }
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
        $('#articleAuthor').value = currentEditingArticle.author || '';
        $('#articleDate').value = currentEditingArticle.date || '';
        loadArticleLangFields('en');
        updateImagePreview();
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

    function loadSupabaseForm() {
        $('#supabaseUrl').value = localStorage.getItem('tmx_supabase_url') || '';
        $('#supabaseAnonKey').value = localStorage.getItem('tmx_supabase_anon') || '';
    }

    function saveSupabaseConfig(event) {
        event.preventDefault();
        const url = $('#supabaseUrl').value.trim();
        const anon = $('#supabaseAnonKey').value.trim();
        if (!url || !anon) {
            setStatus('#supabaseStatus', 'Add both the Supabase project URL and anon key to enable shared sync.', false);
            return;
        }
        localStorage.setItem('tmx_supabase_url', url);
        localStorage.setItem('tmx_supabase_anon', anon);
        window.TMX_SUPABASE_CONFIG = { url: url, anonKey: anon };
        setStatus('#supabaseStatus', 'Supabase settings saved. Shared content sync is now ready to use.', true);
    }

    function resetSupabaseConfig() {
        localStorage.removeItem('tmx_supabase_url');
        localStorage.removeItem('tmx_supabase_anon');
        delete window.TMX_SUPABASE_CONFIG;
        loadSupabaseForm();
        setStatus('#supabaseStatus', 'Supabase config cleared. Site will fall back to local storage.', false);
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

    function loadVisitorCount() {
        const el = $('#visitorCount');
        if (!el) return;
        fetch('https://api.counterapi.dev/v1/TEMPMailX/visits')
            .then(res => res.json())
            .then(data => {
                if (data && typeof data.count === 'number') {
                    el.textContent = Number(data.count).toLocaleString();
                } else {
                    el.textContent = '0';
                }
            })
            .catch(err => {
                console.error('Failed to load visitor count:', err);
                el.textContent = 'Error';
            });
    }

    function renderAll() {
        seedArticlesIfNeeded();
        refreshCounts();
        renderSections();
        renderPages();
        renderArticles();
        loadStripeForm();
        loadVisitorCount();
    }

    function bindEvents() {
        $('#logoutBtn').addEventListener('click', function () { 
            sessionStorage.removeItem(AUTH_KEY); 
            window.location.replace('admin-login.html'); 
        });
        $('#articleImageFile')?.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            compressImage(file, function (dataUrl) {
                const id = generateImageId();
                saveLocalImage(id, dataUrl);
                $('#articleImage').value = id;
                updateImagePreview();
            });
        });
        $('#removeImageBtn')?.addEventListener('click', function () {
            $('#articleImage').value = '';
            $('#articleImageFile').value = '';
            updateImagePreview();
        });
        $('#articleImage')?.addEventListener('input', updateImagePreview);

        $('#articleBodyImageFile')?.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            compressImage(file, function (dataUrl) {
                const textarea = $('#articleContent');
                if (!textarea) return;
                const id = generateImageId();
                saveLocalImage(id, dataUrl);

                const startPos = textarea.selectionStart;
                const endPos = textarea.selectionEnd;
                const text = textarea.value;
                const imgTag = '<img src="' + id + '" alt="Uploaded Image">';
                
                // Copy to clipboard as a backup convenience
                navigator.clipboard.writeText(imgTag).catch(err => {
                    console.error('Failed to copy to clipboard:', err);
                });

                // Insert at cursor
                textarea.value = text.substring(0, startPos) + imgTag + text.substring(endPos);
                textarea.dispatchEvent(new Event('input'));
                
                // Restore focus and place cursor right after the inserted tag
                textarea.focus();
                const newCursorPos = startPos + imgTag.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);

                e.target.value = '';
                setStatus('#articleStatus', 'Image uploaded as ' + id + ' (inserted at cursor and copied to clipboard).', true);
            });
        });

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
        $('#supabaseForm').addEventListener('submit', saveSupabaseConfig);
        $('#supabaseReset').addEventListener('click', resetSupabaseConfig);
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

    document.addEventListener('DOMContentLoaded', function () { 
        bindEvents();
        loadSupabaseForm();
        if (isAuthed()) {
            showApp(); 
        } else {
            window.location.replace('admin-login.html');
        }
    });
})();
