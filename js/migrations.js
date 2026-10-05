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
  ];

  function runAll() {
    list.forEach(m => { if (done().indexOf(m.id) === -1) { try { m.run(); mark(m.id); } catch (e) { console.warn('migration failed', m.id, e); } } });
  }
  return { runAll };
})();
