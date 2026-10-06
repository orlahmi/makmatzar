/* document-service.js — one canonical document record per uploaded file, linked to a PERSON (not copied between files).
 * A document keeps its provenance (sourceModule + sourceRecordId); any file of the same person (deserter file,
 * prisoner file) resolves the documents through personId. */
'use strict';

window.DocumentService = (function() {
  const KEY = () => Storage.KEYS.DOCUMENTS;
  const MAX_BYTES = 300 * 1024;   // demo storage is localStorage — keep single files small

  const TYPES = { vsr: 'וס״ר', medical: 'מסמך רפואי', other: 'מסמך אחר' };
  const SOURCES = { deserter: 'תיק עריק', prisoner: 'תיק כלוא' };

  function typeLabel(t) { return TYPES[t] || 'מסמך אחר'; }

  function forPerson(personId, types) {
    if (!personId) return [];
    return Storage.getCollection(KEY())
      .filter(d => d.personId === personId && (!types || types.indexOf(d.docType) !== -1))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }
  function vsrFor(personId) { return forPerson(personId, ['vsr']); }

  function sourceInfo(d) {
    const label = SOURCES[d.sourceModule] || '—';
    let rec = '';
    if (d.sourceModule === 'deserter') { const f = Storage.getById(Storage.KEYS.DESERTER_FILES, d.sourceRecordId); rec = f ? (f.fileNumber || '') : ''; }
    if (d.sourceModule === 'prisoner') { const f = Storage.getById(Storage.KEYS.PRISONER_FILES, d.sourceRecordId); rec = f ? (f.fileNumber || '') : ''; }
    return { label, rec };
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const rd = new FileReader();
      rd.onload = () => resolve(rd.result);
      rd.onerror = () => reject(new Error('read'));
      rd.readAsDataURL(file);
    });
  }

  // returns { ok, error, doc }
  async function add(opts) {
    const { personId, sourceModule, sourceRecordId, docType, file } = opts;
    if (!personId) return { ok: false, error: 'לא ניתן לשייך מסמך — חסר אדם בתיק' };
    if (!file) return { ok: false, error: 'יש לבחור קובץ' };
    if (file.size > MAX_BYTES) return { ok: false, error: 'הקובץ גדול מדי (עד ' + Math.round(MAX_BYTES / 1024) + 'KB בגרסת ההדגמה)' };
    const name = (opts.name || file.name || '').trim();
    if (!name) return { ok: false, error: 'יש להזין שם מסמך' };
    const dup = forPerson(personId).find(d => d.docType === docType && d.fileName === file.name && d.size === file.size);
    if (dup) return { ok: false, error: 'מסמך זהה כבר קיים אצל אדם זה (' + typeLabel(dup.docType) + ', מקור: ' + sourceInfo(dup).label + ')' };
    const person = Storage.getById(Storage.KEYS.PEOPLE, personId);
    let dataUrl;
    try { dataUrl = await readFile(file); } catch (e) { return { ok: false, error: 'קריאת הקובץ נכשלה' }; }
    const user = window.Auth && Auth.getCurrentUser && Auth.getCurrentUser();
    const doc = {
      id: 'doc_' + Utils.generateId(),
      personId,
      militaryNumber: person ? person.militaryNumber : '',
      sourceModule, sourceRecordId,
      docType,
      name,
      fileName: file.name,
      mimeType: file.type || '',
      size: file.size,
      dataUrl,
      uploadedBy: user ? (user.firstName + ' ' + user.lastName) : '',
      createdAt: new Date().toISOString(),
    };
    Storage.upsert(KEY(), doc);
    if (!Storage.getById(KEY(), doc.id)) return { ok: false, error: 'השמירה נכשלה — אין מקום פנוי באחסון הדפדפן' };
    if (window.Audit) Audit.log({ module: sourceModule === 'deserter' ? 'investigation' : 'incarceration', action: 'create', entityType: 'document', entityId: doc.id, description: 'העלאת ' + typeLabel(docType) + ': ' + name });
    return { ok: true, doc };
  }

  function remove(id) { Storage.softDelete(KEY(), id); }

  function open(id) {
    const d = Storage.getById(KEY(), id);
    if (!d || !d.dataUrl) { Toast.error('המסמך אינו זמין'); return; }
    try {
      const parts = d.dataUrl.split(',');
      const mime = (parts[0].match(/:(.*?);/) || [])[1] || d.mimeType || 'application/octet-stream';
      const bin = atob(parts[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: mime }));
      window.open(url, '_blank');
    } catch (e) { Toast.error('לא ניתן לפתוח את המסמך'); }
  }

  function fmtSize(n) { return n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B'; }

  // documents table. opts.removableModule — documents created in this module can be removed from here
  function table(docs, opts) {
    opts = opts || {};
    if (!docs.length) return '<div class="empty-state-desc">' + (opts.empty || 'אין מסמכים.') + '</div>';
    return '<table class="data-table"><thead><tr><th>שם מסמך</th><th>סוג מסמך</th><th>תאריך העלאה</th><th>מקור</th><th>הועלה ע״י</th><th></th></tr></thead><tbody>' +
      docs.map(d => {
        const s = sourceInfo(d);
        const canRm = opts.removableModule && d.sourceModule === opts.removableModule && opts.canEdit;
        const link = d.sourceModule === 'deserter' && opts.linkDeserter ? '<a href="#/deserter-file?id=' + Utils.escHtml(d.sourceRecordId) + '" style="color:var(--color-primary)">' + Utils.escHtml(s.label) + (s.rec ? ' ' + Utils.escHtml(s.rec) : '') + '</a>'
          : Utils.escHtml(s.label) + (s.rec ? ' ' + Utils.escHtml(s.rec) : '');
        return '<tr><td>' + Utils.escHtml(d.name) + '<div style="font-size:11px;color:var(--color-text-muted)">' + Utils.escHtml(d.fileName || '') + ' · ' + fmtSize(d.size || 0) + '</div></td>' +
          '<td><span class="badge ' + (d.docType === 'vsr' ? 'badge-info' : 'badge-draft') + '">' + Utils.escHtml(typeLabel(d.docType)) + '</span></td>' +
          '<td>' + (d.createdAt ? Utils.formatDate(d.createdAt) : '—') + '</td>' +
          '<td>' + link + '</td>' +
          '<td>' + Utils.escHtml(d.uploadedBy || '—') + '</td>' +
          '<td style="white-space:nowrap"><button class="row-action-btn" title="צפייה" onclick="DocumentService.open(\'' + d.id + '\')">' + Utils.icon('view', 14) + '</button>' +
          (canRm ? '<button class="row-action-btn danger" title="הסרה" onclick="DocumentService.removeWithConfirm(\'' + d.id + '\')">' + Utils.icon('trash', 14) + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  async function removeWithConfirm(id) {
    const ok = await Modal.confirm({ title: 'הסרת מסמך', message: 'האם להסיר את המסמך? הפעולה תסיר אותו מכל התיקים של האדם.', type: 'danger', confirmLabel: 'הסר' });
    if (!ok) return;
    remove(id);
    Toast.success('המסמך הוסר');
    if (window._docRefresh) window._docRefresh();
  }

  // upload dialog. opts: personId, sourceModule, sourceRecordId, types:[docType...], title, onDone
  function uploadModal(opts) {
    const types = opts.types && opts.types.length ? opts.types : ['other'];
    Modal.open({
      title: opts.title || 'העלאת מסמך',
      body: '<div class="form-row form-row-2">' +
        '<div class="form-group"><label class="form-label">סוג מסמך <span class="required">*</span></label><select id="doc-type" class="form-control">' +
        types.map(t => '<option value="' + t + '">' + Utils.escHtml(typeLabel(t)) + '</option>').join('') + '</select></div>' +
        '<div class="form-group"><label class="form-label">שם מסמך <span class="required">*</span></label><input id="doc-name" class="form-control" placeholder="לדוגמה: וס״ר — שם האדם"></div></div>' +
        '<div class="form-group"><label class="form-label">קובץ <span class="required">*</span></label><input type="file" id="doc-file" class="form-control"><div style="font-size:12px;color:var(--color-text-muted);margin-top:4px">עד 300KB בגרסת ההדגמה. ניתן להעלות PDF או תמונה.</div></div>',
      footer: '<button class="btn btn-secondary" onclick="Modal.close()">ביטול</button><button class="btn btn-primary" id="doc-save">העלה</button>',
    });
    const fileEl = Utils.el('doc-file');
    fileEl.onchange = () => { const nm = Utils.el('doc-name'); if (!nm.value && fileEl.files[0]) nm.value = fileEl.files[0].name.replace(/\.[^.]+$/, ''); };
    Utils.el('doc-save').onclick = async () => {
      const btn = Utils.el('doc-save'); btn.disabled = true;
      const r = await add({ personId: opts.personId, sourceModule: opts.sourceModule, sourceRecordId: opts.sourceRecordId, docType: Utils.el('doc-type').value, name: Utils.el('doc-name').value, file: fileEl.files[0] });
      btn.disabled = false;
      if (!r.ok) { Toast.error(r.error); return; }
      Modal.close();
      Toast.success('המסמך הועלה');
      if (opts.onDone) opts.onDone(r.doc);
    };
  }

  return { TYPES, SOURCES, typeLabel, forPerson, vsrFor, sourceInfo, add, remove, open, table, uploadModal, removeWithConfirm };
})();
