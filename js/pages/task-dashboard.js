/* task-dashboard.js — full-page task detail and management dashboard v2
   ROOT CAUSE OF TAB BUG:
   Previous version used class="tab-btn" which Mashlat.js targets via
   Utils.delegate(content, '.tab-btn', ...) — that listener persists on the
   content DOM element after navigation and overrides task tabs.
   FIX: tabs use [data-task-tab] inside .td-tabs; click handler is scoped to
   .td-tabs with stopPropagation; NEVER calls Router.navigate(). */
'use strict';

window.Pages = window.Pages || {};

Pages['task-dashboard'] = function(query) {
  var content = Utils.el('page-content');
  if (!Permissions.hasModuleAccess('policing')) { content.innerHTML = EmptyState.accessDenied(); return; }

  var taskId = query && query.id;
  var task   = taskId ? Storage.getById(Storage.KEYS.TASKS, taskId) : null;

  if (!task) {
    content.innerHTML =
      '<div class="page-wrapper">' +
        Utils.pageHeader('משימה לא נמצאה', Utils.pageMeta()) +
        '<div class="empty-state">' +
          '<div class="empty-state-icon">' + Utils.icon('report', 32) + '</div>' +
          '<div class="empty-state-title">המשימה לא נמצאה</div>' +
          '<div class="empty-state-desc">מזהה משימה לא קיים במערכת.</div>' +
          '<button type="button" class="btn btn-secondary" onclick="Router.navigate(\'/tasks\')">חזרה לרשימה</button>' +
        '</div>' +
        Utils.classificationFooter() +
      '</div>';
    return;
  }

  /* LOCAL tab state — never touches the router */
  var activeTab = 'summary';

  var people = Storage.getCollection(Storage.KEYS.PEOPLE);
  var pMap   = {};
  people.forEach(function(p) { pMap[p.id] = p; });

  /* ── helpers ─────────────────────────────────────────────────── */
  function reloadTask() {
    var fresh = Storage.getById(Storage.KEYS.TASKS, taskId);
    if (fresh) task = fresh;
  }

  function rankLabel(rankId) {
    return (RANK_MAP && RANK_MAP[rankId]) ? RANK_MAP[rankId].label : (rankId || '—');
  }

  /* ── full page render ────────────────────────────────────────── */
  function render() {
    reloadTask();

    var tabDefs = [
      { id: 'summary',      label: 'סיכום כללי'  },
      { id: 'participants', label: 'משתתפים'      },
      { id: 'equipment',    label: 'ציוד'          },
      { id: 'log',          label: 'יומן משימה'   },
    ];

    /* Build tab bar — no "tab-btn" class; uses data-task-tab */
    var tabBarHtml =
      '<div class="td-tabs" style="display:flex;gap:0;border-bottom:2px solid var(--color-border);margin-bottom:var(--space-4)">' +
        tabDefs.map(function(t) {
          var on = activeTab === t.id;
          return '<button type="button" data-task-tab="' + t.id + '"' +
            ' style="background:none;border:none;cursor:pointer;padding:10px 20px;font-size:14px;' +
            'font-family:inherit;font-weight:' + (on ? '600' : '400') + ';' +
            'color:' + (on ? 'var(--color-primary,#1e40af)' : 'var(--color-text-muted)') + ';' +
            'border-bottom:' + (on ? '2px solid var(--color-primary,#1e40af)' : '2px solid transparent') + ';' +
            'margin-bottom:-2px;transition:color .15s">' +
            Utils.escHtml(t.label) +
          '</button>';
        }).join('') +
      '</div>';

    content.innerHTML =
      '<div class="page-wrapper">' +

        /* ── header ── */
        '<div style="margin-bottom:var(--space-4)">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="td-back-btn" style="margin-bottom:8px">' +
            Utils.icon('x', 13) + ' חזרה לרשימת משימות' +
          '</button>' +
          '<h1 style="font-size:22px;font-weight:700;margin:0 0 6px 0">' + Utils.escHtml(task.name) + '</h1>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px">' +
            StatusBadge.render(task.status) + ' ' + StatusBadge.renderPriority(task.priority) + ' ' + (task.taskCategory === 'operational' ? '<span class="badge badge-danger">מבצעי</span>' : task.taskCategory === 'administrative' ? '<span class="badge badge-info">מנהלתי</span>' : '') + ' ' + (taskSubcategoryLabel(task.taskCategory, task.taskSubcategory) ? '<span class="badge badge-draft">' + taskSubcategoryLabel(task.taskCategory, task.taskSubcategory) + '</span>' : '<span class="badge badge-draft">לא סווג</span>') +
            '<span style="color:var(--color-text-muted)">דף ניהול וריכוז נתונים למשימה מס׳ ' + Utils.escHtml(task.taskNumber || taskId) + '</span>' +
            (Permissions.can('createTask')
              ? '<button type="button" class="btn btn-secondary btn-sm" id="td-edit-btn" style="margin-right:auto">' +
                  Utils.icon('edit', 13) + ' עריכה</button>'
              : '') +
          '</div>' +
        '</div>' +

        /* ── tabs ── */
        tabBarHtml +

        /* ── tab content ── */
        '<div id="td-tab-content">' + renderTabContent() + '</div>' +

        Utils.classificationFooter() +
      '</div>';

    attachPageEvents();
  }

  /* ── page-level events (back, edit, TAB SWITCHING) ──────────── */
  function attachPageEvents() {
    var backBtn = Utils.el('td-back-btn');
    if (backBtn) backBtn.onclick = function() { Router.navigate('/tasks'); };

    var editBtn = Utils.el('td-edit-btn');
    if (editBtn) editBtn.onclick = function() { Router.navigate('/add-task', { edit: taskId }); };

    /* Tab clicks — scoped to .td-tabs, stopPropagation prevents Mashlat
       delegate from intercepting and hijacking the click */
    var tabBar = content.querySelector('.td-tabs');
    if (tabBar) {
      tabBar.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-task-tab]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();           /* critical — prevents Mashlat delegate */

        activeTab = btn.getAttribute('data-task-tab');

        /* Update tab button styles in-place */
        tabBar.querySelectorAll('[data-task-tab]').forEach(function(b) {
          var on = b.getAttribute('data-task-tab') === activeTab;
          b.style.color       = on ? 'var(--color-primary,#1e40af)' : 'var(--color-text-muted)';
          b.style.borderBottom= on ? '2px solid var(--color-primary,#1e40af)' : '2px solid transparent';
          b.style.fontWeight  = on ? '600' : '400';
        });

        /* Swap content only — never navigate */
        var tc = Utils.el('td-tab-content');
        if (tc) { tc.innerHTML = renderTabContent(); attachTabEvents(); }
      });
    }

    attachTabEvents();
  }

  /* ── tab content dispatcher ──────────────────────────────────── */
  function renderTabContent() {
    switch (activeTab) {
      case 'participants': return renderParticipantsTab();
      case 'equipment':    return renderEquipmentTab();
      case 'log':          return renderLogTab();
      default:             return renderSummaryTab();
    }
  }

  /* ══ TAB 1 — סיכום כללי ═══════════════════════════════════════ */
  function renderSummaryTab() {
    var participants = task.participants || [];
    var equipment    = task.equipment   || [];

    var cards = [
      { icon: 'person',   label: 'סה"כ משתתפים', value: String(participants.length)                                     },
      { icon: 'report',   label: 'פריטי ציוד',   value: String(equipment.length)                                        },
      { icon: 'calendar', label: 'זמן משוער',     value: task.estimatedDuration ? Utils.escHtml(task.estimatedDuration) : '—' },
      { icon: 'prison',   label: 'מיקום',         value: task.location          ? Utils.escHtml(task.location)          : '—' },
    ];

    return (
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3);margin-bottom:var(--space-4)">' +
        cards.map(function(c) {
          return '<div class="card" style="padding:var(--space-4);text-align:center">' +
            '<div style="color:var(--color-primary);margin-bottom:6px">' + Utils.icon(c.icon, 22) + '</div>' +
            '<div style="font-size:28px;font-weight:700;line-height:1.1;margin-bottom:4px">' + c.value + '</div>' +
            '<div style="font-size:12px;color:var(--color-text-muted)">' + c.label + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header"><div class="card-title">פרטי המשימה</div></div>' +
        '<div class="card-body">' +
          '<div class="info-list">' +
            '<div class="info-item"><div class="info-label">מספר משימה</div><div class="info-value" style="font-family:monospace">' + Utils.escHtml(task.taskNumber || '—') + '</div></div>' +
            '<div class="info-item"><div class="info-label">תאריך</div><div class="info-value">' + Utils.formatDate(task.date) + '</div></div>' +
            '<div class="info-item"><div class="info-label">שעת התחלה</div><div class="info-value">' + Utils.escHtml(task.time || '—') + '</div></div>' +
            '<div class="info-item"><div class="info-label">סוג פעילות</div><div class="info-value">' + Utils.escHtml(task.activityType || '—') + '</div></div>' +
            '<div class="info-item"><div class="info-label">אחראי</div><div class="info-value">' + Utils.escHtml(task.commanderName || task.commander || '—') + '</div></div>' +
            '<div class="info-item"><div class="info-label">יחידה</div><div class="info-value">' + Utils.escHtml(task.assignedUnit || '—') + '</div></div>' +
            '<div class="info-item"><div class="info-label">עדיפות</div><div class="info-value">' + StatusBadge.renderPriority(task.priority) + '</div></div>' +
            '<div class="info-item"><div class="info-label">סטטוס</div><div class="info-value">' + StatusBadge.render(task.status) + '</div></div>' +
            (task.description
              ? '<div class="info-item" style="flex-direction:column;align-items:flex-start;gap:4px"><div class="info-label">תיאור</div><div class="info-value" style="white-space:pre-line;width:100%">' + Utils.escHtml(task.description) + '</div></div>'
              : '') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ══ TAB 2 — משתתפים ══════════════════════════════════════════ */
  function renderParticipantsTab() {
    var ids  = task.participants || [];
    var rows = ids.map(function(pid, idx) {
      var p = pMap[pid];
      return {
        idx:    idx + 1,
        id:     pid,
        milNum: p ? p.militaryNumber : pid,
        name:   p ? (p.firstName + ' ' + p.lastName) : '—',
        rank:   p ? rankLabel(p.rank) : '—',
        unit:   p ? (p.unit || p.assignedUnit || '—') : '—',
      };
    });

    var addBtn = Permissions.can('createTask')
      ? '<button type="button" id="td-add-participant" class="btn btn-primary">' + Utils.icon('plus', 14) + ' הוסף משתתף</button>'
      : '';

    var tableRows = rows.length
      ? rows.map(function(r) {
          return '<tr>' +
            '<td style="font-family:monospace;font-size:12px">' + Utils.escHtml(r.milNum) + '</td>' +
            '<td><span class="cell-primary">' + Utils.escHtml(r.name) + '</span></td>' +
            '<td>' + Utils.escHtml(r.rank) + '</td>' +
            '<td>' + Utils.escHtml(r.unit) + '</td>' +
            '<td><span style="color:var(--color-text-muted);font-size:12px">—</span></td>' +
            '<td><span class="badge badge-active"><span class="badge-dot"></span>פעיל</span></td>' +
            (Permissions.can('createTask')
              ? '<td><button type="button" class="row-action-btn danger td-remove-participant" data-pid="' + r.id + '">' + Utils.icon('trash', 13) + '</button></td>'
              : '') +
          '</tr>';
        }).join('')
      : '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">אין משתתפים</td></tr>';

    return (
      '<div class="table-panel">' +
        '<div class="table-panel-header">' +
          '<span>רשימת משתתפים</span>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<span style="font-size:12px;color:var(--color-text-muted)">' + rows.length + ' רשומות</span>' +
            addBtn +
          '</div>' +
        '</div>' +
        '<div style="overflow-x:auto"><table class="data-table"><thead><tr>' +
          '<th>מ"א</th><th>שם מלא</th><th>דרגה</th><th>יחידה</th><th>תפקיד במשימה</th><th>סטטוס</th>' +
          (Permissions.can('createTask') ? '<th></th>' : '') +
        '</tr></thead><tbody>' + tableRows + '</tbody></table></div>' +
      '</div>'
    );
  }

  /* ══ TAB 3 — ציוד ═════════════════════════════════════════════ */
  function renderEquipmentTab() {
    var items = task.equipment || [];

    var addBtn = Permissions.can('createTask')
      ? '<button type="button" id="td-add-equipment" class="btn btn-primary">' + Utils.icon('plus', 14) + ' הוסף ציוד</button>'
      : '';

    var tableRows = items.length
      ? items.map(function(item, idx) {
          var label = typeof item === 'string' ? item : (item.label || item.type || String(item));
          var eqId  = typeof item === 'object' ? (item.id || '—') : '—';
          return '<tr>' +
            '<td>' + Utils.escHtml(label) + '</td>' +
            '<td style="font-family:monospace;font-size:12px;color:var(--color-text-muted)">' + Utils.escHtml(eqId) + '</td>' +
            '<td style="color:var(--color-text-muted)">—</td>' +
            '<td style="color:var(--color-text-muted)">—</td>' +
            '<td><span class="badge badge-approved"><span class="badge-dot"></span>זמין</span></td>' +
            (Permissions.can('createTask')
              ? '<td><button type="button" class="row-action-btn danger td-remove-equipment" data-idx="' + idx + '">' + Utils.icon('trash', 13) + '</button></td>'
              : '') +
          '</tr>';
        }).join('')
      : '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">אין ציוד</td></tr>';

    return (
      '<div class="table-panel">' +
        '<div class="table-panel-header">' +
          '<span>רשימת ציוד</span>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<span style="font-size:12px;color:var(--color-text-muted)">' + items.length + ' פריטים</span>' +
            addBtn +
          '</div>' +
        '</div>' +
        '<div style="overflow-x:auto"><table class="data-table"><thead><tr>' +
          '<th>סוג ציוד</th><th>מזהה ציוד</th><th>חתום ע"י</th><th>מ"א חתום</th><th>סטטוס</th>' +
          (Permissions.can('createTask') ? '<th></th>' : '') +
        '</tr></thead><tbody>' + tableRows + '</tbody></table></div>' +
      '</div>'
    );
  }

  /* ══ TAB 4 — יומן משימה ═══════════════════════════════════════ */
  function renderLogTab() {
    var log    = task.log || [];
    var sorted = log.slice().sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });

    var addBtn = Permissions.can('createTask')
      ? '<button type="button" id="td-add-log" class="btn btn-primary">' + Utils.icon('plus', 14) + ' הוסף אירוע</button>'
      : '';

    var tableRows = sorted.length
      ? sorted.map(function(e, idx) {
          var ts   = e.timestamp || '';
          var date = ts ? Utils.formatDate(ts.slice(0, 10)) : '—';
          var time = ts.length > 10 ? ts.slice(11, 16) : '—';
          return '<tr>' +
            '<td class="td-number">' + (sorted.length - idx) + '</td>' +
            '<td>' + date + '</td>' +
            '<td>' + Utils.escHtml(time) + '</td>' +
            '<td>' + Utils.escHtml(e.description || '—') + '</td>' +
          '</tr>';
        }).join('')
      : '<tr><td colspan="4" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">אין אירועים</td></tr>';

    return (
      '<div class="table-panel">' +
        '<div class="table-panel-header">' +
          '<span>יומן משימה</span>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<span style="font-size:12px;color:var(--color-text-muted)">' + log.length + ' אירועים</span>' +
            addBtn +
          '</div>' +
        '</div>' +
        '<div style="overflow-x:auto"><table class="data-table"><thead><tr>' +
          '<th style="width:50px">מס"ד</th><th>תאריך</th><th>שעה</th><th>סטטוס / תיאור אירוע</th>' +
        '</tr></thead><tbody>' + tableRows + '</tbody></table></div>' +
      '</div>'
    );
  }

  /* ── tab-specific event wiring (called after every content swap) */
  function attachTabEvents() {
    var tc = Utils.el('td-tab-content');
    if (!tc) return;

    /* Add participant */
    var addP = Utils.el('td-add-participant');
    if (addP) addP.onclick = openAddParticipantModal;

    /* Remove participant */
    tc.querySelectorAll('.td-remove-participant').forEach(function(btn) {
      btn.onclick = function(e) { e.stopPropagation(); removeParticipant(btn.getAttribute('data-pid')); };
    });

    /* Add equipment */
    var addE = Utils.el('td-add-equipment');
    if (addE) addE.onclick = openAddEquipmentModal;

    /* Remove equipment */
    tc.querySelectorAll('.td-remove-equipment').forEach(function(btn) {
      btn.onclick = function(e) { e.stopPropagation(); removeEquipment(parseInt(btn.getAttribute('data-idx'), 10)); };
    });

    /* Add log */
    var addL = Utils.el('td-add-log');
    if (addL) addL.onclick = openAddLogModal;
  }

  /* ── helpers that refresh only the content area ──────────────── */
  function refreshTabContent() {
    reloadTask();
    var tc = Utils.el('td-tab-content');
    if (tc) { tc.innerHTML = renderTabContent(); attachTabEvents(); }
  }

  /* ══ MODALS ════════════════════════════════════════════════════ */

  function openAddParticipantModal() {
    var current   = task.participants || [];
    var available = people.filter(function(p) { return !current.includes(p.id); });
    if (!available.length) { Toast.error('אין חיילים נוספים להוסיף'); return; }

    Modal.open({
      title: 'הוסף משתתף',
      size:  'sm',
      body:
        '<div class="form-group"><label class="form-label">בחר חייל</label>' +
        '<select id="td-participant-sel" class="form-control">' +
        available.map(function(p) {
          return '<option value="' + p.id + '">' +
            Utils.escHtml(rankLabel(p.rank) + ' ' + p.firstName + ' ' + p.lastName + ' — ' + p.militaryNumber) +
          '</option>';
        }).join('') +
        '</select></div>',
      footer:
        '<button type="button" class="btn btn-secondary" onclick="Modal.close()">ביטול</button>' +
        '<button type="button" class="btn btn-primary" id="td-confirm-add-participant">הוסף</button>',
    });

    setTimeout(function() {
      var btn = Utils.el('td-confirm-add-participant');
      if (!btn) return;
      btn.onclick = function() {
        var sel = Utils.el('td-participant-sel');
        if (!sel || !sel.value) return;
        var updated = Object.assign({}, task, {
          participants: current.concat([sel.value]),
          updatedAt:    new Date().toISOString(),
        });
        Storage.upsert(Storage.KEYS.TASKS, updated);
        task = updated;
        Modal.close();
        Toast.success('משתתף נוסף');
        refreshTabContent();
      };
    }, 60);
  }

  function removeParticipant(pid) {
    var updated = Object.assign({}, task, {
      participants: (task.participants || []).filter(function(id) { return id !== pid; }),
      updatedAt:    new Date().toISOString(),
    });
    Storage.upsert(Storage.KEYS.TASKS, updated);
    task = updated;
    Toast.success('משתתף הוסר');
    refreshTabContent();
  }

  function openAddEquipmentModal() {
    Modal.open({
      title: 'הוסף ציוד',
      size:  'sm',
      body:
        '<div class="form-group"><label class="form-label">סוג ציוד <span class="required">*</span></label>' +
        '<input type="text" id="td-eq-type" class="form-control" placeholder="שם הפריט"></div>' +
        '<div class="form-group"><label class="form-label">מזהה ציוד <span class="required">*</span></label>' +
        '<input type="text" id="td-eq-id" class="form-control" placeholder="מספר זיהוי הציוד"></div>',
      footer:
        '<button type="button" class="btn btn-secondary" onclick="Modal.close()">ביטול</button>' +
        '<button type="button" class="btn btn-primary" id="td-confirm-add-equipment">הוסף</button>',
    });

    setTimeout(function() {
      var btn = Utils.el('td-confirm-add-equipment');
      if (!btn) return;
      btn.onclick = function() {
        var typeEl = Utils.el('td-eq-type');
        var idEl   = Utils.el('td-eq-id');
        var label  = typeEl ? typeEl.value.trim() : '';
        var eqId   = idEl  ? idEl.value.trim()   : '';
        if (!label) { Toast.error('הזן סוג ציוד'); return; }
        if (!eqId) { Toast.error('הזן מזהה ציוד'); return; }
        var newItem = { label: label, id: eqId };
        var updated = Object.assign({}, task, {
          equipment: (task.equipment || []).concat([newItem]),
          updatedAt: new Date().toISOString(),
        });
        Storage.upsert(Storage.KEYS.TASKS, updated);
        task = updated;
        Modal.close();
        Toast.success('ציוד נוסף');
        refreshTabContent();
      };
    }, 60);
  }

  function removeEquipment(idx) {
    var items = (task.equipment || []).slice();
    items.splice(idx, 1);
    var updated = Object.assign({}, task, { equipment: items, updatedAt: new Date().toISOString() });
    Storage.upsert(Storage.KEYS.TASKS, updated);
    task = updated;
    Toast.success('פריט הוסר');
    refreshTabContent();
  }

  function openAddLogModal() {
    var user = Auth.getCurrentUser();
    var now  = new Date();
    var hhmm = now.toTimeString().slice(0, 5);

    Modal.open({
      title: 'הוסף אירוע ליומן',
      size:  'sm',
      body:
        '<div class="form-row form-row-2">' +
        '<div class="form-group"><label class="form-label">תאריך <span class="required">*</span></label>' +
        '<input type="date" id="td-log-date" class="form-control" value="' + Utils.today() + '" required></div>' +
        '<div class="form-group"><label class="form-label">שעה <span class="required">*</span></label>' +
        '<input type="time" id="td-log-time" class="form-control" value="' + hhmm + '" required></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">תיאור / סטטוס <span class="required">*</span></label>' +
        '<textarea id="td-log-desc" class="form-control" rows="3" placeholder="תאר את האירוע..."></textarea></div>',
      footer:
        '<button type="button" class="btn btn-secondary" onclick="Modal.close()">ביטול</button>' +
        '<button type="button" class="btn btn-primary" id="td-confirm-add-log">הוסף</button>',
    });

    setTimeout(function() {
      var btn = Utils.el('td-confirm-add-log');
      if (!btn) return;
      btn.onclick = function() {
        var dateEl = Utils.el('td-log-date');
        var timeEl = Utils.el('td-log-time');
        var descEl = Utils.el('td-log-desc');
        var desc   = descEl ? descEl.value.trim() : '';
        var dateStr = (dateEl && dateEl.value) ? dateEl.value : '';
        var timeStr = (timeEl && timeEl.value) ? timeEl.value : '';
        if (!dateStr) { Toast.error('יש לבחור תאריך'); return; }
        if (!timeStr) { Toast.error('יש לבחור שעה'); return; }
        if (!desc) { Toast.error('הזן תיאור האירוע'); return; }
        var ts      = dateStr + 'T' + timeStr + ':00';
        var entry   = {
          timestamp:   ts,
          description: desc,
          author:      user ? (user.firstName + ' ' + user.lastName) : 'מערכת',
        };
        var updated = Object.assign({}, task, {
          log:       (task.log || []).concat([entry]),
          updatedAt: new Date().toISOString(),
        });
        Storage.upsert(Storage.KEYS.TASKS, updated);
        task = updated;
        Modal.close();
        Toast.success('אירוע נרשם ביומן');
        Audit.log({ module: 'policing', action: 'update', entityType: 'task', entityId: taskId,
          description: 'רשומת יומן נוספה למשימה ' + task.taskNumber });
        refreshTabContent();
      };
    }, 60);
  }

  render();
};
