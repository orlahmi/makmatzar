/* users-management.js — admin-only user management */
'use strict';

window.Pages = window.Pages || {};

Pages['users-management'] = function(query) {
  const content = Utils.el('page-content');
  if (!Permissions.can('manageUsers')) { content.innerHTML = EmptyState.accessDenied(); return; }

  function getData() {
    return Storage.getCollection(Storage.KEYS.USERS);
  }

  function renderPage() {
    const users = getData();

    content.innerHTML = `
      <div class="page-wrapper">
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">${Utils.icon('user', 24)} ניהול משתמשים</h1>
            <p class="page-subtitle">${users.length} משתמשים במערכת</p>
          </div>
          <div class="page-header-actions">
            <span class="demo-indicator">${Utils.icon('lock', 12)} ניהול משתמשים — הדגמה בלבד</span>
          </div>
        </div>

        <div class="demo-notice card" style="margin-bottom:var(--space-4);border:2px solid var(--color-warning)">
          <div class="card-body" style="padding:var(--space-3)">
            <div style="display:flex;gap:8px;align-items:center">
              ${Utils.icon('alert', 16)}
              <span style="font-size:var(--font-size-sm)">
                <strong>הערה:</strong> זוהי מערכת הדגמה. בסביבת ייצור, ניהול משתמשים יכלול: אימות זהות, ניהול סיסמאות מוצפנות, ניהול הרשאות מורחב, תיעוד פעולות ניהוליות, ואינטגרציה עם מנהל זהויות ארגוני.
              </span>
            </div>
          </div>
        </div>

        <div class="data-table-wrap">
          <div id="users-table"></div>
        </div>
      </div>
    `;

    DataTable.create({
      containerId: 'users-table',
      data: users,
      rowKey: 'id',
      columns: [
        { key: 'username', label: 'שם משתמש', tdClass: 'td-id' },
        { key: 'firstName', label: 'שם פרטי' },
        { key: 'lastName', label: 'שם משפחה' },
        { key: 'role', label: 'תפקיד', render: v => {
          const roleNames = {
            officer: 'שוטר', commander: 'קצין', hamal_commander: 'מפקד חמ"ל',
            guard: 'סוהר', investigator: 'חוקר', admin: 'מנהל',
            canteen_worker: 'עובד קנטינה', incarceration_admin: 'מנהל כליאה', viewer: 'צופה'
          };
          return `<span class="badge badge-info">${Utils.escHtml(roleNames[v] || v)}</span>`;
        }},
        { key: 'rank', label: 'דרגה', render: v => { const r = RANK_MAP && RANK_MAP[v]; return r ? Utils.escHtml(r.label) : '—'; } },
        { key: 'militaryNumber', label: 'מ"א', tdClass: 'td-id' },
        { key: 'primaryBaseId', label: 'בסיס', render: v => { const b = BASE_MAP && BASE_MAP[v]; return b ? Utils.escHtml(b.shortName) : '—'; } },
        { key: 'active', label: 'סטטוס', render: v => v ? '<span class="badge badge-success">פעיל</span>' : '<span class="badge badge-danger">לא פעיל</span>' },
        { key: 'lastLogin', label: 'כניסה אחרונה', render: v => v ? Utils.formatDateTime(v) : 'לא נכנס' },
      ],
      actions: (row) => `
        <button class="row-action-btn" onclick="window.viewUser('${row.id}')" title="פרטים">${Utils.icon('view', 14)}</button>
        <button class="row-action-btn" onclick="window.toggleUserActive('${row.id}')" title="${row.active ? 'השבת' : 'הפעל'}">${Utils.icon(row.active ? 'lock' : 'unlock', 14)}</button>
      `,
      emptyMessage: 'אין משתמשים',
    });

    window.viewUser = (id) => {
      const user = getData().find(u => u.id === id);
      if (!user) return;
      const roleNames = {
        officer: 'שוטר', commander: 'קצין', hamal_commander: 'מפקד חמ"ל',
        guard: 'סוהר', investigator: 'חוקר', admin: 'מנהל',
        canteen_worker: 'עובד קנטינה', incarceration_admin: 'מנהל כליאה', viewer: 'צופה'
      };
      const authBases = (user.authorizedBases || []).map(bid => {
        const b = BASE_MAP && BASE_MAP[bid];
        return b ? b.name : bid;
      }).join(', ');
      Modal.open({
        title: `פרטי משתמש — ${user.username}`,
        size: 'lg',
        body: `
          <div class="info-list">
            <div class="info-list-row"><div class="info-list-label">שם מלא</div><div>${Utils.escHtml(user.firstName + ' ' + user.lastName)}</div></div>
            <div class="info-list-row"><div class="info-list-label">שם משתמש</div><div>${Utils.escHtml(user.username)}</div></div>
            <div class="info-list-row"><div class="info-list-label">תפקיד</div><div>${Utils.escHtml(roleNames[user.role] || user.role)}</div></div>
            <div class="info-list-row"><div class="info-list-label">מספר אישי</div><div>${Utils.escHtml(user.militaryNumber || '—')}</div></div>
            <div class="info-list-row"><div class="info-list-label">דרגה</div><div>${user.rank && RANK_MAP && RANK_MAP[user.rank] ? Utils.escHtml(RANK_MAP[user.rank].label) : '—'}</div></div>
            <div class="info-list-row"><div class="info-list-label">בסיס ראשי</div><div>${user.primaryBaseId && BASE_MAP && BASE_MAP[user.primaryBaseId] ? Utils.escHtml(BASE_MAP[user.primaryBaseId].name) : '—'}</div></div>
            <div class="info-list-row"><div class="info-list-label">בסיסים מורשים</div><div>${authBases || '—'}</div></div>
            <div class="info-list-row"><div class="info-list-label">אימייל</div><div>${Utils.escHtml(user.email || '—')}</div></div>
            <div class="info-list-row"><div class="info-list-label">טלפון</div><div>${Utils.escHtml(user.phone || '—')}</div></div>
            <div class="info-list-row"><div class="info-list-label">כניסה אחרונה</div><div>${user.lastLogin ? Utils.formatDateTime(user.lastLogin) : 'לא נכנס'}</div></div>
            <div class="info-list-row"><div class="info-list-label">סטטוס</div><div>${user.active ? '<span class="badge badge-success">פעיל</span>' : '<span class="badge badge-danger">לא פעיל</span>'}</div></div>
          </div>
          <div class="demo-notice" style="margin-top:12px;font-size:var(--font-size-xs);color:var(--color-text-muted)">
            * בסביבת ייצור: אפשרות לאיפוס סיסמה, עריכת הרשאות, היסטוריית כניסות, ועוד.
          </div>
        `,
      });
    };

    window.toggleUserActive = async (id) => {
      const user = getData().find(u => u.id === id);
      if (!user) return;
      const action = user.active ? 'השבת' : 'הפעל';
      const ok = await Modal.confirm({ title: `${action} משתמש`, message: `האם ל${action} את ${user.firstName} ${user.lastName}?`, type: user.active ? 'danger' : 'success' });
      if (!ok) return;
      user.active = !user.active;
      user.updatedAt = new Date().toISOString();
      Storage.upsert(Storage.KEYS.USERS, user);
      Audit.log({ module: 'system', action: 'update', entityType: 'user', entityId: id, description: `${action} משתמש ${user.username}` });
      Toast.success(`המשתמש ${user.active ? 'הופעל' : 'הושבת'}`);
      renderPage();
    };
  }

  renderPage();
};
