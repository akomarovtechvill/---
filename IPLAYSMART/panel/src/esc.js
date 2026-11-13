/* Панель эскалации. E — M.esc из model/ips-model.js, вставляется при сборке */
const NS = 'http://www.w3.org/2000/svg';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
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

const NODE = Object.fromEntries([...E.sources, ...E.routes, ...E.second].map(n => [n.id, n]));
const ROUTE_IDS = E.routes.map(r => r.id);
const INC = E.incidents.map(([id, name, sign, kind, first, rt, close]) => ({id, name, sign, kind, first, rt, close}));
const LEVEL = {p:'основное направление', s:'при необходимости'};

/* Геометрия, единицы viewBox 1200 x 650 */
const BOX = {
  dev:{x:40, y:40, w:220, h:70}, plat:{x:330, y:40, w:260, h:70}, bot:{x:660, y:40, w:230, h:70}, yt:{x:950, y:40, w:220, h:70},
  close:{x:40, y:210, w:240, h:80}, duty:{x:400, y:200, w:400, h:100},
  tilpos:{x:40, y:400, w:240, h:80}, ksh:{x:330, y:400, w:240, h:80}, tt:{x:620, y:400, w:240, h:80}, visit:{x:910, y:400, w:260, h:80},
  tilsi:{x:330, y:560, w:240, h:64}
};
/* Связи: from, to, ломаная, подпись [x, y, текст], вид: base — всегда, route — направление эскалации, aux — вспомогательная */
const LINKS = [
  {id:'dev-plat', p:[[260,75],[330,75]], kind:'base'},
  {id:'plat-bot', p:[[590,75],[660,75]], kind:'base', lb:[625,64,'дубль']},
  {id:'plat-yt', p:[[460,40],[460,16],[1060,16],[1060,40]], kind:'base', lb:[760,10,'задача']},
  {id:'plat-duty', p:[[470,110],[470,200]], kind:'base', lb:[478,160,'инцидент', 'start']},
  {id:'bot-duty', p:[[775,110],[775,200]], kind:'base dash', lb:[783,160,'уведомление', 'start']},
  {id:'duty-close', p:[[400,250],[280,250]], kind:'base', lb:[340,240,'контролирует']},
  {id:'r-tilpos', p:[[470,300],[160,400]], kind:'route', r:'tilpos', lb:[300,338,'звонок']},
  {id:'r-ksh', p:[[560,300],[450,400]], kind:'route', r:'ksh'},
  {id:'r-tt', p:[[640,300],[740,400]], kind:'route', r:'tt', lb:[700,338,'звонок']},
  {id:'r-visit', p:[[730,300],[1000,400]], kind:'route', r:'visit', lb:[870,338,'выезд']},
  {id:'yt-visit', p:[[1100,110],[1100,400]], kind:'aux', r:'visit', lb:[1108,250,'назначение', 'start']},
  {id:'ksh-tilsi', p:[[450,480],[450,560]], kind:'aux', r:'tilsi', lb:[458,524,'причина в хабе', 'start']}
];
const STEP_HL = [['dev','plat'], ['plat','bot','yt'], ['duty'], ['duty', ...ROUTE_IDS], ['duty'], ['duty','close']];
const STEP_LINKS = [['dev-plat'], ['plat-bot','plat-yt'], ['plat-duty','bot-duty'], ['r-tilpos','r-ksh','r-tt','r-visit'], [], ['duty-close']];

let sel = null;   // {k:'inc', i} | {k:'node', id} | {k:'step', i}

function buildSvg(){
  const svg = $('#es');
  const defs = el('defs', {}, svg);
  [['ah','mk-fg'],['ahp','mk-p'],['ahm','mk-muted']].forEach(([id, cls]) => {
    const m = el('marker', {id, viewBox:'0 0 10 10', refX:'9.5', refY:'5', markerWidth:9, markerHeight:9, markerUnits:'userSpaceOnUse', orient:'auto-start-reverse'}, defs);
    el('path', {d:'M0,0 L10,5 L0,10 z', class: cls}, m);
  });
  const gl = el('g', {}, svg);
  LINKS.forEach(l => {
    const g = el('g', {class:'lk ' + l.kind, 'data-l': l.id}, gl);
    if (l.r) g.dataset.r = l.r;
    const d = 'M' + l.p.map(p => p.join(',')).join(' L');
    el('path', {d, class:'halo'}, g);
    el('path', {d, class:'ln', 'marker-end':'url(#ah)'}, g);
    if (l.lb) txt(g, l.lb[0], l.lb[1], 'lbl' + (l.lb[3] ? ' ' + l.lb[3] : ''), l.lb[2]);
  });
  Object.entries(BOX).forEach(([id, b]) => {
    const n = NODE[id];
    const kind = ROUTE_IDS.includes(id) ? 'route' : id === 'tilsi' ? 'second' : id === 'duty' ? 'duty' : 'src';
    const g = el('g', {class:'bx ' + kind, 'data-n': id, tabindex:'0', role:'button', 'aria-label': n.name}, svg);
    el('rect', {x:b.x, y:b.y, width:b.w, height:b.h, rx:8}, g);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    txt(g, cx, cy - 4, 'nname', n.name);
    txt(g, cx, cy + 16, 'nstat', n.sub || n.ch || '');
  });
}

/* Подсветка: уровень направления для выбранного инцидента или набор узлов шага */
function paint(){
  const svg = $('#es');
  svg.classList.toggle('has-sel', !!sel);
  svg.querySelectorAll('.on, .p, .s, .cur').forEach(x => x.classList.remove('on', 'p', 's', 'cur'));
  if (!sel) return renderCard();
  let nodes = [], links = [];
  if (sel.k === 'inc'){
    const inc = INC[sel.i];
    nodes = ['dev','plat','bot','yt','duty','close'];
    links = LINKS.filter(l => l.kind.startsWith('base')).map(l => l.id);
    Object.entries(inc.rt).forEach(([r, lv]) => {
      svg.querySelector(`[data-n="${r}"]`).classList.add(lv);
      svg.querySelectorAll(`.lk[data-r="${r}"]`).forEach(g => g.classList.add(lv));
    });
    if (inc.rt.ksh && /Тилси/.test(inc.first)){ svg.querySelector('[data-n="tilsi"]').classList.add('s'); svg.querySelector('[data-l="ksh-tilsi"]').classList.add('s'); }
  } else if (sel.k === 'step'){
    nodes = STEP_HL[sel.i]; links = STEP_LINKS[sel.i];
  } else {
    nodes = [sel.id];
    links = LINKS.filter(l => l.id.split('-').includes(sel.id) || l.r === sel.id || l.id === 'r-' + sel.id).map(l => l.id);
    links.forEach(id => { const l = LINKS.find(x => x.id === id); l.id.replace(/^r-/, 'duty-').split('-').forEach(n => nodes.push(n)); });
    svg.querySelector(`[data-n="${sel.id}"]`).classList.add('cur');
  }
  nodes.forEach(n => { const g = svg.querySelector(`[data-n="${n}"]`); if (g) g.classList.add('on'); });
  links.forEach(id => svg.querySelector(`[data-l="${id}"]`).classList.add('on'));
  renderCard();
  document.querySelectorAll('#tmx tbody tr').forEach(r => r.classList.toggle('sel', sel.k === 'inc' && +r.dataset.i === sel.i));
}

const dot = lv => lv ? `<span class="dot ${lv}" title="${LEVEL[lv]}">${lv === 'p' ? '●' : '○'}</span>` : '';
const gotoN = id => `<button type="button" class="goto" data-goto-n="${id}">${esc(NODE[id].name)}</button>`;
const gotoI = (i, pre = '') => `<li><button type="button" class="tlink" data-goto-i="${i}"><span class="tn">${INC[i].id.slice(2)}</span><span>${pre}${esc(INC[i].name)}</span><small>${esc(INC[i].sign)}</small></button></li>`;

function introHtml(){
  return `<h3>Как читать схему</h3>
    <ul>
      <li>Платформа регистрирует инцидент, дублирует его в Тех-бот и задачей в Яндекс Трекер руководителю сервиса.</li>
      <li>Дежурный выбирает одно или несколько направлений эскалации и контролирует закрытие.</li>
      <li>Выберите инцидент — схема покажет основные направления сплошной линией и направления «при необходимости» пунктиром.</li>
    </ul>
    <div class="lgline"><svg width="34" height="10" aria-hidden="true"><line class="lp" x1="1" y1="5" x2="33" y2="5"/></svg><span>Основное направление</span><svg width="34" height="10" aria-hidden="true"><line class="ls" x1="1" y1="5" x2="33" y2="5"/></svg><span>При необходимости</span></div>
    <h4>Инциденты</h4><ul>${INC.map((_, i) => gotoI(i)).join('')}</ul>
    <p class="note">${esc(E.note)}</p>`;
}
function incHtml(i){
  const x = INC[i];
  const rows = ROUTE_IDS.filter(r => x.rt[r]).sort((a, b) => (x.rt[a] > x.rt[b]) - (x.rt[a] < x.rt[b]))
    .map(r => `<li>${dot(x.rt[r])} <b>${esc(NODE[r].name)}</b> — ${LEVEL[x.rt[r]]}. <i>${esc(NODE[r].ch)}</i></li>`).join('');
  return `<div class="crumb">Инцидент ${esc(x.id)} · ${esc(x.kind.toLowerCase())}</div>
    <h3>${esc(x.name)}</h3>
    <dl class="kv"><dt>Признак в платформе</dt><dd>${esc(x.sign)}</dd><dt>Первое действие дежурного</dt><dd>${esc(x.first)}</dd></dl>
    <h4>Эскалация</h4><ul class="rc">${rows}</ul>
    <dl class="kv"><dt>Закрытие</dt><dd>${esc(x.close)}</dd></dl>
    <div class="nav"><button type="button" data-act="iprev" ${i === 0 ? 'disabled' : ''}>Предыдущий</button><button type="button" class="primary" data-act="inext" ${i === INC.length - 1 ? 'disabled' : ''}>Следующий</button><span class="step">${i + 1} / ${INC.length}</span></div>`;
}
function nodeHtml(id){
  const n = NODE[id];
  const r = E.routes.find(x => x.id === id), s = E.second.find(x => x.id === id);
  if (r){
    const use = INC.map((x, i) => [x, i]).filter(([x]) => x.rt[id]);
    return `<div class="crumb">Направление эскалации</div><h3>${esc(n.name)}</h3>
      <dl class="kv"><dt>Канал</dt><dd>${esc(r.ch)}</dd><dt>Что решает</dt><dd>${esc(r.what)}</dd><dt>Что передает дежурный</dt><dd>${esc(r.give)}</dd></dl>
      <h4>Инциденты</h4><ul>${use.map(([x, i]) => gotoI(i, dot(x.rt[id]) + ' ')).join('')}</ul>`;
  }
  if (s) return `<div class="crumb">Второй уровень · через ${esc(NODE[s.from].name)}</div><h3>${esc(n.name)}</h3><p>${esc(s.what)}</p><div class="chips">${gotoN(s.from)}</div>`;
  if (id === 'close') return `<div class="crumb">Критерии Д.4</div><h3>${esc(n.name)}</h3><p>Дежурный закрывает инцидент, когда выполнены условия:</p><ul>${E.closing.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  if (id === 'duty') return `<div class="crumb">Принимает решение</div><h3>${esc(n.name)}</h3><p>${esc(E.intro[1])}</p><div class="chips">${ROUTE_IDS.map(gotoN).join('')}</div>`;
  return `<div class="crumb">Источник инцидента</div><h3>${esc(n.name)}</h3><p>${esc(n.sub)}</p><p class="note">${esc(E.intro[0])}</p>`;
}
function stepHtml(i){
  const last = i === E.steps.length - 1;
  return `<div class="crumb">Порядок обработки инцидента</div><h3>Шаг ${i + 1}</h3><p>${esc(E.steps[i])}</p>
    <div class="nav"><button type="button" data-act="sprev" ${i === 0 ? 'disabled' : ''}>Назад</button><button type="button" class="primary" data-act="${last ? 'end' : 'snext'}">${last ? 'Завершить' : 'Далее'}</button><span class="step">${i + 1} / ${E.steps.length}</span></div>`;
}
function renderCard(){
  const back = '<button type="button" class="back" data-act="end">← К описанию схемы</button>';
  $('#card').innerHTML = !sel ? introHtml() : back + (sel.k === 'inc' ? incHtml(sel.i) : sel.k === 'step' ? stepHtml(sel.i) : nodeHtml(sel.id));
}
function select(s){
  sel = s;
  $('#inc').value = s && s.k === 'inc' ? String(s.i) : '';
  paint();
}

function buildRef(){
  const tbl = (head, rows, attrs = '') => `<div class="tscroll"><table ${attrs}><thead><tr>${head.map(h => `<th${h[1] ? ' class="m"' : ''}>${esc(h[0] || h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const TABS = [
    ['Порядок', `<div class="card"><p>${esc(E.intro[0])}</p><ol class="steps">${E.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>`],
    ['Направления', tbl(['Направление','Канал','Что решает','Что передает дежурный'],
      [...E.routes.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.ch)}</td><td>${esc(r.what)}</td><td>${esc(r.give)}</td></tr>`),
       ...E.second.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>Через ${esc(NODE[s.from].name)}</td><td>${esc(s.what)}</td><td>—</td></tr>`)], 'class="wide"')],
    ['Матрица', `<p class="note">● — основное направление, ○ — при необходимости. Нажмите на строку, чтобы показать инцидент на схеме.</p>` +
      tbl([['№'],['Инцидент'],['Признак в платформе'],['Блокирует'],['Первое действие дежурного'], ...E.routes.map(r => [r.name, 1]), ['Закрытие']],
        INC.map((x, i) => `<tr data-i="${i}" tabindex="0"><td class="id">${esc(x.id)}</td><td><b>${esc(x.name)}</b></td><td>${esc(x.sign)}</td><td>${x.kind === 'Блокирующий' ? 'да' : 'нет'}</td><td>${esc(x.first)}</td>${ROUTE_IDS.map(r => `<td class="c">${dot(x.rt[r])}</td>`).join('')}<td>${esc(x.close)}</td></tr>`), 'id="tmx" class="matrix"')],
    ['Закрытие', `<div class="card"><p>Дежурный закрывает инцидент, когда выполнены условия:</p><ul class="plain">${E.closing.map(c => `<li>${esc(c)}</li>`).join('')}</ul><p class="note">${esc(E.note)}</p></div>`]
  ];
  $('#tabs').innerHTML = TABS.map(([n], i) => `<button type="button" role="tab" data-tab="tp${i}" aria-selected="${i === 2}">${n}</button>`).join('');
  $('#tabps').innerHTML = TABS.map(([, h], i) => `<div class="tabp" role="tabpanel" id="tp${i}" ${i === 2 ? '' : 'hidden'}>${h}</div>`).join('');
}

INC.forEach((x, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = `${x.id} ${x.name}`; $('#inc').appendChild(o); });
$('#legend').innerHTML = '<span><i class="dot p">●</i>основное направление</span><span><i class="dot s">○</i>при необходимости</span>';
buildSvg();
buildRef();
paint();

$('#es').addEventListener('click', ev => {
  const n = ev.target.closest('[data-n]');
  if (n) select({k:'node', id:n.dataset.n}); else if (sel) select(null);
});
$('#es').addEventListener('keydown', ev => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest('[data-n]')){ ev.preventDefault(); select({k:'node', id:ev.target.closest('[data-n]').dataset.n}); }
});
$('#inc').addEventListener('change', e => select(e.target.value === '' ? null : {k:'inc', i:+e.target.value}));
$('#steps').addEventListener('click', () => select({k:'step', i:0}));
$('#card').addEventListener('click', ev => {
  const a = ev.target.closest('[data-act]');
  if (a){
    const act = a.dataset.act;
    if (act === 'end') select(null);
    else if (act === 'snext' || act === 'sprev') select({k:'step', i:sel.i + (act === 'snext' ? 1 : -1)});
    else select({k:'inc', i:sel.i + (act === 'inext' ? 1 : -1)});
    return;
  }
  const i = ev.target.closest('[data-goto-i]'), n = ev.target.closest('[data-goto-n]');
  if (i) select({k:'inc', i:+i.dataset.gotoI});
  else if (n) select({k:'node', id:n.dataset.gotoN});
});
$('#tabs').addEventListener('click', ev => {
  const b = ev.target.closest('[role="tab"]');
  if (!b) return;
  document.querySelectorAll('#tabs [role="tab"]').forEach(x => { const on = x === b; x.setAttribute('aria-selected', String(on)); $('#' + x.dataset.tab).hidden = !on; });
});
function rowPick(ev){
  const r = ev.target.closest('#tmx tr[data-i]');
  if (!r || (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ')) return;
  ev.preventDefault();
  select({k:'inc', i:+r.dataset.i});
  $('#fig').scrollIntoView({behavior:'smooth', block:'start'});
}
document.addEventListener('click', rowPick);
document.addEventListener('keydown', ev => { rowPick(ev); if (ev.key === 'Escape' && sel) select(null); });
