/* not-found.js — 404 page */
'use strict';

window.Pages = window.Pages || {};

Pages['not-found'] = function(query) {
  const content = Utils.el('page-content');
  content.innerHTML = `
    <div class="page-wrapper" style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <div style="text-align:center;max-width:400px">
        <div style="font-size:72px;margin-bottom:16px;opacity:0.3">404</div>
        <h2 style="font-size:var(--font-size-xl);margin-bottom:8px">הדף לא נמצא</h2>
        <p style="color:var(--color-text-muted);margin-bottom:24px">הכתובת שחיפשת אינה קיימת במערכת.</p>
        <button class="btn btn-primary" onclick="Router.navigate('/dashboard')">חזרה לדשבורד</button>
      </div>
    </div>
  `;
};
