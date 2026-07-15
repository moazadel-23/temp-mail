/* ========================================
   BaridTemp - IndexedDB Image Storage
   ======================================== */

const ImgDB = {
    db: null,
    DB_NAME: 'BaridTempImages',
    STORE: 'images',
    VERSION: 1,

    init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB_NAME, this.VERSION);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE)) {
                    db.createObjectStore(this.STORE);
                }
            };
            req.onsuccess = e => { this.db = e.target.result; resolve(); };
            req.onerror = e => reject(e.target.error);
        });
    },

    _tx(mode) {
        if (!this.db) throw new Error('ImgDB not initialized');
        return this.db.transaction(this.STORE, mode).objectStore(this.STORE);
    },

    save(key, base64) {
        return new Promise((resolve, reject) => {
            const req = this._tx('readwrite').put(base64, key);
            req.onsuccess = () => resolve(key);
            req.onerror = e => reject(e.target.error);
        });
    },

    get(key) {
        return new Promise((resolve, reject) => {
            const req = this._tx('readonly').get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = e => reject(e.target.error);
        });
    },

    remove(key) {
        return new Promise((resolve, reject) => {
            const req = this._tx('readwrite').delete(key);
            req.onsuccess = () => resolve();
            req.onerror = e => reject(e.target.error);
        });
    },

    getAll() {
        return new Promise((resolve, reject) => {
            const req = this._tx('readonly').getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = e => reject(e.target.error);
        });
    },

    fileToBase64(file, maxW, maxH) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                return reject(new Error('Not an image file'));
            }
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (maxW && w > maxW) { h = h * maxW / w; w = maxW; }
                    if (maxH && h > maxH) { w = w * maxH / h; h = maxH; }
                    canvas.width = Math.round(w);
                    canvas.height = Math.round(h);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = reader.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
};

ImgDB.init().catch(e => console.warn('ImgDB init failed:', e));
