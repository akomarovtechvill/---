/* Собирает panel/index.html (режимы) и panel/escalation.html (эскалация): страница, стили, модель и код в одном файле.
   Запуск: node panel/build.js */
const fs = require('fs');
const path = require('path');
const M = require('../model/ips-model.js');

const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const common = `
.side .chips{gap:6px}
.pnav{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.pnav a,.pnav span{font:500 13px var(--font-body);padding:5px 12px;border:1px solid var(--line);border-radius:999px;color:var(--fg);text-decoration:none;background:var(--surface)}
.pnav span{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.pnav a:hover{background:var(--sel)}
`;
const modesCss = `
#sm .tr.lock path.ln{stroke:var(--danger);stroke-dasharray:6 4}
#sm .tr.lock .badge circle{stroke:var(--danger)}
#sm .node.comp rect{fill:var(--comp);stroke:var(--line)}
#sm .node.comp.on rect{stroke:var(--muted)}
#sm .junc{fill:var(--fg)}
.scheme-only header,.scheme-only .controls,.scheme-only .side,.scheme-only .refblock,.scheme-only footer{display:none}
.scheme-only .wrap{padding:0;max-width:none}
.scheme-only .main{display:block}
.scheme-only figure.diagram{border:0;border-radius:0}
.scheme-only #sm{min-width:0}
`;
const escCss = `
#es{display:block;width:100%;min-width:900px;height:auto}
@media (min-width:1200px){#es{min-width:0}}
#es text{font-family:var(--font-body)}
#es .bx rect{fill:var(--surface);stroke:var(--fg);stroke-width:1.4}
#es .bx.src rect{fill:var(--comp);stroke:var(--line)}
#es .bx.duty rect{stroke-width:2.4}
#es .bx.second rect{stroke-dasharray:4 3;stroke:var(--muted)}
#es .nname{font-size:15px;font-weight:600;fill:var(--fg);text-anchor:middle}
#es .bx.duty .nname{font-size:16px}
#es .nstat{font-size:12px;fill:var(--muted);text-anchor:middle}
#es .lk path{fill:none;stroke-linejoin:round}
#es .lk path.halo{stroke:var(--surface);stroke-width:6}
#es .lk path.ln{stroke:var(--fg);stroke-width:1.5}
#es .lk.dash path.ln,#es .lk.aux path.ln{stroke-dasharray:6 4}
#es .lk.aux path.ln{stroke:var(--muted)}
#es .lbl{font-size:12px;fill:var(--muted);text-anchor:middle}
#es .lbl.start{text-anchor:start}
#es .mk-fg{fill:var(--fg)} #es .mk-muted{fill:var(--muted)} #es .mk-p{fill:var(--pause)}
#es .bx,#es .lk{transition:opacity .15s}
#es .bx{cursor:pointer}
#es .bx:focus{outline:none}
#es .bx:focus-visible rect{stroke-width:3.2}
#es.has-sel .bx:not(.on):not(.p):not(.s){opacity:.25}
#es.has-sel .lk:not(.on):not(.p):not(.s){opacity:.12}
#es .bx.cur rect{stroke-width:3.2}
#es .bx.p rect{fill:var(--pause-bg);stroke:var(--pause);stroke-width:2.6}
#es .bx.s rect{fill:var(--part-bg);stroke:var(--part);stroke-width:1.8;stroke-dasharray:6 4}
#es .lk.p path.ln{stroke:var(--pause);stroke-width:3;stroke-dasharray:none}
#es .lk.s path.ln{stroke:var(--part);stroke-width:2.2;stroke-dasharray:6 4}
#es .lk.on path.ln{stroke-width:2.6}
.dot{font-style:normal;font-weight:700;font-size:15px;line-height:1}
.dot.p{color:var(--pause)} .dot.s{color:var(--part)}
.legend .dot{margin-right:2px}
.lgline .lp{stroke:var(--pause);stroke-width:3}
.lgline .ls{stroke:var(--part);stroke-width:2.2;stroke-dasharray:6 4}
#tmx{min-width:1240px}
#tmx tbody tr{cursor:pointer}
#tmx tbody tr:hover td,#tmx tbody tr.sel td{background:var(--sel)}
#tmx td.c{text-align:center;vertical-align:middle}
.rc .dot{margin-right:2px}
@media (prefers-reduced-motion: reduce){#es .bx,#es .lk{transition:none}}
`;
const out = (name, html) => { fs.writeFileSync(path.join(__dirname, name), html); console.log(`panel/${name} собран,`, html.length, 'символов'); };
out('index.html', src('page.html')
  .replace('/*CSS*/', () => src('style.css') + common + modesCss)
  .replace('/*MODEL*/', () => JSON.stringify(M))
  .replace('/*JS*/', () => src('app.js')));
out('escalation.html', src('escalation.html')
  .replace('/*CSS*/', () => src('style.css') + common + escCss)
  .replace('/*ESC*/', () => JSON.stringify(M.esc))
  .replace('/*JS*/', () => src('esc.js')));
