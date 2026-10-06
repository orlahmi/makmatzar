/* migrations.js — idempotent, versioned data migrations (never wipes data, never overwrites user edits) */
'use strict';

window.Migrations = (function() {
  const FLAG = 'maqamtzar_v1_migrations';

  function done() { try { return JSON.parse(localStorage.getItem(FLAG) || '[]'); } catch (e) { return []; } }
  function mark(id) { const d = done(); if (d.indexOf(id) === -1) { d.push(id); localStorage.setItem(FLAG, JSON.stringify(d)); } }

  const list = [
    {
      // demo records created before the operational/administrative classification existed
      id: '2026-09-classify-demo-tasks-hamal',
      run() {
        const K = Storage.KEYS;
        const tasks = Storage.getCollection(K.TASKS);
        let i = 0;
        tasks.forEach(t => { if (/^t\d{3}$/.test(t.id) && !t.taskCategory) { t.taskCategory = (i++ % 2 === 0) ? 'operational' : 'administrative'; t.categorySource = 'demo-migration'; } });
        Storage.setCollection(K.TASKS, tasks);
        const h = Storage.getCollection(K.HAMAL_ENTRIES);
        let j = 0;
        h.forEach(e => { if (/^hml\d{3}$/.test(e.id) && !e.entryKind) { e.entryKind = (j++ % 3 === 2) ? 'administrative' : 'operational'; e.categorySource = 'demo-migration'; } });
        Storage.setCollection(K.HAMAL_ENTRIES, h);
      },
    },
    {
      // demo purchases were all in one canteen — spread the seeded ones over the real canteens
      id: '2026-09-spread-demo-purchases',
      run() {
        const cans = DEMO_UNITS.filter(u => u.type === 'canteen');
        if (cans.length < 2) return;
        const ps = Storage.getCollection(Storage.KEYS.CANTEEN_PURCHASES);
        ps.forEach((p, idx) => {
          if (/^cp\d{3}$/.test(p.id) && idx % 2 === 1) { const c = cans[1]; p.canteenId = c.id; p.canteenName = c.name; p.baseId = c.baseId; }
        });
        Storage.setCollection(Storage.KEYS.CANTEEN_PURCHASES, ps);
      },
    },
    {
      // a person may have only one ACTIVE prisoner file: soft-merge later duplicates into the earliest one
      id: '2026-09-merge-duplicate-active-prisoner-files',
      run() {
        const K = Storage.KEYS;
        const files = Storage.getCollection(K.PRISONER_FILES).filter(f => f.status === 'active').sort((a, b) => String(a.createdAt || a.admissionDate || '').localeCompare(String(b.createdAt || b.admissionDate || '')));
        const keep = {}; const dups = [];
        files.forEach(f => { if (keep[f.personId]) dups.push([f, keep[f.personId]]); else keep[f.personId] = f; });
        dups.forEach(([d, k]) => {
          const coords = Storage.getCollection(K.MASHLAT_COORDINATIONS);
          coords.forEach(c => { if (c.prisonerFileId === d.id) { c.prisonerFileId = k.id; Storage.upsert(K.MASHLAT_COORDINATIONS, c); } });
          Storage.getCollection(K.GACHLAT_CANDIDATES).forEach(c => { if (c.prisonerFileId === d.id) { c.prisonerFileId = k.id; Storage.upsert(K.GACHLAT_CANDIDATES, c); } });
          Storage.getCollection(K.EVENT_REPORTS).forEach(e => { if (e.prisonerFileId === d.id) { e.prisonerFileId = k.id; Storage.upsert(K.EVENT_REPORTS, e); } });
          Storage.upsert(K.PRISONER_FILES, Object.assign({}, d, { duplicateOf: k.id }));
          Storage.softDelete(K.PRISONER_FILES, d.id);
        });
      },
    },
    {
      // six-canteen model: legacy ids -> canonical ids; seeded demo records are spread over the six canteens
      id: '2026-10-six-canteens',
      run() {
        const K = Storage.KEYS; const C = CANTEENS;
        const legacy = LEGACY_CANTEEN_MAP;
        const ps = Storage.getCollection(K.CANTEEN_PURCHASES);
        ps.forEach((p, i) => {
          if (/^cp\d{3}$/.test(p.id)) { const c = C[i % C.length]; p.canteenId = c.id; p.canteenName = c.name; p.baseId = c.baseId; }
          else if (legacy[p.canteenId]) { const c = C.find(x => x.id === legacy[p.canteenId]); p.canteenId = c.id; p.canteenName = c.name; }
        });
        Storage.setCollection(K.CANTEEN_PURCHASES, ps);
        const pairs = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 4], [2, 5]];
        const ms = Storage.getCollection(K.STOCK_MOVEMENTS);
        let n = 0;
        ms.forEach(m => {
          if (/^sm\d{3}$/.test(m.id)) { const [a, b] = pairs[n++ % pairs.length]; m.sourceCanteenId = C[a].id; m.sourceCanteenName = C[a].name; m.destCanteenId = C[b].id; m.destCanteenName = C[b].name; }
          else {
            if (legacy[m.sourceCanteenId]) { const c = C.find(x => x.id === legacy[m.sourceCanteenId]); m.sourceCanteenId = c.id; m.sourceCanteenName = c.name; }
            if (legacy[m.destCanteenId]) { const c = C.find(x => x.id === legacy[m.destCanteenId]); m.destCanteenId = c.id; m.destCanteenName = c.name; }
          }
        });
        Storage.setCollection(K.STOCK_MOVEMENTS, ms);
      },
    },
    {
      // strict task classification: administrative subcategories are exactly דיווח/תיאום/נסיעה מנהלתית/תקלה.
      // Only certain mappings are applied; everything else stays "לא סווג" (empty subcategory).
      id: '2026-10-task-subcategories-v2',
      run() {
        const K = Storage.KEYS;
        const allowed = (cat, sub) => (TASK_SUBCATEGORIES[cat] || []).some(s => s.id === sub);
        // demo tasks: an earlier migration guessed the type alternately and the seed's activityType cycles regardless of the
        // task name, so neither is reliable. Only tasks whose NAME makes the classification unambiguous are mapped;
        // the others become "לא סווג" (empty type and subcategory).
        const SEED_CLASS = {
          t001: ['operational', 'patrol'], t002: ['operational', 'checkpoint'], t003: ['operational', 'security'],
          t004: ['operational', 'escort'], t005: ['operational', 'arrest'], t006: ['operational', 'investigation'],
          t007: ['operational', 'reinforcement'], t012: ['operational', 'checkpoint'], t014: ['administrative', 'coordination'],
          t015: ['operational', 'patrol'],
        };
        const tasks = Storage.getCollection(K.TASKS);
        tasks.forEach(t => {
          if ((t.categorySource === 'demo-migration' || t.categorySource === 'activityType') && /^t\d{3}$/.test(t.id)) {
            const c = SEED_CLASS[t.id];
            t.taskCategory = c ? c[0] : ''; t.taskSubcategory = c ? c[1] : '';
            t.categorySource = 'seed-name';
          }
          if (!t.taskSubcategory && t.taskType && allowed(t.taskCategory, t.taskType)) t.taskSubcategory = t.taskType;
          if (t.taskSubcategory && !allowed(t.taskCategory, t.taskSubcategory)) t.taskSubcategory = '';   // incompatible -> unclassified
          if (t.taskSubcategory === undefined) t.taskSubcategory = '';
        });
        Storage.setCollection(K.TASKS, tasks);

        // Hamal manages administrative entries only
        const h = Storage.getCollection(K.HAMAL_ENTRIES);
        h.forEach(e => {
          if (e.categorySource === 'demo-migration') {   // guessed alternately before — re-derive from the entry's own category
            if (allowed('administrative', e.category)) e.entryKind = 'administrative';
            else e.entryKind = 'unclassified';
            e.categorySource = 'category';
          }
          if (e.entryKind === 'administrative' && allowed('administrative', e.category)) e.subcategory = e.category;
          else if (e.subcategory === undefined) e.subcategory = '';
        });
        Storage.setCollection(K.HAMAL_ENTRIES, h);
      },
    },
    {
      // Temporary records created by earlier QA sessions (ids generated at runtime: <prefix>_m<time><rand>) are soft-deleted
      // so the presentation dataset contains only the baseline demo data. Seed data uses fixed ids (pf001, sm002 ...) and is untouched.
      // Soft delete only: nothing is destroyed. Idempotent (flagged once; re-running finds nothing left).
      id: '2026-10-qa-artifact-cleanup',
      run() {
        const K = Storage.KEYS;
        const GEN = /^(df|mslt|ce|ia|ir|r|er|cp|sv|sm|sw|tsk|doc|pf|pm|h|cs)_m[a-z0-9]{8,}$/;
        const cols = [K.DESERTER_FILES, K.MASHLAT_COORDINATIONS, K.COUNTING_ENTRIES, K.INMATE_ACTIVITIES, K.INMATE_RECURRING_ACTIVITIES, K.POLICE_REPORTS,
          K.EVENT_REPORTS, K.CANTEEN_PURCHASES, K.SURVEILLANCE_ACTIVITIES, K.STOCK_MOVEMENTS, K.SERVICE_WORK_FILES, K.TASKS, K.DOCUMENTS,
          K.PRISONER_FILES, K.PASS_PERMITS, K.HAMAL_ENTRIES, K.COUNTING_SESSIONS];
        const removed = {};
        cols.forEach(key => {
          removed[key] = new Set();
          Storage.getCollection(key).forEach(r => { if (r && GEN.test(String(r.id))) { removed[key].add(r.id); Storage.softDelete(key, r.id); } });
        });
        const dropWhere = (key, fn) => Storage.getCollection(key).forEach(r => { if (fn(r)) Storage.softDelete(key, r.id); });
        const gone = (key, id) => removed[key] && removed[key].has(id);
        dropWhere(K.CANTEEN_PURCHASE_ITEMS, i => gone(K.CANTEEN_PURCHASES, i.purchaseId));
        dropWhere(K.STOCK_MOVEMENT_ITEMS, i => gone(K.STOCK_MOVEMENTS, i.movementId) || /^sm_m[a-z0-9]{8,}/.test(String(i.id)));
        dropWhere(K.COUNTING_ENTRIES, e => gone(K.COUNTING_SESSIONS, e.sessionId));
        dropWhere(K.GACHLAT_CANDIDATES, c => gone(K.PRISONER_FILES, c.prisonerFileId));
        // a baseline stock movement approved during QA goes back to the state it was seeded in (pending)
        Storage.getCollection(K.STOCK_MOVEMENTS).forEach(m => {
          if (/^sm\d{3}$/.test(m.id) && m.status === 'approved' && m.approverName === 'משתמש מערכת') {
            Storage.getCollection(K.STOCK_MOVEMENT_ITEMS).filter(i => i.movementId === m.id || (m.items || []).indexOf(i.id) !== -1).forEach(i => Storage.upsert(K.STOCK_MOVEMENT_ITEMS, Object.assign({}, i, { approvedQty: null })));
            Storage.upsert(K.STOCK_MOVEMENTS, Object.assign({}, m, { status: 'pending', approverName: null, approverId: null, approvalDate: null }));
          }
        });
      },
    },
  ];

  function runAll() {
    list.forEach(m => { if (done().indexOf(m.id) === -1) { try { m.run(); mark(m.id); } catch (e) { console.warn('migration failed', m.id, e); } } });
  }
  return { runAll };
})();
