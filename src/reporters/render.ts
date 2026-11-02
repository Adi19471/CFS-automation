import type { AttachmentInfo, ErrorInfo, ModuleSummary, ReportData, StepInfo, TestInfoRow, TestState } from './types';
import { REPORT_CSS } from './report-styles';
import { REPORT_JS, THEME_BOOT_JS } from './report-script';

/** Renders the whole report page. Everything is escaped here; the page has no external requests. */
export function renderReport(d: ReportData): string {
  const failedish = d.tests.filter((t) => t.state === 'failed' || t.state === 'interrupted' || t.state === 'flaky');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${d.final ? '' : '<meta http-equiv="refresh" content="5">'}
<title>${esc(d.title)} · ${esc(d.run.environment)}</title>
<script>${THEME_BOOT_JS}</script>
<style>${REPORT_CSS}</style>
</head>
<body>
${header(d)}
<main class="wrap">
${overview(d)}
${d.globalErrors.length ? globalErrors(d.globalErrors) : ''}
${failedish.length ? attention(failedish, d) : ''}
${modules(d.modules)}
<div class="two-col">
${slowest(d.tests)}
${runDetails(d)}
</div>
${testList(d)}
</main>
<footer class="foot wrap">Generated ${esc(fmtDate(d.endedAt))} · Playwright ${esc(d.run.playwright)} · CFS end-to-end suite</footer>
<script>${REPORT_JS}</script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ helpers */

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return m < 60 ? `${m}m ${String(rest).padStart(2, '0')}s` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const STATE_LABEL: Record<TestState, string> = {
  passed: 'Passed',
  failed: 'Failed',
  flaky: 'Flaky',
  skipped: 'Skipped',
  interrupted: 'Interrupted',
  running: 'Running',
  queued: 'Queued',
};

/** Small inline SVG icons (stroke = currentColor). */
function icon(name: string): string {
  const paths: Record<string, string> = {
    passed: '<path d="M20 6 9 17l-5-5"/>',
    failed: '<path d="M18 6 6 18M6 6l12 12"/>',
    flaky: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    skipped: '<path d="M5 12h14"/>',
    interrupted: '<path d="M10 9v6M14 9v6"/><circle cx="12" cy="12" r="9"/>',
    running: '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>',
    queued: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    trace: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    theme: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  };
  return `<svg class="ico ico-${name}" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
}

function pill(state: TestState, notRun?: boolean): string {
  return `<span class="pill pill-${state}">${icon(state)}${notRun ? 'Not run' : STATE_LABEL[state]}</span>`;
}

/* ------------------------------------------------------------------ sections */

function header(d: ReportData): string {
  const live = !d.final
    ? `<span class="live">${icon('running')}Live · ${d.counts.passed + d.counts.failed + d.counts.flaky + d.counts.skipped} of ${d.counts.total}</span>`
    : '';
  return `<header class="top">
  <div class="wrap top-inner">
    <div class="brand">
      <span class="logo" aria-hidden="true">CFS</span>
      <div><div class="brand-title">${esc(d.title)}</div><div class="brand-sub">Container Freight Station · end-to-end UI tests</div></div>
    </div>
    <div class="top-actions">${live}<span class="env env-${esc(d.run.environment)}">${esc(d.run.environment)}</span>
      <button type="button" class="btn-icon" id="theme-toggle" title="Switch light / dark" aria-label="Switch light / dark">${icon('theme')}</button>
    </div>
  </div>
</header>`;
}

function verdict(d: ReportData): { tone: TestState; headline: string } {
  const c = d.counts;
  const failed = c.failed + c.interrupted;
  if (!d.final) return { tone: 'running', headline: `Running — ${c.passed + failed + c.flaky + c.skipped} of ${c.total} done` };
  if (c.total === 0) return { tone: 'skipped', headline: 'No tests ran' };
  if (failed) return { tone: 'failed', headline: `${plural(failed, 'test')} failed` };
  if (c.flaky) return { tone: 'flaky', headline: `Passed with ${plural(c.flaky, 'flaky test')}` };
  if (c.passed === 0) return { tone: 'skipped', headline: `All ${plural(c.total, 'test')} skipped` };
  return { tone: 'passed', headline: `All ${plural(c.passed, 'test')} passed` };
}

function donut(d: ReportData): string {
  const c = d.counts;
  const parts: [TestState, number][] = [
    ['passed', c.passed],
    ['flaky', c.flaky],
    ['failed', c.failed + c.interrupted],
    ['skipped', c.skipped],
    ['running', c.running + c.queued],
  ];
  const total = parts.reduce((s, [, n]) => s + n, 0) || 1;
  const r = 52;
  const len = 2 * Math.PI * r;
  let offset = 0;
  const arcs = parts
    .filter(([, n]) => n > 0)
    .map(([state, n]) => {
      const dash = (n / total) * len;
      const arc = `<circle class="arc arc-${state}" r="${r}" cx="64" cy="64" stroke-dasharray="${dash.toFixed(2)} ${(len - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"><title>${STATE_LABEL[state]}: ${n}</title></circle>`;
      offset += dash;
      return arc;
    })
    .join('');
  const executed = c.passed + c.flaky + c.failed + c.interrupted;
  const rate = executed ? Math.round(((c.passed + c.flaky) / executed) * 100) : 0;
  return `<svg class="donut" viewBox="0 0 128 128" width="148" height="148" role="img" aria-label="Pass rate ${rate}%">
  <circle class="arc-track" r="${r}" cx="64" cy="64"/>
  <g transform="rotate(-90 64 64)">${arcs}</g>
  <text x="64" y="62" class="donut-value">${executed ? `${rate}%` : '–'}</text>
  <text x="64" y="80" class="donut-label">pass rate</text>
</svg>`;
}

function overview(d: ReportData): string {
  const v = verdict(d);
  const c = d.counts;
  const kpi = (label: string, value: number, state: TestState | 'total', target: string) =>
    `<a class="kpi kpi-${state}" href="#tests" data-filter="${target}"><span class="kpi-value">${value}</span><span class="kpi-label">${label}</span></a>`;
  return `<section class="card hero" aria-label="Run summary">
  <div class="hero-text">
    <h1 class="verdict verdict-${v.tone}">${icon(v.tone)}${esc(v.headline)}</h1>
    <p class="hero-meta">
      <span>${icon('globe')}<a href="${esc(d.run.baseUrl)}" target="_blank" rel="noopener">${esc(d.run.baseUrl)}</a></span>
      <span>${icon('clock')}${esc(fmtDate(d.startedAt))} · ${esc(fmtMs(d.durationMs))}</span>
      <span>${esc(d.run.browsers)} · ${d.run.readOnly ? 'read-only' : 'writes allowed'}</span>
    </p>
    <div class="kpis">
      ${kpi('Total', c.total, 'total', 'all')}
      ${kpi('Passed', c.passed, 'passed', 'passed')}
      ${kpi('Failed', c.failed + c.interrupted, 'failed', 'failed')}
      ${kpi('Flaky', c.flaky, 'flaky', 'flaky')}
      ${kpi('Skipped', c.skipped, 'skipped', 'skipped')}
    </div>
    ${c.notRun ? `<p class="note">${plural(c.notRun, 'test')} did not run because a test they depend on (the sign-in setup) failed or the run stopped.</p>` : ''}
  </div>
  <div class="hero-chart">${donut(d)}</div>
</section>`;
}

function globalErrors(errors: ErrorInfo[]): string {
  return `<section class="card section" aria-labelledby="gerr-title">
  <h2 class="section-title" id="gerr-title">Run errors <span class="count count-bad">${errors.length}</span></h2>
  <p class="section-note">Errors outside any test — usually a config, setup or reporter problem.</p>
  ${errors.map(errorBlock).join('')}
</section>`;
}

function attention(tests: TestInfoRow[], d: ReportData): string {
  const items = tests
    .map((t) => {
      const shot = t.attachments.find((a) => a.contentType.startsWith('image/'));
      const trace = t.attachments.find((a) => a.name === 'trace');
      const first = t.errors[0]?.message.split('\n').slice(0, 6).join('\n') ?? '';
      return `<article class="att att-${t.state}">
  <div class="att-head">${pill(t.state)}<a class="att-title" href="#${t.anchor}" data-open="${t.anchor}">${esc([...t.describePath, t.title].join(' › '))}</a></div>
  <div class="att-sub">${esc(t.module)} · ${esc(t.file)} · ${esc(t.project)}${t.retries ? ` · ${plural(t.retries, 'retry')}` : ''}</div>
  <div class="att-body">
    ${first ? `<pre class="err-msg">${esc(first)}</pre>` : ''}
    ${shot ? `<a class="att-shot" href="${esc(shot.href)}" target="_blank" rel="noopener"><img src="${esc(shot.href)}" alt="Screenshot at failure" loading="lazy"></a>` : ''}
  </div>
  ${trace ? `<div class="att-foot">${icon('trace')}<a href="${esc(trace.href)}">trace</a> <code>npx playwright show-trace cfs-report/${esc(trace.href)}</code></div>` : ''}
</article>`;
    })
    .join('');
  return `<section class="section" id="attention" aria-labelledby="att-title">
  <h2 class="section-title" id="att-title">Needs attention <span class="count count-bad">${tests.length}</span></h2>
  <div class="att-list">${items}</div>
  ${d.final ? '' : '<p class="section-note">The run is still going; more may follow.</p>'}
</section>`;
}

function stackedBar(m: Pick<ModuleSummary, 'passed' | 'failed' | 'flaky' | 'skipped' | 'pending' | 'total'>): string {
  const total = m.total || 1;
  const seg = (state: string, n: number) => (n ? `<span class="seg seg-${state}" style="width:${((n / total) * 100).toFixed(2)}%" title="${STATE_LABEL[state as TestState]}: ${n}"></span>` : '');
  return `<div class="bar" role="img" aria-label="${m.passed} passed, ${m.failed} failed, ${m.flaky} flaky, ${m.skipped} skipped">${seg('passed', m.passed)}${seg('flaky', m.flaky)}${seg('failed', m.failed)}${seg('skipped', m.skipped)}${seg('running', m.pending)}</div>`;
}

function modules(list: ModuleSummary[]): string {
  const cards = list
    .map(
      (m) => `<a class="card module module-${m.state}" href="#tests" data-module="${esc(m.folder)}">
  <div class="module-head">${icon(m.state)}<span class="module-name">${esc(m.name)}</span><span class="module-time">${esc(fmtMs(m.durationMs))}</span></div>
  ${stackedBar(m)}
  <div class="module-counts"><span class="c-passed">${m.passed} passed</span>${m.failed ? `<span class="c-failed">${m.failed} failed</span>` : ''}${m.flaky ? `<span class="c-flaky">${m.flaky} flaky</span>` : ''}${m.skipped ? `<span class="c-skipped">${m.skipped} skipped</span>` : ''}${m.pending ? `<span class="c-running">${m.pending} to go</span>` : ''}</div>
  <div class="module-meta">${plural(m.total, 'test')} · ${plural(m.files, 'spec')}</div>
</a>`,
    )
    .join('');
  return `<section class="section" id="modules" aria-labelledby="mod-title">
  <h2 class="section-title" id="mod-title">Modules <span class="count">${list.length}</span></h2>
  <div class="module-grid">${cards}</div>
</section>`;
}

function slowest(tests: TestInfoRow[]): string {
  const top = tests
    .filter((t) => t.durationMs > 0)
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 10);
  const max = top[0]?.durationMs || 1;
  const rows = top
    .map(
      (t) => `<a class="slow-row" href="#${t.anchor}" data-open="${t.anchor}"><span class="slow-label">${esc(t.title)}<small>${esc(t.module)}</small></span><span class="slow-bar"><span style="width:${((t.durationMs / max) * 100).toFixed(1)}%"></span></span><span class="slow-time">${esc(fmtMs(t.durationMs))}</span></a>`,
    )
    .join('');
  return `<section class="card section" aria-labelledby="slow-title">
  <h2 class="card-title" id="slow-title">Slowest tests</h2>
  <div class="slow">${rows || '<p class="empty">Nothing has finished yet.</p>'}</div>
</section>`;
}

function runDetails(d: ReportData): string {
  const r = d.run;
  const rows: [string, string][] = [
    ['Environment', `${r.environment} — ${r.description}`],
    ['Address', r.baseUrl],
    ['Signed in as', r.user],
    ['Browsers', r.browsers],
    ['Projects', r.projects],
    ['Data changes', r.readOnly ? 'Read-only (@write tests skipped)' : 'Allowed (@write tests run)'],
    ['Workers · retries', `${r.workers} · ${r.retries}`],
    ['Started', fmtDate(d.startedAt)],
    ['Duration', fmtMs(d.durationMs)],
    ['Run status', d.status],
    ['Env file', r.envFile],
    ['Playwright · Node', `${r.playwright} · ${r.node}`],
    ['Platform', `${r.platform}${r.ci ? ' · CI' : ''}`],
  ];
  return `<section class="card section" aria-labelledby="run-title">
  <h2 class="card-title" id="run-title">Run details</h2>
  <dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
</section>`;
}

/* ------------------------------------------------------------------ test list */

function testList(d: ReportData): string {
  const c = d.counts;
  const chips: [string, string, number][] = [
    ['all', 'All', c.total],
    ['failed', 'Failed', c.failed + c.interrupted],
    ['flaky', 'Flaky', c.flaky],
    ['passed', 'Passed', c.passed],
    ['skipped', 'Skipped', c.skipped],
  ];
  if (!d.final) chips.push(['running', 'Running / queued', c.running + c.queued]);

  const byModule = new Map<string, TestInfoRow[]>();
  for (const t of d.tests) byModule.set(t.folder, [...(byModule.get(t.folder) ?? []), t]);
  const groups = d.modules
    .map((m) => {
      const tests = byModule.get(m.folder) ?? [];
      const byFile = new Map<string, TestInfoRow[]>();
      for (const t of tests) byFile.set(t.file, [...(byFile.get(t.file) ?? []), t]);
      const files = [...byFile.entries()]
        .map(
          ([file, list]) => `<div class="file-group" data-group>
  <div class="file-head">${icon('file')}<span>${esc(file)}</span><span class="muted">${plural(list.length, 'test')}</span></div>
  ${list.map(testRow).join('')}
</div>`,
        )
        .join('');
      return `<div class="module-group" data-group data-module="${esc(m.folder)}">
  <h3 class="module-group-title">${icon(m.state)}${esc(m.name)} <span class="muted">${plural(m.total, 'test')} · ${esc(fmtMs(m.durationMs))}</span></h3>
  ${files}
</div>`;
    })
    .join('');

  return `<section class="section" id="tests" aria-labelledby="tests-title">
  <h2 class="section-title" id="tests-title">Tests <span class="count">${c.total}</span></h2>
  <div class="card toolbar">
    <div class="chips" role="group" aria-label="Filter by result">${chips
      .map(([key, label, n]) => `<button type="button" class="chip${key === 'all' ? ' chip-on' : ''}" data-state="${key}" aria-pressed="${key === 'all'}">${esc(label)} <b>${n}</b></button>`)
      .join('')}</div>
    <select id="module-filter" aria-label="Filter by module"><option value="all">All modules</option>${d.modules.map((m) => `<option value="${esc(m.folder)}">${esc(m.name)}</option>`).join('')}</select>
    <input id="search" type="search" placeholder="Search tests, files, tags, errors…" aria-label="Search tests">
    <span class="toolbar-gap"></span>
    <button type="button" class="btn" id="expand-all">Expand all</button>
    <button type="button" class="btn" id="collapse-all">Collapse all</button>
    <span class="muted" id="shown-count" aria-live="polite"></span>
  </div>
  <div class="tests">${groups || '<p class="empty card">No tests.</p>'}</div>
</section>`;
}

function testRow(t: TestInfoRow): string {
  const search = [t.title, ...t.describePath, t.file, t.module, t.project, ...t.tags, t.errors[0]?.message.split('\n')[0] ?? '']
    .join(' ')
    .toLowerCase();
  const tags = t.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('');
  const skipReason = t.annotations.find((a) => a.type === 'skip' || a.type === 'fixme')?.description;
  const otherNotes = t.annotations.filter((a) => a.type !== 'skip' && a.type !== 'fixme' && a.description);
  const crumbs = t.describePath.length ? `<span class="crumbs">${esc(t.describePath.join(' › '))} › </span>` : '';
  return `<details class="t-row t-${t.state}" id="${t.anchor}" data-state="${t.state === 'interrupted' ? 'failed' : t.state === 'queued' ? 'running' : t.state}" data-module="${esc(t.folder)}" data-search="${esc(search)}">
  <summary>
    ${pill(t.state, t.notRun)}
    <span class="t-title">${crumbs}${esc(t.title)}</span>
    <span class="t-meta">${tags}<span class="tag tag-project">${esc(t.project)}</span>${t.retries ? `<span class="tag tag-retry">retry ${t.retries}</span>` : ''}<span class="t-time">${t.durationMs ? esc(fmtMs(t.durationMs)) : ''}</span></span>
  </summary>
  <div class="t-body">
    <div class="t-loc">${esc(t.file)}${t.location.startsWith('tests/') ? '' : ` · declared at ${esc(t.location)}`}${t.startedAt ? ` · started ${esc(fmtDate(t.startedAt))}` : ''}${typeof t.workerIndex === 'number' ? ` · worker ${t.workerIndex}` : ''}</div>
    ${t.notRun ? '<p class="note">Did not run — a test it depends on (such as the sign-in setup) failed first, or the run was stopped.</p>' : ''}
    ${skipReason ? `<p class="note">Skipped: ${esc(skipReason)}</p>` : ''}
    ${otherNotes.map((a) => `<p class="note"><b>${esc(a.type)}</b> ${esc(a.description)}</p>`).join('')}
    ${t.errors.map(errorBlock).join('')}
    ${t.steps.length ? `<div class="block"><div class="block-title">Steps</div>${stepsList(t.steps)}</div>` : ''}
    ${t.attachments.length ? attachmentsBlock(t.attachments) : ''}
    ${t.stdout.length ? `<div class="block"><div class="block-title">Console output</div><pre class="out">${esc(t.stdout.join('\n'))}</pre></div>` : ''}
    ${t.stderr.length ? `<div class="block"><div class="block-title">Error output</div><pre class="out out-err">${esc(t.stderr.join('\n'))}</pre></div>` : ''}
  </div>
</details>`;
}

function errorBlock(e: ErrorInfo): string {
  return `<div class="error">
  <pre class="err-msg">${esc(e.message)}</pre>
  ${e.snippet ? `<pre class="code">${esc(e.snippet)}</pre>` : ''}
  ${e.location ? `<div class="err-loc">at ${esc(e.location)}</div>` : ''}
</div>`;
}

function stepsList(steps: StepInfo[]): string {
  return `<ol class="steps">${steps
    .map(
      (s) => `<li class="step${s.error ? ' step-error' : ''}"><div class="step-row">${icon(s.error ? 'failed' : 'passed')}<span class="step-title">${esc(s.title)}</span><span class="step-time">${esc(fmtMs(s.durationMs))}</span></div>${
        s.error ? `<div class="step-err">${esc(s.error)}</div>` : ''
      }${s.steps.length ? stepsList(s.steps) : ''}</li>`,
    )
    .join('')}</ol>`;
}

function attachmentsBlock(list: AttachmentInfo[]): string {
  const images = list.filter((a) => a.contentType.startsWith('image/'));
  const videos = list.filter((a) => a.contentType.startsWith('video/'));
  const texts = list.filter((a) => a.text !== undefined);
  const files = list.filter((a) => !images.includes(a) && !videos.includes(a) && !texts.includes(a));
  return `<div class="block"><div class="block-title">Attachments</div>
  ${images.length ? `<div class="shots">${images.map((a) => `<a class="shot" href="${esc(a.href)}" target="_blank" rel="noopener"><img src="${esc(a.href)}" alt="${esc(a.name)}" loading="lazy"><span>${esc(a.name)}</span></a>`).join('')}</div>` : ''}
  ${videos.map((a) => `<video class="video" controls preload="none" src="${esc(a.href)}"></video>`).join('')}
  ${texts.map((a) => `<div class="text-att"><div class="text-att-name">${icon('file')}${esc(a.name)}</div><pre class="out">${esc(a.text ?? '')}</pre></div>`).join('')}
  ${files.length ? `<div class="files">${files.map((a) => `<a class="file" href="${esc(a.href)}">${icon(a.name === 'trace' ? 'trace' : a.contentType.startsWith('video/') ? 'video' : 'file')}${esc(a.name)} <small>${esc(fmtBytes(a.size))}</small></a>${a.name === 'trace' ? `<code class="hint">npx playwright show-trace cfs-report/${esc(a.href)}</code>` : ''}`).join('')}</div>` : ''}
</div>`;
}
