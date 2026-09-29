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
  ];

  function runAll() {
    list.forEach(m => { if (done().indexOf(m.id) === -1) { try { m.run(); mark(m.id); } catch (e) { console.warn('migration failed', m.id, e); } } });
  }
  return { runAll };
})();
