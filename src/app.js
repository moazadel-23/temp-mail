/* ========================================
   TempSnap - Complete Working Version
   ======================================== */

const PASS = 'TMX_temp_2026!';
const API_LIST = ['https://api.mail.gw', 'https://api.mail.tm'];
let API = API_LIST[0];

const S = {
    token: null,
    accountId: null,
    email: null,
    domains: [],
    messages: [],
    currentMsg: null,
    timer: null,
    seconds: 600,
    refresh: null
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ========================================
// Detect working API
// ========================================
async function detectAPI() {
    for (const base of API_LIST) {
        try {
            const r = await fetch(base + '/domains', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(6000)
            });
            const d = await r.json();
            if (r.ok && d['hydra:member'] && d['hydra:member'].length > 0) {
                API = base;
                console.log('API connected:', base);
                return base;
            }
        } catch (e) {
            console.log('API failed:', base, e.message);
        }
    }
    // Default fallback
    API = API_LIST[1];
    return API;
}

// ========================================
// API Call
// ========================================
async function callAPI(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (S.token) headers['Authorization'] = 'Bearer ' + S.token;

    const url = API + path;
    console.log('>>>', opts.method || 'GET', url);

    const resp = await fetch(url, { ...opts, headers });
    console.log('<<<', resp.status, resp.statusText);

    if (resp.status === 204) return null;

    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }

    if (!resp.ok) {
        const errMsg = json['hydra:description'] || json.detail || json['hydra:title'] || ('HTTP ' + resp.status);
        throw new Error(errMsg);
    }
    return json;
}

// ========================================
// Toast
// ========================================
function toast(msg, type = 'info') {
    const ico = type === 'ok' ? 'fa-check-circle' : type === 'err' ? 'fa-exclamation-circle' : 'fa-info-circle';
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<i class="fas ' + ico + '"></i><span>' + msg + '</span>';
    $('#toastBox').appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 3500);
}

// ========================================
// Domains
// ========================================
async function getDomains() {
    const d = await callAPI('/domains');
    S.domains = (d['hydra:member'] || []).filter(x => x.isActive);
    // Prioritize .com domains by placing them at the beginning of the list
    S.domains.sort((a, b) => {
        const aIsCom = a.domain.toLowerCase().endsWith('.com');
        const bIsCom = b.domain.toLowerCase().endsWith('.com');
        if (aIsCom && !bIsCom) return -1;
        if (!aIsCom && bIsCom) return 1;
        return 0;
    });
    return S.domains;
}

// ========================================
// Create Account + Get Token
// ========================================
function randStr(len) {
    const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: len }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

async function createNewEmail(customUser) {
    if (!S.domains.length) {
        await getDomains();
        if (!S.domains.length) throw new Error('No domains available');
    }

    const user = customUser || randStr(10);
    const domain = S.domains[0].domain;
    const address = user + '@' + domain;
    const password = PASS;

    // Step 1: Create account
    console.log('Creating account:', address);
    await callAPI('/accounts', {
        method: 'POST',
        body: JSON.stringify({ address: address, password: password })
    });

    // Step 2: Get token
    console.log('Getting token for:', address);
    const tokenResp = await callAPI('/token', {
        method: 'POST',
        body: JSON.stringify({ address: address, password: password })
    });

    S.token = tokenResp.token;
    S.accountId = tokenResp.id;
    S.email = address;

    // Save
    localStorage.setItem('tmx_token', S.token);
    localStorage.setItem('tmx_account', S.accountId);
    localStorage.setItem('tmx_email', S.email);
    localStorage.setItem('tmx_api', API);
    localStorage.setItem('tmx_time', Date.now().toString());

    console.log('Account created! Email:', address, 'Token:', S.token.substring(0, 20) + '...');
    return address;
}

// ========================================
// Restore Session
// ========================================
function restoreSession() {
    const token = localStorage.getItem('tmx_token');
    const email = localStorage.getItem('tmx_email');
    const account = localStorage.getItem('tmx_account');
    const savedApi = localStorage.getItem('tmx_api');
    const savedTime = parseInt(localStorage.getItem('tmx_time') || '0');
    const elapsed = (Date.now() - savedTime) / 1000;

    if (token && email && account && elapsed < 600) {
        // Make sure we use the same API
        if (savedApi) API = savedApi;
        S.token = token;
        S.email = email;
        S.accountId = account;
        return true;
    }

    // Clear expired session
    localStorage.removeItem('tmx_token');
    localStorage.removeItem('tmx_account');
    localStorage.removeItem('tmx_email');
    localStorage.removeItem('tmx_api');
    localStorage.removeItem('tmx_time');
    return false;
}

// ========================================
// Generate New Email (full flow)
// ========================================
async function generateNew(customUser) {
    showLoading();
    try {
        await createNewEmail(customUser);
        updateDisplay();
        startTimer();
        startRefresh();
        await loadMessages();
        toast('New email created!', 'ok');
    } catch (e) {
        console.error('Generate error:', e);
        toast('Error: ' + e.message, 'err');
    }
}

// ========================================
// Timer
// ========================================
function startTimer() {
    clearInterval(S.timer);
    const saved = parseInt(localStorage.getItem('tmx_time') || Date.now());
    S.seconds = Math.max(0, 600 - Math.floor((Date.now() - saved) / 1000));
    tickTimer();
    S.timer = setInterval(() => {
        S.seconds--;
        tickTimer();
        if (S.seconds <= 0) {
            clearInterval(S.timer);
            toast('Email expired! Generating new...', 'info');
            generateNew();
        }
    }, 1000);
}

function tickTimer() {
    const m = Math.floor(Math.max(0, S.seconds) / 60);
    const s = Math.max(0, S.seconds) % 60;
    const el = $('#timerText');
    if (el) el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    const box = $('#timerBox');
    if (box) {
        if (S.seconds < 120) box.style.background = 'rgba(239,68,68,.15)';
        else box.style.background = '';
    }
}

// ========================================
// UI
// ========================================
function showLoading() {
    const el = $('#emailDisplay');
    if (el) el.textContent = 'Generating...';
}

function updateDisplay() {
    const el = $('#emailDisplay');
    if (el && S.email) el.textContent = S.email;
}

// ========================================
// Load Messages
// ========================================
async function loadMessages() {
    if (!S.token) return;
    try {
        const d = await callAPI('/messages');
        S.messages = d['hydra:member'] || [];
        renderList();
    } catch (e) {
        console.error('Load messages error:', e);
        // Token might be invalid - try to refresh
        if (e.message.includes('401') || e.message.includes('Unauthorized')) {
            toast('Session expired. Creating new email...', 'info');
            localStorage.removeItem('tmx_token');
            localStorage.removeItem('tmx_account');
            localStorage.removeItem('tmx_email');
            localStorage.removeItem('tmx_time');
            S.token = null;
            await generateNew();
        }
    }
}

function renderList() {
    const list = $('#emailList');
    const empty = $('#listEmpty');
    let msgs = [...S.messages];

    list.querySelectorAll('.email-item').forEach(el => el.remove());

    if (msgs.length === 0) {
        if (empty) empty.style.display = 'flex';
    } else {
        if (empty) empty.style.display = 'none';
        msgs.forEach(m => list.appendChild(makeItem(m)));
    }
}

function makeItem(m) {
    const d = document.createElement('div');
    d.className = 'email-item' + (!m.seen ? ' unread' : '');
    const name = m.from?.name || m.from?.address || 'Unknown';
    const init = name.charAt(0).toUpperCase();
    const time = relTime(m.createdAt);
    const msgId = m.id || '';
    d.innerHTML =
        '<div class="em-av-wrap">' +
        '<div class="em-av">' + init + '</div>' +
        '<svg class="av-spin" viewBox="0 0 46 46"><circle class="av-spin-dot d1" cx="23" cy="2" r="2.5" fill="#7c3aed"/><circle class="av-spin-dot d2" cx="23" cy="44" r="2.5" fill="#3b82f6"/></svg>' +
        '</div>' +
        '<div class="em-info">' +
        '<div class="em-from">' + esc(name) + '</div>' +
        '<div class="em-subject">' + esc(m.subject || 'No Subject') + '</div>' +
        '<div class="em-intro">' + esc(m.intro || '') + '</div>' +
        '</div>' +
        '<div class="em-right">' +
        '<span class="em-time">' + time + '</span>' +
        (m.hasAttachments ? '<i class="fas fa-paperclip em-clip"></i>' : '') +
        '</div>';
    d.onclick = function () { openMsg(msgId); };
    return d;
}

// ========================================
// Open Message - THE FIX IS HERE
// ========================================
async function openMsg(id) {
    if (!S.token || !id) {
        toast('No message selected', 'err');
        return;
    }

    console.log('Opening message ID:', id);

    try {
        // Fetch full message
        const m = await callAPI('/messages/' + id);
        S.currentMsg = m;
        console.log('Message loaded:', m.subject);

        // Mark as read (don't fail if this errors)
        try {
            if (!m.seen) {
                await callAPI('/messages/' + id, {
                    method: 'PATCH',
                    body: JSON.stringify({ seen: true })
                });
            }
        } catch (e) { /* ignore mark-read errors */ }

        // Switch view
        const list = $('#emailList');
        const toolbar = $('.inbox-toolbar');
        const detail = $('#emailDetail');
        if (list) list.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        if (detail) detail.style.display = 'flex';

        // Fill metadata
        const subj = $('#dSubject');
        const from = $('#dFrom');
        const to = $('#dTo');
        const date = $('#dDate');
        if (subj) subj.textContent = m.subject || 'No Subject';
        if (from) from.textContent = (m.from?.name || '') + ' <' + (m.from?.address || '') + '>';
        if (to) to.textContent = (m.to || []).map(function (t) { return t.address; }).join(', ');
        if (date) date.textContent = new Date(m.createdAt).toLocaleString();

        // Fill body
        const bodyEl = $('#dBody');
        if (bodyEl) {
            let bodyHtml = '';
            if (m.html && m.html.length > 0) {
                bodyHtml = Array.isArray(m.html) ? m.html.join('') : String(m.html);
            } else if (m.text) {
                bodyHtml = '<pre style="white-space:pre-wrap;font-family:inherit;line-height:1.6">' + esc(m.text) + '</pre>';
            }
            bodyEl.innerHTML = bodyHtml || '<p style="color:var(--tx3);text-align:center;padding:40px">No content available</p>';
        }

        // Attachments
        const attBox = $('#dAttachments');
        const attList = $('#attList');
        if (m.attachments && m.attachments.length > 0 && attBox && attList) {
            attBox.style.display = 'block';
            attList.innerHTML = m.attachments.map(function (a) {
                return '<div class="att-item" onclick="dlAtt(\'' + (a.downloadUrl || '') + '\',\'' + esc(a.filename || 'file') + '\')">' +
                    '<i class="fas fa-file"></i>' + esc(a.filename || 'file') + ' (' + fmtSize(a.size) + ')</div>';
            }).join('');
        } else if (attBox) {
            attBox.style.display = 'none';
        }

        // Refresh list to update read status
        loadMessages();

    } catch (e) {
        console.error('Open message FAILED:', e.message);
        toast('Error opening message: ' + e.message, 'err');
    }
}

function closeDetail() {
    const list = $('#emailList');
    const toolbar = $('.inbox-toolbar');
    const detail = $('#emailDetail');
    if (list) list.style.display = 'block';
    if (toolbar) toolbar.style.display = 'flex';
    if (detail) detail.style.display = 'none';
    S.currentMsg = null;
    renderList();
}

// ========================================
// Custom Confirm Modal
// ========================================
function askConfirm(title, msg) {
    return new Promise(function (resolve) {
        const modal = $('#confirmModal');
        const titleEl = $('#confirmTitle');
        const msgEl = $('#confirmMsg');
        const yesBtn = $('#confirmYes');
        const noBtn = $('#confirmNo');

        titleEl.textContent = title;
        msgEl.textContent = msg;
        modal.classList.add('open');

        function cleanup(val) {
            modal.classList.remove('open');
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
            modal.querySelector('.modal-bg').removeEventListener('click', onBg);
            resolve(val);
        }
        function onYes() { cleanup(true); }
        function onNo() { cleanup(false); }
        function onBg() { cleanup(false); }

        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);
        modal.querySelector('.modal-bg').addEventListener('click', onBg);
    });
}

// ========================================
// Delete
// ========================================
async function deleteMsg(id) {
    if (!S.token || !id) return;
    try {
        await callAPI('/messages/' + id, { method: 'DELETE' });
        toast('Message deleted', 'ok');
        closeDetail();
        loadMessages();
    } catch (e) {
        toast('Delete failed: ' + e.message, 'err');
    }
}

async function deleteAll() {
    if (!S.token || !S.messages.length) return;
    try {
        for (const m of S.messages) {
            if (m.id) await callAPI('/messages/' + m.id, { method: 'DELETE' });
        }
        toast('All messages deleted', 'ok');
        closeDetail();
        loadMessages();
    } catch (e) {
        toast('Delete failed', 'err');
    }
}

async function deleteAccount() {
    if (!S.token) return;
    try {
        if (S.accountId) await callAPI('/accounts/' + S.accountId, { method: 'DELETE' });
    } catch (e) { /* ignore */ }

    localStorage.removeItem('tmx_token');
    localStorage.removeItem('tmx_account');
    localStorage.removeItem('tmx_email');
    localStorage.removeItem('tmx_api');
    localStorage.removeItem('tmx_time');
    S.token = null;
    S.accountId = null;
    S.email = null;
    S.messages = [];
    toast('Email deleted', 'ok');
    generateNew();
}

// ========================================
// Attachments + Download
// ========================================
window.dlAtt = function (url, name) {
    if (!url) { toast('Download URL not available', 'err'); return; }
    const fullUrl = url.startsWith('http') ? url : API + url;
    window.open(fullUrl, '_blank');
    toast('Downloading ' + name, 'info');
};

function downloadEml() {
    if (!S.currentMsg) return;
    const m = S.currentMsg;
    let eml = 'From: ' + (m.from?.address || '') + '\r\n';
    eml += 'To: ' + (m.to || []).map(function (t) { return t.address; }).join(', ') + '\r\n';
    eml += 'Date: ' + m.createdAt + '\r\n';
    eml += 'Subject: ' + (m.subject || '') + '\r\n';
    eml += 'MIME-Version: 1.0\r\n';
    if (m.html && m.html.length) {
        eml += 'Content-Type: text/html; charset=UTF-8\r\n\r\n';
        eml += Array.isArray(m.html) ? m.html.join('') : m.html;
    } else {
        eml += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n';
        eml += m.text || '';
    }
    const b = new Blob([eml], { type: 'message/rfc822' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = (m.subject || 'email') + '.eml';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Email downloaded', 'ok');
}

// ========================================
// Auto Refresh
// ========================================
function startRefresh() {
    clearInterval(S.refresh);
    S.refresh = setInterval(loadMessages, 5000);
}

// ========================================
// QR Code
// ========================================
function showQR(e) {
    if (e) e.stopPropagation();
    if (!S.email) return;
    const popover = $('#qrPopover');
    const box = $('#qrCanvas');
    const emailSub = $('#qrEmailSub');
    if (!popover) return;

    if (popover.classList.contains('open')) {
        popover.classList.remove('open');
        return;
    }

    if (emailSub) {
        emailSub.textContent = S.email;
    }

    if (box) {
        box.innerHTML = '';
        let qrGenerated = false;

        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(box, {
                    text: S.email,
                    width: 128,
                    height: 128,
                    colorDark: '#0f172a',
                    colorLight: '#ffffff',
                    correctLevel: typeof QRCode.CorrectLevel !== 'undefined' ? QRCode.CorrectLevel.H : 2
                });
                
                const canvas = box.querySelector('canvas');
                const img = box.querySelector('img');
                if (canvas || img) {
                    qrGenerated = true;
                }
            } catch (err) {
                console.warn('QRCode JS generation error, using fallback API:', err);
            }
        }

        // Reliable fallback if QRCode library fails or is unavailable
        if (!qrGenerated) {
            const fallbackImg = document.createElement('img');
            fallbackImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(S.email)}&color=0f172a`;
            fallbackImg.alt = 'QR Code';
            fallbackImg.style.width = '128px';
            fallbackImg.style.height = '128px';
            fallbackImg.style.display = 'block';
            fallbackImg.style.margin = '0 auto';
            box.appendChild(fallbackImg);
        }
    }
    popover.classList.add('open');
}

// ========================================
// Copy
// ========================================
async function copyEmail() {
    if (!S.email) return;
    try {
        await navigator.clipboard.writeText(S.email);
        toast('Email copied!', 'ok');
    } catch (e) {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = S.email;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast('Email copied!', 'ok');
    }
}

// ========================================
// Helpers
// ========================================
function relTime(d) {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return new Date(d).toLocaleDateString();
}

function fmtSize(b) {
    if (!b) return '0 B';
    const u = ['B', 'KB', 'MB'];
    let i = 0;
    while (b >= 1024 && i < 2) { b /= 1024; i++; }
    return b.toFixed(1) + ' ' + u[i];
}

function esc(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ========================================
// Theme
// ========================================
function initTheme() {
    const t = localStorage.getItem('tmx_theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    updateThemeIcon(t);
}

function toggleTheme() {
    const c = document.documentElement.getAttribute('data-theme');
    const n = c === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    localStorage.setItem('tmx_theme', n);
    updateThemeIcon(n);
}

function updateThemeIcon(t) {
    const i = $('#themeBtn i');
    if (i) i.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ========================================
// FAQ
// ========================================
function initFAQ() {
    $$('.faq-q').forEach(function (btn) {
        btn.onclick = function () {
            const item = btn.closest('.faq-item');
            const open = item.classList.contains('open');
            $$('.faq-item').forEach(function (i) { i.classList.remove('open'); });
            if (!open) item.classList.add('open');
        };
    });
}

// ========================================
// Stats
// ========================================
function initStats() {
    const obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) { animateStats(); obs.unobserve(e.target); }
        });
    }, { threshold: 0.3 });
    const sec = $('.stats-section');
    if (sec) obs.observe(sec);
}

function animateStats() {
    $$('.stat-num[data-to]').forEach(function (el) {
        const to = parseInt(el.dataset.to);
        const suf = el.dataset.suffix || '+';
        const dur = 2000;
        const start = Date.now();
        (function run() {
            const p = Math.min((Date.now() - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            const v = Math.floor(to * ease);
            el.textContent = (to >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : to >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v) + (p >= 1 ? suf : '+');
            if (p < 1) requestAnimationFrame(run);
        })();
    });
}

// ========================================
// Scroll Reveal
// ========================================
function initReveal() {
    const obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('vis'); });
    }, { threshold: 0.1 });
    $$('.feat-card,.step-card,.faq-item,.sec-head,.inbox-card,.email-box').forEach(function (el) {
        el.classList.add('reveal');
        obs.observe(el);
    });
}

// ========================================
// Header
// ========================================
function initScroll() {
    window.addEventListener('scroll', function () {
        const h = $('.header');
        if (h) h.classList.toggle('scrolled', window.scrollY > 10);
    });
}

function initNav() {
    $('#menuBtn')?.addEventListener('click', function () { $('#mainNav').classList.toggle('open'); });
    $$('.nav a').forEach(function (a) {
        a.addEventListener('click', function () { $('#mainNav').classList.remove('open'); });
    });
}

// ========================================
// Keyboard Shortcuts
// ========================================
function initKeys() {
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); copyEmail(); }
        if (e.ctrlKey && e.key === 'r' && !e.shiftKey) {
            e.preventDefault();
            loadMessages();
            toast('Refreshed', 'info');
        }
        if (e.ctrlKey && e.key === 'n') { e.preventDefault(); generateNew(); }
        if (e.key === 'Escape') {
            $$('.modal.open').forEach(function (m) { m.classList.remove('open'); });
            $('#qrPopover')?.classList.remove('open');
        }
    });
}

// ========================================
// Events
// ========================================
function initEvents() {
    $('#themeBtn')?.addEventListener('click', toggleTheme);
    $('#btnCopy')?.addEventListener('click', copyEmail);
    $('#btnChange')?.addEventListener('click', function () { generateNew(); });
    $('#btnNewAddr')?.addEventListener('click', function () { generateNew(); });
    
    $('#btnRefresh')?.addEventListener('click', async function () {
        const icon = $('#btnRefresh i');
        if (icon) icon.classList.add('fa-spin');
        try {
            await generateNew();
        } catch (e) {
            console.error(e);
        } finally {
            if (icon) {
                setTimeout(() => { icon.classList.remove('fa-spin'); }, 600);
            }
        }
    });

    $('#btnRefreshInbox')?.addEventListener('click', async function () {
        const icon = $('#btnRefreshInbox i');
        if (icon) icon.classList.add('fa-spin');
        try {
            await loadMessages();
            toast(window.currentLang === 'ar' ? 'تم تحديث البريد' : 'Inbox Refreshed', 'ok');
        } catch (e) {
            console.error(e);
            toast(window.currentLang === 'ar' ? 'فشل التحديث' : 'Refresh failed', 'err');
        } finally {
            if (icon) {
                setTimeout(() => { icon.classList.remove('fa-spin'); }, 600);
            }
        }
    });

    $('#btnDelete')?.addEventListener('click', deleteAccount);
    $('#btnQR')?.addEventListener('click', showQR);
    $('#qrCloseBtn')?.addEventListener('click', function () { $('#qrPopover')?.classList.remove('open'); });

    // Close QR Popover when clicking outside
    document.addEventListener('click', function (e) {
        const popover = $('#qrPopover');
        const btn = $('#btnQR');
        if (popover && popover.classList.contains('open')) {
            // Close if click is NOT on the button itself and NOT inside the popover itself
            if (btn && !btn.contains(e.target) && !popover.contains(e.target)) {
                popover.classList.remove('open');
            }
        }
    });

    $('.modal-bg')?.addEventListener('click', function () { $$('.modal.open').forEach(function (m) { m.classList.remove('open'); }); });
    $('#btnBack')?.addEventListener('click', closeDetail);
    $('#btnDeleteMsg')?.addEventListener('click', function () {
        if (S.currentMsg && S.currentMsg.id) deleteMsg(S.currentMsg.id);
    });
    $('#btnDownload')?.addEventListener('click', downloadEml);
}

// ========================================
// INIT
// ========================================
async function init() {
    initTheme();
    initNav();
    initScroll();
    initFAQ();
    initStats();
    initReveal();
    initKeys();
    initEvents();

    // Step 1: Detect working API
    await detectAPI();

    // Step 2: Try to restore saved session
    const hasSession = restoreSession();

    if (hasSession) {
        console.log('Restoring session for:', S.email);
        updateDisplay();
        startTimer();
        startRefresh();
        await loadMessages();
    } else {
        // Step 3: Get domains and create new email
        try {
            await getDomains();
            if (S.domains.length) {
                await generateNew();
            } else {
                toast('No domains available. Try again later.', 'err');
            }
        } catch (e) {
            console.error('Init error:', e);
            toast('Failed to initialize: ' + e.message, 'err');
        }
    }

    // Load custom sections
    loadCustomSections();
}

// ========================================
// Custom Sections (from Admin)
// ========================================
function loadCustomSections() {
    const container = $('#customSections');
    if (!container) return;
    if (window.TMXContent && window.TMXContent.renderCustomSections) {
        window.TMXContent.renderCustomSections(container);
        return;
    }
    let sections;
    try { sections = JSON.parse(localStorage.getItem('tmx_sections')); } catch { sections = null; }
    if (!sections || !sections.length) return;

    container.innerHTML = sections.map(function (s) {
        return '<section style="padding:60px 0" id="' + esc(s.id) + '">' +
            '<div class="wrap">' +
            '<div class="sec-head">' +
            '<span class="tag"><i class="' + esc(s.icon || 'fas fa-puzzle-piece') + '"></i></span>' +
            '<h2>' + esc(s.title) + '</h2>' +
            '</div>' +
            '<div style="max-width:800px;margin:24px auto 0;color:var(--tx2);font-size:.92rem;line-height:1.8">' +
            (s.content || '') +
            '</div></div></section>';
    }).join('');
}

document.addEventListener('DOMContentLoaded', init);

