/**
 * Scripts of the CFS HTML report. The page works without them; they add the
 * theme toggle, the result / module / text filters and expand-all, and keep the
 * filters across the live report's refreshes. Storage may be blocked (file://,
 * private windows), so every read and write is guarded.
 */

/** Runs in <head> so a saved dark/light choice applies before the first paint. */
export const THEME_BOOT_JS = `(function(){try{var t=localStorage.getItem('cfs-report-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export const REPORT_JS = `(function () {
  var root = document.documentElement;
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  var toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.addEventListener('click', function () {
    var current = root.getAttribute('data-theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('cfs-report-theme', next); } catch (e) {}
  });

  var rows = Array.prototype.slice.call(document.querySelectorAll('.t-row'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('[data-group]'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-state]'));
  var moduleSelect = document.getElementById('module-filter');
  var search = document.getElementById('search');
  var shown = document.getElementById('shown-count');

  var state = store.get('cfs-state') || 'all';
  var mod = store.get('cfs-module') || 'all';
  var query = store.get('cfs-query') || '';

  function apply() {
    var count = 0;
    var q = query.trim().toLowerCase();
    rows.forEach(function (r) {
      var ok = (state === 'all' || r.getAttribute('data-state') === state) &&
               (mod === 'all' || r.getAttribute('data-module') === mod) &&
               (!q || (r.getAttribute('data-search') || '').indexOf(q) >= 0);
      r.hidden = !ok;
      if (ok) count++;
    });
    groups.forEach(function (g) { g.hidden = !g.querySelector('.t-row:not([hidden])'); });
    chips.forEach(function (c) {
      var on = c.getAttribute('data-state') === state;
      c.classList.toggle('chip-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (moduleSelect) moduleSelect.value = mod;
    if (search && search.value !== query) search.value = query;
    if (shown) shown.textContent = count === rows.length ? '' : count + ' of ' + rows.length + ' shown';
    store.set('cfs-state', state); store.set('cfs-module', mod); store.set('cfs-query', query);
  }

  chips.forEach(function (c) { c.addEventListener('click', function () { state = c.getAttribute('data-state'); apply(); }); });
  if (moduleSelect) moduleSelect.addEventListener('change', function () { mod = moduleSelect.value; apply(); });
  if (search) search.addEventListener('input', function () { query = search.value; apply(); });

  // KPI tiles and module cards set a filter and jump to the list.
  Array.prototype.slice.call(document.querySelectorAll('[data-filter]')).forEach(function (a) {
    a.addEventListener('click', function () { state = a.getAttribute('data-filter'); mod = 'all'; apply(); });
  });
  Array.prototype.slice.call(document.querySelectorAll('a.module[data-module]')).forEach(function (a) {
    a.addEventListener('click', function () { mod = a.getAttribute('data-module'); state = 'all'; apply(); });
  });

  function openRow(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.hidden) { state = 'all'; mod = 'all'; query = ''; apply(); }
    el.open = true;
  }
  Array.prototype.slice.call(document.querySelectorAll('[data-open]')).forEach(function (a) {
    a.addEventListener('click', function () { openRow(a.getAttribute('data-open')); });
  });
  if (location.hash) openRow(location.hash.slice(1));

  var expand = document.getElementById('expand-all');
  var collapse = document.getElementById('collapse-all');
  if (expand) expand.addEventListener('click', function () { rows.forEach(function (r) { if (!r.hidden) r.open = true; }); });
  if (collapse) collapse.addEventListener('click', function () { rows.forEach(function (r) { r.open = false; }); });

  apply();
})();`;
