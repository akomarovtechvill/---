/* Панель режимов пиццемата. M — модель из model/ips-model.js, вставляется при сборке */
const NS = 'http://www.w3.org/2000/svg';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
function el(tag, attrs, parent){
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function txt(parent, x, y, cls, s){
  const t = el('text', {x, y, class: cls}, parent);
  t.textContent = s;
  return t;
}

const MODES = Object.fromEntries(M.modes.map(m => [m.id, m]));
const par = id => id.indexOf('.') > 0 ? id.slice(0, id.indexOf('.')) : null;
const rel = (list, id) => list.some(x => x === '*' || x === id || x === par(id) || par(x) === id);
const tid = n => 'T-' + String(n).padStart(2, '0');
const TM = Object.fromEntries(M.trans.map(t => [t.n, t]));
const label = t => t.fromL + ' → ' + t.toL;
const KIND = {human:'действие человека на месте', auto:'автоматически', remote:'автоматически или удаленно', lock:'блокировка продаж'};

/* Геометрия схемы, единицы viewBox 1300 x 800 */
const COMPS = [
  {id:'M-03', x:40, y:230, w:420, h:300, tx:60, ty:516},
  {id:'M-05', x:800, y:230, w:420, h:300, tx:820, ty:516},
  {id:'M-04', x:40, y:610, w:1180, h:170, tx:60, ty:766}
];
const NODES = [
  {id:'OFF', x:40, y:50, w:190, h:70},
  {id:'M-01', x:330, y:50, w:220, h:70},
  {id:'M-02', x:660, y:50, w:280, h:70},
  {id:'M-03.1', x:80, y:270, w:340, h:70},
  {id:'M-03.2', x:80, y:400, w:340, h:70},
  {id:'M-05.1', x:840, y:270, w:340, h:70},
  {id:'M-05.2', x:840, y:400, w:340, h:70},
  {id:'M-04.1', x:90, y:650, w:300, h:70},
  {id:'M-04.2', x:480, y:650, w:300, h:70},
  {id:'M-04.3', x:870, y:650, w:300, h:70}
];
const PSEUDO = [{t:18, x:40, y:150, w:190, h:30, label:'Из любого режима'}];
/* p — ломаные, b — центры номеров, na — номера ломаных без стрелки (примыкание к другой линии) */
const EDGES = [
  {t:18, p:[[[135,150],[135,120]]], b:[]},
  {t:1, p:[[[230,85],[330,85]]], b:[[280,85]]},
  {t:2, p:[[[550,72],[660,72]]], b:[[605,72]]},
  {t:4, p:[[[660,100],[550,100]], [[1150,230],[1150,150],[620,150],[620,100]]], b:[[605,100],[1060,150]], na:[1]},
  {t:3, p:[[[500,120],[500,190],[1250,190],[1250,300],[1220,300]]], b:[[1110,190]]},
  {t:14, p:[[[940,62],[1282,62],[1282,700],[1220,700]]], b:[[1282,420]]},
  {t:12, p:[[[1180,435],[1205,435],[1205,85],[940,85]]], b:[[1205,260]]},
  {t:5, p:[[[680,120],[680,295],[420,295]]], b:[[550,295]]},
  {t:7, p:[[[710,120],[710,428],[420,428]]], b:[[560,428]]},
  {t:11, p:[[[840,455],[420,455]]], b:[[625,455]]},
  {t:6, p:[[[460,505],[750,505],[750,120]]], b:[[750,250]]},
  {t:10, p:[[[780,120],[780,435],[840,435]]], b:[[780,350]]},
  {t:8, p:[[[870,120],[870,270]]], b:[[870,222]]},
  {t:9, p:[[[930,270],[930,120]]], b:[[930,222]]},
  {t:13, p:[[[250,530],[250,610]], [[1010,530],[1010,610]]], b:[[250,570],[1010,570]]},
  {t:15, p:[[[390,685],[480,685]], [[780,685],[870,685]]], b:[[435,685],[825,685]], both:true},
  {t:16, p:[[[40,700],[12,700],[12,22],[760,22],[760,50]]], b:[[12,420]]},
  {t:17, p:[[[40,740],[27,740],[27,38],[420,38],[420,50]]], b:[[27,560]]}
];
const NG = Object.fromEntries(NODES.map(n => [n.id, n]));
const pathD = pts => 'M' + pts.map(p => p.join(',')).join(' L');

/* Слои: [категория цвета, подпись на схеме] */
const LAYERS = {
  hub:{name:'Статус для хаба', cat:{
    'OFF':['none','Нет связи'], 'M-01':['off','Нет связи, затем недоступен'], 'M-02':['ok','Доступен или 409 с причиной'],
    'M-03.1':['off','Недоступен'], 'M-03.2':['off','Недоступен'], 'M-04.1':['off','Недоступен'], 'M-04.2':['off','Недоступен'], 'M-04.3':['off','Недоступен'],
    'M-05.1':['off','Недоступен, machine_blocked'], 'M-05.2':['off','Недоступен, oven_blocked']},
    legend:[['ok','Доступен'],['off','Недоступен: /health online:false или 409'],['none','Нет связи']],
    info:'Хаб смотрит GET /health и хартбит iplaysmart/status. online:true — можно передавать заказ. Отказ в приеме приходит ответом 409 с причиной.'},
  plat:{name:'Статус платформы', cat:{
    'OFF':['none','online:false по Will'], 'M-01':['part','online после сессии MQTTS'], 'M-02':['ok','online:true'],
    'M-03.1':['ok','online:true'], 'M-03.2':['ok','online:true'], 'M-04.1':['ok','online:true'], 'M-04.2':['ok','online:true'], 'M-04.3':['ok','online:true'],
    'M-05.1':['part','online:true, событие блокировки'], 'M-05.2':['part','online:true, блокирующее событие']},
    legend:[['ok','Сессия MQTTS жива'],['part','Сессия жива, есть блокировка или идет запуск'],['none','Нет сессии']],
    info:'В RB Monitoring online означает живую сессию MQTTS, а не готовность к заказу. Поэтому в M-03 и M-04 аппарат на платформе зеленый, хотя заказы не принимает. Готовность — в слое «Статус для хаба».'},
  time:{name:'Учет времени', cat:{
    'OFF':['none','Организационный в часы работы'], 'M-01':['part','Как у режима входа'], 'M-02':['ok','Рабочее или по причинам П1'],
    'M-03.1':['pause','Плановый простой'], 'M-03.2':['off','Внеплановый простой'], 'M-04.1':['pause','Плановый простой'], 'M-04.2':['off','Внеплановый простой'], 'M-04.3':['pause','Плановый простой'],
    'M-05.1':['off','Внеплановый простой'], 'M-05.2':['off','Внеплановый простой']},
    legend:[['ok','Рабочее время'],['pause','Плановый простой'],['off','Внеплановый простой'],['none','Организационный или не учитывается'],['part','По режиму входа']],
    info:'Категории предложены по образцу РТК и требуют утверждения (В-13). При нескольких причинах время учитывается по старшей категории.'},
  motion:{name:'Механика и нагрев', cat:{
    'OFF':['none','Обесточены'], 'M-01':['part','Самопроверка, прогрев печи'], 'M-02':['ok','Автоматически по заказу'],
    'M-03.1':['none','Опрос платы прерван'], 'M-03.2':['none','Опрос платы прерван'], 'M-04.1':['part','Тестовое окно'], 'M-04.2':['part','Тестовое окно'], 'M-04.3':['part','Тестовое окно'],
    'M-05.1':['none','Готовка не начинается'], 'M-05.2':['off','Готовка запрещена до осмотра']},
    legend:[['ok','Автоматически'],['part','Самопроверка или ручное управление'],['none','Не работают'],['off','Запрещены до осмотра человеком']],
    info:'Кнопки аварийного останова нет: аппарат останавливают обесточиванием (T-18). Защелка печи запрещает новую готовку, пока человек не проверит камеру.'}
};

let layer = 'none', sel = null, scen = null;

function buildSvg(){
  const svg = $('#sm');
  const defs = el('defs', {}, svg);
  [['ah','mk-fg'],['ahd','mk-danger']].forEach(([id, cls]) => {
    const m = el('marker', {id, viewBox:'0 0 10 10', refX:'9.5', refY:'5', markerWidth:9, markerHeight:9, markerUnits:'userSpaceOnUse', orient:'auto-start-reverse'}, defs);
    el('path', {d:'M0,0 L10,5 L0,10 z', class: cls}, m);
  });
  COMPS.forEach(c => {
    const g = el('g', {class:'node comp', 'data-s': c.id, tabindex:'0', role:'button', 'aria-label': c.id + ' ' + MODES[c.id].name}, svg);
    el('rect', {x:c.x, y:c.y, width:c.w, height:c.h, rx:10}, g);
    txt(g, c.tx, c.ty, 'ctitle', c.id + ' · ' + MODES[c.id].name);
  });
  const gt = el('g', {}, svg);
  EDGES.forEach(e => {
    const t = TM[e.t];
    const g = el('g', {class:'tr ' + t.kind, 'data-t': e.t}, gt);
    e.p.forEach((pts, i) => {
      const d = pathD(pts);
      el('path', {d, class:'halo'}, g);
      el('path', {d, class:'hit'}, g);
      const a = {d, class:'ln'};
      if (!(e.na || []).includes(i)) a['marker-end'] = t.kind === 'lock' ? 'url(#ahd)' : 'url(#ah)';
      if (e.both) a['marker-start'] = 'url(#ah)';
      el('path', a, g);
      if ((e.na || []).includes(i)){ const [x, y] = pts[pts.length - 1]; el('circle', {cx:x, cy:y, r:3, class:'junc'}, g); }
    });
    e.b.forEach(([x, y]) => {
      const b = el('g', {class:'badge', 'data-t': e.t, tabindex:'0', role:'button', 'aria-label':'Переход ' + tid(t.n) + ': ' + label(t)}, g);
      el('circle', {cx:x, cy:y, r:11}, b);
      txt(b, x, y + 0.5, '', String(e.t));
    });
  });
  NODES.forEach(n => {
    const m = MODES[n.id];
    const g = el('g', {class:'node atom' + (par(n.id) ? ' sub' : ''), 'data-s': n.id, tabindex:'0', role:'button', 'aria-label': (n.id === 'OFF' ? '' : n.id + ' ') + m.name}, svg);
    el('rect', {x:n.x, y:n.y, width:n.w, height:n.h, rx:7}, g);
    const cx = n.x + n.w / 2;
    txt(g, cx, 0, 'nid', m.disp);
    txt(g, cx, 0, 'nname', m.name);
    txt(g, cx, 0, 'nstat', '');
  });
  PSEUDO.forEach(p => {
    const g = el('g', {class:'pseudo', 'data-t': p.t, tabindex:'0', role:'button', 'aria-label': p.label + ', переход ' + tid(p.t)}, svg);
    el('rect', {x:p.x, y:p.y, width:p.w, height:p.h, rx:p.h / 2}, g);
    txt(g, p.x + p.w / 2, p.y + p.h / 2 + 4, '', p.label);
  });
}

function paint(){
  const svg = $('#sm');
  svg.classList.toggle('l-none', layer === 'none');
  svg.querySelectorAll('.node.atom').forEach(g => {
    const n = NG[g.dataset.s], my = n.y + n.h / 2;
    const r = g.querySelector('rect'), [tId, tName, tStat] = g.querySelectorAll('text');
    if (layer === 'none'){
      r.style.fill = ''; r.style.stroke = '';
      tStat.textContent = '';
      tId.setAttribute('y', my - 9); tName.setAttribute('y', my + 12);
    } else {
      const [c, l] = LAYERS[layer].cat[g.dataset.s];
      r.style.fill = `var(--${c}-bg)`; r.style.stroke = `var(--${c})`;
      tStat.textContent = l;
      tId.setAttribute('y', my - 17); tName.setAttribute('y', my + 3); tStat.setAttribute('y', my + 21);
    }
  });
  $('#legend').innerHTML = layer === 'none' ? '' : LAYERS[layer].legend.map(([c, l]) => `<span><i class="sw" style="background:var(--${c}-bg);border-color:var(--${c})"></i>${esc(l)}</span>`).join('');
}

/* Выделение: режим, переход, признак */
function related(){
  if (scen){
    const [, hl] = M.scen[scen.i].steps[scen.k];
    if (/^T-/.test(hl)) return {k:'t', n:+hl.slice(2)};
    return {k:'s', id:hl};
  }
  return sel;
}
function apply(){
  const svg = $('#sm');
  const s = related();
  svg.classList.toggle('has-sel', !!s);
  svg.querySelectorAll('.on, .cur').forEach(x => x.classList.remove('on', 'cur'));
  if (s){
    const onT = new Set(), onS = new Set();
    if (s.k === 's'){
      onS.add(s.id);
      M.trans.forEach(t => {
        const out = t.from[0] !== '*' && rel(t.from, s.id), inn = rel(t.to, s.id);
        if (out || inn){ onT.add(t.n); (out ? t.to : t.from).forEach(x => x !== '*' && onS.add(x)); }
      });
    } else if (s.k === 't'){
      const t = TM[s.n];
      onT.add(t.n);
      [...t.from, ...t.to].forEach(x => x !== '*' && onS.add(x));
    } else if (s.k === 'f'){
      (M.flags.find(f => f.id === s.id).t || []).forEach(n => { onT.add(n); [...TM[n].from, ...TM[n].to].forEach(x => onS.add(x)); });
    }
    svg.querySelectorAll('.tr, .pseudo').forEach(g => { if (onT.has(+g.dataset.t)) g.classList.add('on'); });
    svg.querySelectorAll('.node').forEach(g => {
      const id = g.dataset.s;
      if ([...onS].some(x => x === id || par(x) === id || par(id) === x)) g.classList.add('on');
      if (s.k === 's' && (id === s.id)) g.classList.add('cur');
    });
  }
  renderCard();
  document.querySelectorAll('#tm tbody tr, #tt tbody tr').forEach(r => r.classList.toggle('sel', !!sel && ((sel.k === 's' && r.dataset.s === sel.id) || (sel.k === 't' && +r.dataset.t === sel.n))));
}

const tItem = t => `<li><button type="button" class="tlink${t.kind === 'lock' ? ' safety' : ''}" data-goto-t="${t.n}"><span class="tn">${t.n}</span><span>${esc(label(t))}</span><small>${esc(t.cond === '—' ? t.who : t.cond)}</small></button></li>`;
const tList = a => a.length ? '<ul>' + a.map(tItem).join('') + '</ul>' : '<div class="empty">Переходов нет</div>';
const gotoS = k => `<button type="button" class="goto" data-goto-s="${k}"><code>${esc(MODES[k].disp)}</code>${esc(MODES[k].name)}</button>`;
const gotoF = f => `<button type="button" class="goto" data-goto-f="${f.id}">${esc(f.name)}</button>`;
const lgRow = (cls, text) => `<svg width="34" height="10" aria-hidden="true"><line class="${cls}" x1="1" y1="5" x2="33" y2="5"/></svg><span>${text}</span>`;
const rcol = id => id === 'OFF' ? null : (par(id) === 'M-03' || id === 'M-03') ? 'M-03' : (par(id) === 'M-04' || id === 'M-04') ? 'M-04' : (M.rcols.includes(id) ? id : null);

function cmdsHtml(id){
  const col = rcol(id);
  if (id === 'OFF') return '<p class="note">Связи нет, команды не поступают.</p>';
  if (!col) return '<p class="note">Команды заданы отдельно для M-05.1 и M-05.2.</p>';
  const ok = M.cmds.filter(c => c.cells[col]).map(c => {
    const cell = c.cells[col];
    const d = /^Да/.test(c.danger) ? ' <span class="dg">опасная</span>' : '';
    return `<li>${esc(c.cmd)}${cell[1] ? ` <i>(${esc(cell[1])})</i>` : ''}${d}</li>`;
  });
  return `<h4>Удаленные и сервисные команды</h4>${ok.length ? `<ul class="rc">${ok.join('')}</ul>` : '<div class="empty">Нет</div>'}`;
}

function introHtml(){
  return `<h3>Как читать схему</h3>
    <ul>
      <li>Блоки — режимы аппарата. Блоки внутри M-03, M-04 и M-05 — подрежимы.</li>
      <li>Нажмите на режим, чтобы раскрыть его переходы, на номер — чтобы увидеть условие и действия.</li>
      <li>Слой раскрашивает режимы по статусу для хаба, статусу платформы, учету времени или работе механики.</li>
      <li>Сценарий проводит по схеме шаг за шагом.</li>
    </ul>
    <div class="lgline">${lgRow('', 'Действие человека на месте')}${lgRow('dash', 'Автоматически')}${lgRow('dot', 'Автоматически или удаленно')}${lgRow('danger', 'Блокировка продаж')}</div>
    ${layer !== 'none' ? `<p class="note">${esc(LAYERS[layer].info)}</p>` : ''}
    <h4>Признаки аппарата</h4><div class="chips">${M.flags.map(gotoF).join('')}</div>
    <p class="note">Таблицы модели — в справочнике под схемой.</p>`;
}

const FL = [['accept','Прием заказов'],['motion','Механика и нагрев'],['person','Кто внутри'],['hub','Статус для хаба'],['plat','Платформа'],['time','Учет времени']];
function modeHtml(id){
  const m = MODES[id];
  const outs = M.trans.filter(t => t.from[0] !== '*' && rel(t.from, id));
  const ins = M.trans.filter(t => rel(t.to, id));
  const subs = M.modes.filter(x => par(x.id) === id);
  const kind = par(id) ? 'Подрежим ' + par(id) : (subs.length ? 'Режим с подрежимами' : 'Режим');
  const attrs = id === 'M-02' ? `<div class="attrs">${M.attrs02.slice(1).map(r => `<div><b>${esc(r[0])}.</b> ${esc(r[1])}. ${esc(r[2])}</div>`).join('')}</div>` : '';
  const kv = m.accept ? `<dl class="kv">${FL.map(([k, l]) => `<dt>${l}</dt><dd>${esc(m[k])}</dd>`).join('')}</dl>` : '';
  const fl = id === 'M-05.2' ? `<div class="chips">${gotoF(M.flags[1])}</div>` : '';
  return `<div class="crumb">${kind}</div>
    <div class="d-head"><span class="d-id">${esc(m.disp)}</span><h3>${esc(m.name)}</h3></div>
    <p>${esc(m.purpose)}</p>
    ${subs.length ? `<div class="chips">${subs.map(x => gotoS(x.id)).join('')}</div>` : ''}
    ${attrs}${kv}${fl}
    <div class="d-cols"><div><h4>Выход</h4>${tList(outs)}</div><div><h4>Вход</h4>${tList(ins)}</div></div>
    ${subs.length ? '' : cmdsHtml(id)}`;
}
function transHtml(t){
  const e = [...new Set([...t.from, ...t.to])].filter(x => MODES[x]);
  return `<div class="crumb">Переход ${tid(t.n)} · ${KIND[t.kind]}</div>
    <h3>${esc(label(t))}</h3>
    <dl class="kv"><dt>Инициатор и канал</dt><dd>${esc(t.who)}</dd><dt>Условие</dt><dd>${esc(t.cond)}</dd><dt>Действия аппарата</dt><dd>${esc(t.act)}</dd></dl>
    <div class="chips">${e.map(gotoS).join('')}</div>`;
}
function flagHtml(id){
  const f = M.flags.find(x => x.id === id);
  return `<div class="crumb">Признак аппарата</div><h3>${esc(f.name)}</h3>
    <dl class="kv"><dt>Устанавливается</dt><dd>${esc(f.set)}</dd><dt>Снимается</dt><dd>${esc(f.clear)}</dd><dt>Действие</dt><dd>${esc(f.act)}</dd></dl>
    ${f.t.length ? `<div class="d-cols"><div><h4>Связанные переходы</h4>${tList(f.t.map(n => TM[n]))}</div></div>` : ''}`;
}
function scenHtml(){
  const s = M.scen[scen.i], [text, hl] = s.steps[scen.k], last = scen.k === s.steps.length - 1;
  const where = /^T-/.test(hl) ? `<div class="chips"><button type="button" class="goto" data-goto-t="${hl.slice(2)}"><code>${tid(+hl.slice(2))}</code>${esc(label(TM[+hl.slice(2)]))}</button></div>` : `<div class="chips">${gotoS(hl)}</div>`;
  return `<div class="crumb">${s.grp === 'norm' ? 'Штатный' : 'Нештатный'} сценарий ${s.id}</div>
    <h3>${esc(s.name)}</h3>
    ${scen.k === 0 ? `<p class="note"><b>Исходное состояние.</b> ${esc(s.start)}</p>` : ''}
    <p><b>Шаг ${scen.k + 1}.</b> ${esc(text)}</p>${where}
    ${last ? `<p><b>Результат.</b> ${esc(s.result)}</p>` : ''}
    ${s.discuss && last ? `<p class="note"><b>Требует обсуждения.</b> ${esc(s.discuss)}</p>` : ''}
    <div class="nav"><button type="button" data-act="prev" ${scen.k === 0 ? 'disabled' : ''}>Назад</button><button type="button" class="primary" data-act="${last ? 'end' : 'next'}">${last ? 'Завершить' : 'Далее'}</button><span class="step">${scen.k + 1} / ${s.steps.length}</span></div>`;
}
function renderCard(){
  let h;
  if (scen) h = scenHtml();
  else if (!sel) h = introHtml();
  else {
    const back = '<button type="button" class="back" data-act="back">← К описанию схемы</button>';
    h = back + (sel.k === 's' ? modeHtml(sel.id) : sel.k === 't' ? transHtml(TM[sel.n]) : flagHtml(sel.id));
  }
  $('#card').innerHTML = h;
}
function select(s){ scen = null; $('#scen').value = ''; sel = s; apply(); }

/* Справочник */
const table = (rows, opts = {}) => `<div class="tscroll"><table${opts.id ? ` id="${opts.id}"` : ''}${opts.cls ? ` class="${opts.cls}"` : ''}><thead><tr>${rows[0].map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
function buildSections(){
  const leaf = M.modes.filter(m => m.accept);
  const modesT = `<div class="tscroll"><table id="tm" class="wide"><thead><tr><th>Режим</th><th>Назначение</th>${FL.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${M.modes.map(m => `<tr data-s="${m.id}" tabindex="0" class="${par(m.id) ? 'sub' : (m.accept ? '' : 'parent')}"><td class="id">${esc(m.disp)}</td><td><b>${esc(m.name)}.</b> ${esc(m.purpose)}</td>${FL.map(([k]) => `<td>${esc(m[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const transT = `<div class="tscroll"><table id="tt" class="wide"><thead><tr><th>№</th><th>Переход</th><th>Инициатор и канал</th><th>Условие</th><th>Действия аппарата</th></tr></thead><tbody>${M.trans.map(t => `<tr data-t="${t.n}" tabindex="0"><td class="id">${tid(t.n)}</td><td class="path">${esc(label(t))}</td><td>${esc(t.who)}</td><td>${esc(t.cond)}</td><td>${esc(t.act)}</td></tr>`).join('')}</tbody></table></div>`;
  const cell = c => !c ? '<span class="cell c-n">—</span>' : c[0] === 'y' ? '<span class="cell c-y">да</span>' : `<span class="cell c-c">с условием<small>${esc(c[1])}</small></span>`;
  const matrix = `<div class="tscroll"><table class="matrix"><thead><tr><th>Команда</th><th>Опасная</th>${M.rcols.map(c => `<th class="m">${c}<small>${esc(MODES[c] ? MODES[c].name : '')}</small></th>`).join('')}</tr></thead><tbody>${M.cmds.map(c => `<tr><td class="cmd">${esc(c.cmd)}<small>${esc(c.ch)}</small><span>${esc(c.note)}</span></td><td class="dz">${esc(c.danger)}</td>${M.rcols.map(k => `<td class="c">${cell(c.cells[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const ul = xs => `<ul class="plain">${xs.map(x => `<li>${md(x)}</li>`).join('')}</ul>`;
  const TABS = [
    ['Принципы', `<div class="card">${ul(M.principles)}</div><div class="rsec"><h3>Признаки аппарата</h3>${table([['Признак','Устанавливается','Снимается','Действие']].concat(M.flags.map(f => [f.name, f.set, f.clear, f.act])))}</div><div class="rsec"><h3>Признаки режима M-02</h3>${table(M.attrs02)}</div>`],
    ['Режимы', modesT],
    ['Переходы', transT],
    ['Причины отказа', table(M.reasons, {cls:'wide'}) + `<p class="note">${esc(M.reasonsNote)}</p>`],
    ['Отказы', `<div class="card"><p>${esc(M.failures.intro)}</p>${ul(M.failures.items)}<p class="note">${esc(M.failures.note)}</p></div>`],
    ['Команды', `<div class="card">${ul(M.cmdsNote)}</div>${matrix}`],
    ['Заказ', `<div class="rsec"><h3>Состояния позиции</h3>${table(M.orderStates)}</div><div class="rsec"><h3>Переходы</h3>${table(M.orderTrans)}</div><div class="card">${ul(M.orderNotes)}</div>`],
    ['Параметры', table(M.params)],
    ['Решения', table(M.decisions)],
    ['Риски', table(M.risks)],
    ['Вопросы', table(M.questions)]
  ];
  $('#tabs').innerHTML = TABS.map(([n], i) => `<button type="button" role="tab" data-tab="tp${i}" aria-selected="${i === 0}">${n}</button>`).join('');
  $('#tabps').innerHTML = TABS.map(([, h], i) => `<div class="tabp" role="tabpanel" id="tp${i}" ${i ? 'hidden' : ''}>${h}</div>`).join('');
}

/* Запуск и события. #scheme — только схема, для картинки в документе */
if (location.hash === '#scheme'){ document.documentElement.dataset.theme = 'light'; document.body.classList.add('scheme-only'); }
M.scen.forEach((s, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = `${s.id} ${s.name}`; $('#scen').appendChild(o); });
buildSvg();
buildSections();
paint();
apply();

function pick(target){
  const t = target.closest('[data-t]'), s = target.closest('[data-s]');
  if (t) { select({k:'t', n:+t.dataset.t}); return true; }
  if (s) { select({k:'s', id:s.dataset.s}); return true; }
  return false;
}
$('#sm').addEventListener('click', ev => { if (!pick(ev.target) && (sel || scen)){ scen = null; sel = null; $('#scen').value = ''; apply(); } });
$('#sm').addEventListener('keydown', ev => {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  if (ev.target.closest('.badge, .pseudo, .node')){ ev.preventDefault(); pick(ev.target); }
});
$('#card').addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]');
  if (b){
    const a = b.dataset.act;
    if (a === 'prev') scen.k--;
    else if (a === 'next') scen.k++;
    else { scen = null; sel = null; $('#scen').value = ''; }
    apply();
    return;
  }
  const t = ev.target.closest('[data-goto-t]'), s = ev.target.closest('[data-goto-s]'), f = ev.target.closest('[data-goto-f]');
  if (t) select({k:'t', n:+t.dataset.gotoT});
  else if (s) select({k:'s', id:s.dataset.gotoS});
  else if (f) select({k:'f', id:f.dataset.gotoF});
});
$('#layer').addEventListener('change', e => { layer = e.target.value; paint(); apply(); });
$('#scen').addEventListener('change', e => { sel = null; scen = e.target.value === '' ? null : {i:+e.target.value, k:0}; apply(); });
$('#tabs').addEventListener('click', ev => {
  const b = ev.target.closest('[role="tab"]');
  if (!b) return;
  document.querySelectorAll('#tabs [role="tab"]').forEach(x => { const on = x === b; x.setAttribute('aria-selected', String(on)); $('#' + x.dataset.tab).hidden = !on; });
});
function rowPick(ev){
  if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
  const r = ev.target.closest('tr[data-s], tr[data-t]');
  if (!r) return;
  if (ev.type === 'keydown') ev.preventDefault();
  select(r.dataset.s ? {k:'s', id:r.dataset.s} : {k:'t', n:+r.dataset.t});
  $('#fig').scrollIntoView({behavior:'smooth', block:'start'});
}
document.addEventListener('click', ev => { if (ev.target.closest('#tm, #tt')) rowPick(ev); });
document.addEventListener('keydown', ev => {
  if (ev.target.closest && ev.target.closest('#tm, #tt')) rowPick(ev);
  if (ev.key === 'Escape' && (sel || scen)){ sel = null; scen = null; $('#scen').value = ''; apply(); }
});
