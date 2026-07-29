/**
 * SPEX - File-backed Platform Database Store
 * وحدة تخزين قاعدة بيانات المنصة في الخادم للحفظ التلقائي المحلي والدائم
 */

import fs from 'fs';
import path from 'path';

const DB_FILE_PATH = path.join(process.cwd(), 'data_store.json');

export interface DBStoreSchema {
  users: any[];
  lessonPlans: any[];
  dailyNotebook: any[];
  inspectorNotes: any[];
  districtMessages: any[];
  directMessages: any[];
}

const defaultDBStore: DBStoreSchema = {
  users: [],
  lessonPlans: [],
  dailyNotebook: [],
  inspectorNotes: [],
  districtMessages: [],
  directMessages: []
};

let memoryStore: DBStoreSchema = { ...defaultDBStore };

function loadStore(): DBStoreSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryStore = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        lessonPlans: Array.isArray(parsed.lessonPlans) ? parsed.lessonPlans : [],
        dailyNotebook: Array.isArray(parsed.dailyNotebook) ? parsed.dailyNotebook : [],
        inspectorNotes: Array.isArray(parsed.inspectorNotes) ? parsed.inspectorNotes : [],
        districtMessages: Array.isArray(parsed.districtMessages) ? parsed.districtMessages : [],
        directMessages: Array.isArray(parsed.directMessages) ? parsed.directMessages : []
      };
    }
  } catch (err) {
    console.error('Failed to load DB store from file, using in-memory store:', err);
  }
  return memoryStore;
}

function saveStore() {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write DB store to file:', err);
  }
}

// Initial load
loadStore();

export const dbStore = {
  get: () => memoryStore,

  getCollection: (key: keyof DBStoreSchema) => {
    return memoryStore[key] || [];
  },

  setCollection: (key: keyof DBStoreSchema, items: any[]) => {
    memoryStore[key] = items;
    saveStore();
  },

  upsertItem: (key: keyof DBStoreSchema, item: any) => {
    if (!item || !item.id) return;
    const list = memoryStore[key] || [];
    const idx = list.findIndex((x: any) => x.id === item.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.unshift(item);
    }
    memoryStore[key] = list;
    saveStore();
  },

  deleteItem: (key: keyof DBStoreSchema, itemId: string) => {
    const list = memoryStore[key] || [];
    memoryStore[key] = list.filter((x: any) => x.id !== itemId);
    saveStore();
  }
};
