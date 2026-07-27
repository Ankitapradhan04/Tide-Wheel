/* ============================================================
   TIDEWATCH DATABASE
   A tiny promise-based wrapper around IndexedDB. GitHub Pages
   only serves static files (no server), so IndexedDB is our
   real, persistent, free "database" — it lives in the visitor's
   own browser and survives reloads and restarts.
   ============================================================ */
const TideDB = (() => {
  const DB_NAME = 'TidewatchDB';
  const DB_VERSION = 1;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('routine')) {
          db.createObjectStore('routine', { keyPath: 'day' });
        }
        if (!db.objectStoreNames.contains('reminders')) {
          const s = db.createObjectStore('reminders', { keyPath: 'id', autoIncrement: true });
          s.createIndex('date', 'date');
        }
        if (!db.objectStoreNames.contains('calendarEvents')) {
          const s = db.createObjectStore('calendarEvents', { keyPath: 'id', autoIncrement: true });
          s.createIndex('date', 'date');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    return dbPromise;
  }

  async function tx(storeName, mode) {
    const db = await open();
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  return {
    async get(store, key) {
      const s = await tx(store, 'readonly');
      return new Promise((res, rej) => {
        const r = s.get(key);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => rej(r.error);
      });
    },
    async getAll(store) {
      const s = await tx(store, 'readonly');
      return new Promise((res, rej) => {
        const r = s.getAll();
        r.onsuccess = () => res(r.result || []);
        r.onerror = () => rej(r.error);
      });
    },
    async put(store, value) {
      const s = await tx(store, 'readwrite');
      return new Promise((res, rej) => {
        const r = s.put(value);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    },
    async delete(store, key) {
      const s = await tx(store, 'readwrite');
      return new Promise((res, rej) => {
        const r = s.delete(key);
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      });
    },
    async clearAll() {
      const db = await open();
      const names = ['routine', 'reminders', 'calendarEvents', 'settings'];
      await Promise.all(names.map(n => new Promise((res, rej) => {
        const r = db.transaction(n, 'readwrite').objectStore(n).clear();
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      })));
    },
    async exportAll() {
      const [routine, reminders, calendarEvents, settings] = await Promise.all([
        this.getAll('routine'), this.getAll('reminders'), this.getAll('calendarEvents'), this.getAll('settings')
      ]);
      return { app: 'tidewatch', version: DB_VERSION, exportedAt: new Date().toISOString(), routine, reminders, calendarEvents, settings };
    },
    async importAll(data) {
      if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
      await this.clearAll();
      const put = async (store, rows) => {
        for (const row of (rows || [])) await this.put(store, row);
      };
      await put('routine', data.routine);
      await put('reminders', data.reminders);
      await put('calendarEvents', data.calendarEvents);
      await put('settings', data.settings);
    }
  };
})();
