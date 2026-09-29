/* storage.js — localStorage abstraction layer */
'use strict';

window.Storage = (function() {
  const VERSION = '1.1';
  const PREFIX = 'maqamtzar_v1_';

  const KEYS = {
    VERSION: PREFIX + 'version',
    PEOPLE: PREFIX + 'people',
    USERS: PREFIX + 'users',
    BASES: PREFIX + 'bases',
    UNITS: PREFIX + 'units',
    POLICE_REPORTS: PREFIX + 'policeReports',
    DESERTER_FILES: PREFIX + 'deserterFiles',
    DESERTION_PERIODS: PREFIX + 'desertionPeriods',
    ADDRESSES: PREFIX + 'addresses',
    SURVEILLANCE_ACTIVITIES: PREFIX + 'surveillanceActivities',
    PRISONER_FILES: PREFIX + 'prisonerFiles',
    SERVICE_WORK_FILES: PREFIX + 'serviceWorkFiles',
    INMATE_ACTIVITIES: PREFIX + 'inmateActivities',
    INMATE_RECURRING_ACTIVITIES: PREFIX + 'inmateRecurringActivities',
    EVENT_REPORTS: PREFIX + 'eventReports',
    COUNTING_SESSIONS: PREFIX + 'countingSessions',
    COUNTING_ENTRIES: PREFIX + 'countingEntries',
    TASKS: PREFIX + 'tasks',
    TASK_PARTICIPANTS: PREFIX + 'taskParticipants',
    EQUIPMENT_ASSIGNMENTS: PREFIX + 'equipmentAssignments',
    CANTEEN_PURCHASES: PREFIX + 'canteenPurchases',
    CANTEEN_PURCHASE_ITEMS: PREFIX + 'canteenPurchaseItems',
    CANTEEN_PRODUCTS: PREFIX + 'canteenProducts',
    STOCK_MOVEMENTS: PREFIX + 'stockMovements',
    STOCK_MOVEMENT_ITEMS: PREFIX + 'stockMovementItems',
    NOTIFICATIONS: PREFIX + 'notifications',
    AUDIT_ENTRIES: PREFIX + 'auditEntries',
    HAMAL_ENTRIES: PREFIX + 'hamalEntries',
    MASHLAT_COORDINATIONS: PREFIX + 'mastlatCoordinations',
    GACHLAT_CANDIDATES: PREFIX + 'gachlatCandidates',
    UI_PREFS: PREFIX + 'uiPrefs',
  };

  function get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Storage.get error for key:', key, e);
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage.set error for key:', key, e);
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage.remove error:', e);
    }
  }

  function isSeeded() {
    return get(KEYS.VERSION) === VERSION;
  }

  function markSeeded() {
    set(KEYS.VERSION, VERSION);
  }

  function resetAll() {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  }

  /* Typed accessors */
  function getCollection(key) {
    return get(key) || [];
  }

  function setCollection(key, arr) {
    return set(key, arr);
  }

  function getById(key, id) {
    const arr = getCollection(key);
    return arr.find(item => item.id === id) || null;
  }

  function upsert(key, item) {
    const arr = getCollection(key);
    const idx = arr.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...item, updatedAt: new Date().toISOString() };
    } else {
      arr.push({ ...item, createdAt: item.createdAt || new Date().toISOString() });
    }
    setCollection(key, arr);
    return idx >= 0 ? arr[idx] : arr[arr.length - 1];
  }

  function remove_item(key, id) {
    const arr = getCollection(key);
    const filtered = arr.filter(i => i.id !== id);
    setCollection(key, filtered);
    return filtered;
  }

  function softDelete(key, id) {
    const arr = getCollection(key);
    const idx = arr.findIndex(i => i.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], deleted: true, deletedAt: new Date().toISOString() };
      setCollection(key, arr);
      return arr[idx];
    }
    return null;
  }

  function query(key, filters) {
    let arr = getCollection(key).filter(i => !i.deleted);
    if (!filters) return arr;
    return arr.filter(item => {
      return Object.entries(filters).every(([k, v]) => {
        if (v === '' || v == null) return true;
        const itemVal = item[k];
        if (typeof v === 'string' && typeof itemVal === 'string') {
          return itemVal.toLowerCase().includes(v.toLowerCase());
        }
        return itemVal === v;
      });
    });
  }

  return {
    KEYS,
    get, set, remove,
    isSeeded, markSeeded, resetAll,
    getCollection, setCollection, getById,
    upsert, remove: remove_item, softDelete,
    query
  };
})();
