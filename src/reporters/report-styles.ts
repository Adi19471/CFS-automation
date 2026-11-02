/** Styles of the CFS HTML report — neutral surfaces, colour only for results. */
const LIGHT = `
  --bg: #f5f6f8; --surface: #ffffff; --surface-2: #f0f2f5; --border: #dde1e7; --border-strong: #c3c6d7;
  --text: #1b1f24; --muted: #5b6573; --accent: #2f5bea; --accent-bg: #eff4ff;
  --passed: #1a7f37; --passed-bg: #e7f5ec; --failed: #c62828; --failed-bg: #fdecec;
  --flaky: #946200; --flaky-bg: #fff3d4; --skipped: #6b7280; --skipped-bg: #eef0f3;
  --running: #1f6feb; --running-bg: #e7f0ff; --code-bg: #f6f8fa; --shadow: 0 1px 2px rgba(16,24,40,.06);
`;
const DARK = `
  --bg: #0f1115; --surface: #171a20; --surface-2: #1d2129; --border: #2b313b; --border-strong: #3a4250;
  --text: #e6e9ee; --muted: #9aa4b2; --accent: #8aa6ff; --accent-bg: #1b2440;
  --passed: #4ac26b; --passed-bg: #12301d; --failed: #ff7b72; --failed-bg: #3a1716;
  --flaky: #e3b341; --flaky-bg: #33280c; --skipped: #9aa4b2; --skipped-bg: #23272f;
  --running: #58a6ff; --running-bg: #102a4a; --code-bg: #12151b; --shadow: none;
`;

export const REPORT_CSS = `
:root { ${LIGHT} color-scheme: light; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${DARK} color-scheme: dark; } }
:root[data-theme="dark"] { ${DARK} color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { background: var(--bg); color: var(--text); font: 14px/1.5 "Inter", "Segoe UI", system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
code, pre { font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace; font-size: 12.5px; }
.wrap { max-width: 1320px; margin: 0 auto; padding: 0 20px; }
.muted { color: var(--muted); font-weight: 400; }
.ico { flex: none; vertical-align: -3px; }

/* top bar */
.top { background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 5; }
.top-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 60px; }
.brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.logo { display: inline-grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: var(--text); color: var(--surface); font-weight: 800; font-size: 12px; letter-spacing: .04em; }
.brand-title { font-weight: 700; font-size: 16px; }
.brand-sub { color: var(--muted); font-size: 12.5px; }
.top-actions { display: flex; align-items: center; gap: 10px; }
.env { text-transform: uppercase; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; padding: 4px 10px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); }
.env-production { background: var(--failed-bg); color: var(--failed); border-color: transparent; }
.env-uat { background: var(--flaky-bg); color: var(--flaky); border-color: transparent; }
.live { display: inline-flex; align-items: center; gap: 6px; color: var(--running); font-weight: 600; font-size: 12.5px; }
.live .ico { animation: spin 1.2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.btn-icon, .btn { border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 8px; cursor: pointer; font: inherit; }
.btn-icon { width: 34px; height: 34px; display: inline-grid; place-items: center; }
.btn { padding: 6px 12px; font-size: 13px; }
.btn:hover, .btn-icon:hover { background: var(--surface-2); }

main.wrap { padding-top: 20px; padding-bottom: 32px; display: flex; flex-direction: column; gap: 20px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); }
.section-title { font-size: 16px; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
.card-title { font-size: 14px; margin: 0 0 12px; }
.section.card { padding: 18px 20px; }
.section-note, .note { color: var(--muted); margin: 6px 0; font-size: 13px; }
.count { font-size: 12px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--surface-2); color: var(--muted); }
.count-bad { background: var(--failed-bg); color: var(--failed); }
.empty { color: var(--muted); padding: 12px; margin: 0; }

/* hero */
.hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 22px 24px; }
.hero-text { min-width: 0; flex: 1; }
.verdict { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 24px; letter-spacing: -.01em; }
.verdict .ico { width: 26px; height: 26px; padding: 4px; border-radius: 50%; }
.verdict-passed .ico { color: var(--passed); background: var(--passed-bg); }
.verdict-failed .ico { color: var(--failed); background: var(--failed-bg); }
.verdict-flaky .ico { color: var(--flaky); background: var(--flaky-bg); }
.verdict-skipped .ico { color: var(--skipped); background: var(--skipped-bg); }
.verdict-running .ico { color: var(--running); background: var(--running-bg); animation: spin 1.2s linear infinite; }
.hero-meta { display: flex; flex-wrap: wrap; gap: 6px 18px; color: var(--muted); margin: 8px 0 16px; font-size: 13px; }
.hero-meta span { display: inline-flex; align-items: center; gap: 6px; min-width: 0; overflow-wrap: anywhere; }
.kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; max-width: 720px; }
.kpi { display: flex; flex-direction: column; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); }
.kpi:hover { text-decoration: none; border-color: var(--border-strong); }
.kpi-value { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }
.kpi-label { font-size: 12px; color: var(--muted); }
.kpi-passed .kpi-value { color: var(--passed); } .kpi-failed .kpi-value { color: var(--failed); }
.kpi-flaky .kpi-value { color: var(--flaky); } .kpi-skipped .kpi-value { color: var(--skipped); }
.donut .arc-track { fill: none; stroke: var(--surface-2); stroke-width: 14; }
.donut .arc { fill: none; stroke-width: 14; }
.arc-passed { stroke: var(--passed); } .arc-failed { stroke: var(--failed); } .arc-flaky { stroke: var(--flaky); }
.arc-skipped { stroke: var(--border-strong); } .arc-running { stroke: var(--running); }
.donut-value { font-size: 24px; font-weight: 700; text-anchor: middle; fill: var(--text); }
.donut-label { font-size: 11px; text-anchor: middle; fill: var(--muted); }

/* pills, tags */
.pill { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 2px 9px 2px 7px; border-radius: 999px; white-space: nowrap; }
.pill .ico { width: 13px; height: 13px; }
.pill-passed { color: var(--passed); background: var(--passed-bg); }
.pill-failed, .pill-interrupted { color: var(--failed); background: var(--failed-bg); }
.pill-flaky { color: var(--flaky); background: var(--flaky-bg); }
.pill-skipped { color: var(--skipped); background: var(--skipped-bg); }
.pill-running, .pill-queued { color: var(--running); background: var(--running-bg); }
.tag { font-size: 11.5px; padding: 1px 7px; border-radius: 6px; background: var(--surface-2); border: 1px solid var(--border); color: var(--muted); white-space: nowrap; }
.tag-retry { color: var(--flaky); }

/* needs attention */
.att-list { display: flex; flex-direction: column; gap: 10px; }
.att { background: var(--surface); border: 1px solid var(--border); border-left: 4px solid var(--failed); border-radius: 10px; padding: 12px 16px; }
.att-flaky { border-left-color: var(--flaky); }
.att-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
.att-title { font-weight: 600; color: var(--text); overflow-wrap: anywhere; }
.att-sub { color: var(--muted); font-size: 12.5px; margin: 4px 0 8px; }
.att-body { display: flex; gap: 14px; align-items: flex-start; }
.att-body .err-msg { flex: 1; min-width: 0; margin: 0; }
.att-shot img { width: 240px; max-width: 30vw; border-radius: 8px; border: 1px solid var(--border); display: block; }
.att-foot { margin-top: 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12.5px; }

/* modules */
.module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
.module { padding: 14px 16px; color: var(--text); display: flex; flex-direction: column; gap: 8px; }
.module:hover { text-decoration: none; border-color: var(--border-strong); }
.module-head { display: flex; align-items: center; gap: 8px; }
.module-name { font-weight: 600; flex: 1; min-width: 0; }
.module-time { color: var(--muted); font-size: 12px; }
.module-passed .module-head .ico { color: var(--passed); } .module-failed .module-head .ico { color: var(--failed); }
.module-flaky .module-head .ico { color: var(--flaky); } .module-skipped .module-head .ico { color: var(--skipped); }
.module-running .module-head .ico { color: var(--running); }
.module-counts { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12.5px; }
.module-meta { color: var(--muted); font-size: 12px; }
.c-passed { color: var(--passed); } .c-failed { color: var(--failed); font-weight: 600; } .c-flaky { color: var(--flaky); }
.c-skipped { color: var(--skipped); } .c-running { color: var(--running); }
.bar { display: flex; height: 8px; border-radius: 999px; overflow: hidden; background: var(--surface-2); }
.seg { display: block; height: 100%; }
.seg-passed { background: var(--passed); } .seg-failed { background: var(--failed); } .seg-flaky { background: var(--flaky); }
.seg-skipped { background: var(--border-strong); } .seg-running { background: var(--running); }

/* slowest + run details */
.two-col { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 20px; }
.slow { display: flex; flex-direction: column; gap: 6px; }
.slow-row { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) 70px; gap: 10px; align-items: center; color: var(--text); padding: 3px 0; }
.slow-row:hover { text-decoration: none; background: var(--surface-2); }
.slow-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.slow-label small { color: var(--muted); margin-left: 6px; }
.slow-bar { height: 8px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.slow-bar span { display: block; height: 100%; background: var(--muted); opacity: .55; border-radius: 999px; }
.slow-time { text-align: right; font-variant-numeric: tabular-nums; color: var(--muted); font-size: 12.5px; }
.kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px 16px; margin: 0; font-size: 13px; }
.kv dt { color: var(--muted); }
.kv dd { margin: 0; overflow-wrap: anywhere; }

/* toolbar + tests */
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 999px; padding: 4px 12px; font: inherit; font-size: 13px; cursor: pointer; }
.chip b { font-weight: 600; color: var(--muted); margin-left: 2px; }
.chip-on { background: var(--accent-bg); border-color: var(--accent); color: var(--accent); }
.chip-on b { color: var(--accent); }
#module-filter, #search { font: inherit; font-size: 13px; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; }
#search { min-width: 240px; flex: 1; max-width: 380px; }
.toolbar-gap { flex: 1; }
.module-group { margin-bottom: 18px; }
.module-group-title { display: flex; align-items: center; gap: 8px; font-size: 15px; margin: 0 0 8px; }
.file-group { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
.file-head { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--surface-2); border-bottom: 1px solid var(--border); font-size: 12.5px; font-weight: 600; }
.file-head .muted { margin-left: auto; }
.t-row { border-bottom: 1px solid var(--border); }
.t-row:last-child { border-bottom: 0; }
.t-row > summary { display: flex; align-items: center; gap: 10px; padding: 8px 14px; cursor: pointer; list-style: none; }
.t-row > summary::-webkit-details-marker { display: none; }
.t-row > summary:hover { background: var(--surface-2); }
.t-row[open] > summary { background: var(--surface-2); }
.t-title { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.crumbs { color: var(--muted); }
.t-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.t-time { color: var(--muted); font-size: 12.5px; font-variant-numeric: tabular-nums; min-width: 60px; text-align: right; }
.t-body { padding: 10px 16px 16px; display: flex; flex-direction: column; gap: 12px; }
.t-loc { color: var(--muted); font-size: 12.5px; }
.block-title { font-weight: 600; font-size: 12.5px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 6px; }
.error { border: 1px solid var(--failed-bg); border-left: 3px solid var(--failed); border-radius: 8px; padding: 10px 12px; background: var(--surface); }
.err-msg { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; color: var(--failed); background: transparent; }
.code, .out { white-space: pre; overflow: auto; background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin: 8px 0 0; max-height: 360px; }
.out { white-space: pre-wrap; overflow-wrap: anywhere; }
.out-err { color: var(--failed); }
.err-loc { color: var(--muted); font-size: 12px; margin-top: 6px; }
.steps { list-style: none; margin: 0; padding-left: 0; }
.steps .steps { padding-left: 22px; border-left: 1px dashed var(--border); margin-left: 7px; }
.step-row { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.step-row .ico { color: var(--passed); }
.step-error > .step-row .ico, .step-error > .step-row .step-title { color: var(--failed); }
.step-title { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.step-time { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.step-err { color: var(--failed); font-size: 12.5px; margin: 0 0 4px 24px; overflow-wrap: anywhere; }
.shots { display: flex; flex-wrap: wrap; gap: 10px; }
.shot { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
.shot img { width: 280px; max-width: 100%; border-radius: 8px; border: 1px solid var(--border); }
.video { width: 480px; max-width: 100%; border-radius: 8px; border: 1px solid var(--border); margin-top: 8px; display: block; }
.files { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 8px; }
.file { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; }
.file small { color: var(--muted); }
.hint { color: var(--muted); font-size: 12px; }
.text-att { margin-top: 8px; }
.text-att-name { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); }
.foot { color: var(--muted); font-size: 12px; padding-top: 8px; padding-bottom: 24px; }
[hidden] { display: none !important; }

@media (max-width: 900px) {
  .two-col { grid-template-columns: 1fr; }
  .hero { flex-direction: column-reverse; align-items: flex-start; }
  .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .att-body { flex-direction: column; }
  .att-shot img { max-width: 100%; width: 100%; }
}
@media (max-width: 560px) {
  .wrap { padding: 0 16px; }
  .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .t-row > summary { flex-wrap: wrap; }
  .t-meta { justify-content: flex-start; }
  #search { min-width: 0; max-width: none; width: 100%; }
  .slow-row { grid-template-columns: minmax(0, 1fr) 64px; }
  .slow-bar { display: none; }
}
@media print {
  .top { position: static; }
  .toolbar, #theme-toggle { display: none; }
  .t-row { break-inside: avoid; }
}
`;
