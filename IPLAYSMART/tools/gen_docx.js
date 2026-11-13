/* Собирает «IPS_ Концепция эксплуатации.docx» из model/ips-model.js.
   Оформление повторяет концепцию РТК: A4, Arial 10 пт, таблицы с рамками, заголовки с номерами.
   Запуск: node tools/gen_docx.js [путь к схеме PNG]. Нужен пакет docx (npm install docx@9.5.1) */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, HeadingLevel, TableLayoutType, LevelFormat, PageBreak, Footer, PageNumber, ImageRun, ShadingType,
  TableOfContents
} = require('docx');
const M = require('../model/ips-model.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'IPS_ Концепция эксплуатации.docx');
const IMG = process.argv[2] || path.join(ROOT, 'panel', 'scheme.png');
const W = 10160;
const SZ = 20;

const run = (t, o = {}) => new TextRun({text: t, size: SZ, ...o});
/* **жирный** внутри строки */
function runs(s, o = {}){
  return String(s).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(p => p.startsWith('**') ? run(p.slice(2, -2), {...o, bold: true}) : run(p, o));
}
const P = (s, o = {}) => new Paragraph({children: runs(s), spacing: {before: 120, after: 120, line: 288}, alignment: AlignmentType.JUSTIFIED, ...o});
const H = (lvl, s) => new Paragraph({heading: lvl, children: [new TextRun({text: s})]});
const LI = (s, ref = 'bul') => new Paragraph({children: runs(s), numbering: {reference: ref, level: 0}, spacing: {before: 40, after: 40, line: 288}, alignment: AlignmentType.JUSTIFIED});
const NOTE = s => new Paragraph({children: [run('Требует обсуждения: ', {bold: true, italics: true}), run(s, {italics: true})], spacing: {before: 120, after: 120, line: 288}});

const border = {style: BorderStyle.SINGLE, size: 8, color: '000000'};
const borders = {top: border, bottom: border, left: border, right: border};
/* rows[0] — шапка. ws — относительные доли столбцов */
function T(rows, ws){
  const sum = ws.reduce((a, b) => a + b, 0);
  const cw = ws.map(w => Math.floor(W * w / sum));
  cw[cw.length - 1] += W - cw.reduce((a, b) => a + b, 0);
  const small = ws.length >= 7 ? {size: 16} : {};
  return new Table({
    width: {size: W, type: WidthType.DXA},
    layout: TableLayoutType.FIXED,
    columnWidths: cw,
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      cantSplit: true,
      children: r.map((c, j) => new TableCell({
        borders,
        width: {size: cw[j], type: WidthType.DXA},
        margins: {top: 80, bottom: 80, left: 100, right: 100},
        shading: i === 0 ? {fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto'} : undefined,
        children: String(c).split('\n').map(line => new Paragraph({
          children: runs(line, i === 0 ? {bold: true, ...small} : small),
          alignment: i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: {line: 264}
        }))
      }))
    }))
  });
}
const gap = () => new Paragraph({children: [], spacing: {after: 60}});

const body = [];
const add = (...xs) => xs.forEach(x => Array.isArray(x) ? body.push(...x) : body.push(x));

/* Титульный лист */
const C = (s, o = {}) => new Paragraph({children: [run(s, o)], alignment: AlignmentType.CENTER, spacing: {after: 120}});
add(...Array.from({length: 8}, () => C('')));
add(C(M.meta.title, {bold: true, size: 36}));
add(C('на ' + M.meta.object, {bold: true, size: 30}));
add(C(''), C('Обозначение документа: ' + M.meta.code), C(M.meta.org), C(''));
add(C(`№ ревизии: ${M.meta.rev}   Дата выпуска: ${M.meta.date}   Статус: ${M.meta.status}`));
add(C(M.meta.basis, {italics: true, color: '555555'}));
add(new Paragraph({children: [new PageBreak()]}));
add(new Paragraph({children: [run('Содержание', {bold: true, size: 24})], spacing: {after: 200}}));
add(new TableOfContents('Содержание', {hyperlink: true, headingStyleRange: '1-3'}));
add(new Paragraph({children: [new PageBreak()]}));

/* 1. Введение */
add(H(HeadingLevel.HEADING_1, '1. Введение'));
add(H(HeadingLevel.HEADING_2, '1.1. Описание проекта'));
add(H(HeadingLevel.HEADING_3, '1.1.1. Предпосылки'));
add(M.intro.background.map(s => P(s)));
add(T(M.intro.kpi, [3, 7]), gap());
add(H(HeadingLevel.HEADING_3, '1.1.2. Допущения и ограничения'));
add(H(HeadingLevel.HEADING_4, 'Допущения'));
add(M.intro.assumptions.map(s => LI(s)));
add(H(HeadingLevel.HEADING_4, 'Ограничения'));
add(M.intro.limits.map(s => LI(s)));
add(H(HeadingLevel.HEADING_2, '1.2. Обзор целевой системы'));
add(H(HeadingLevel.HEADING_3, '1.2.1. Обзор'));
add(P('Аппарат состоит из узлов:'));
add(T(M.intro.modules, [3, 7]), gap());
add(H(HeadingLevel.HEADING_4, 'Обслуживание покупателя'));
add(M.intro.customer.map(s => LI(s, 'num1')));
add(P('Режимы работы описаны в разделе 2.4, сценарии — в разделе 5.'));
add(H(HeadingLevel.HEADING_3, '1.2.2. Границы системы'));
add(P('Документ описывает аппарат вместе с агентом интегратора. Внешние системы, с которыми аппарат взаимодействует напрямую:'));
add(T(M.intro.externals, [3, 7]), gap());
add(P('С КСО, 1С, оператором фискальных данных и банком-эквайером аппарат напрямую не связан. Обмен с ними идет только через хаб.'));

/* 2. Описание целевой системы */
add(H(HeadingLevel.HEADING_1, '2. Описание целевой системы'));
add(H(HeadingLevel.HEADING_2, '2.1. Потребности, цели и задачи'));
add(T(M.needs, [3, 7]), gap());
add(H(HeadingLevel.HEADING_2, '2.2. Обзор системы и ключевые элементы'));
add(P('Функции аппарата:'));
add(T(M.functions, [3, 7]), gap());
add(P('Пользователи и операторы:'));
add(T(M.roles, [3, 7]), gap());
add(H(HeadingLevel.HEADING_2, '2.3. Интерфейсы'));
add(P('Внешние системы приведены в 1.2.2, обмен с хабом — в ICD-IPSM. Здесь описаны интерфейсы с людьми.'));
add(T(M.hmi, [2.5, 3, 4.5]), gap());

add(H(HeadingLevel.HEADING_2, '2.4. Режимы работы'));
add(P(M.principles[0]));
const leaf = M.modes.filter(m => m.accept);
const MR = [['Режим', 'Назначение', 'Прием заказов', 'Механика и нагрев', 'Кто внутри', 'Статус для хаба', 'Платформа', 'Учет времени']];
leaf.forEach(m => MR.push([(m.id === 'OFF' ? '' : m.disp + ' ') + m.name, m.purpose, m.accept, m.motion, m.person, m.hub, m.plat, m.time]));
add(T(MR, [1.6, 2.1, 0.8, 1.3, 1.1, 1.5, 1.3, 1.3]), gap());
if (fs.existsSync(IMG)){
  const img = fs.readFileSync(IMG);
  const w = img.readUInt32BE(16), h = img.readUInt32BE(20);
  const pw = 640, ph = Math.round(pw * h / w);
  add(new Paragraph({alignment: AlignmentType.CENTER, children: [new ImageRun({type: 'png', data: img, transformation: {width: pw, height: ph}, altText: {title: 'Схема режимов', description: 'Режимы пиццемата и переходы между ними', name: 'scheme'}})]}));
  add(new Paragraph({alignment: AlignmentType.CENTER, children: [run('Рисунок 1. Режимы и переходы. Интерактивная версия — панель panel/index.html', {italics: true})]}));
}
add(H(HeadingLevel.HEADING_4, 'Принципы'));
add(M.principles.slice(1).map(s => LI(s)));
add(H(HeadingLevel.HEADING_4, 'Признаки аппарата'));
add(P('Признаки действуют в любом режиме, кроме «Выключен», и не меняют пяти признаков режима.'));
add(T([['Признак', 'Устанавливается', 'Снимается', 'Действие']].concat(M.flags.map(f => [f.name, f.set, f.clear, f.act])), [2, 3, 2.5, 3]), gap());
add(H(HeadingLevel.HEADING_4, 'Признаки режима M-02'));
add(T(M.attrs02, [2, 3.5, 4.5]), gap());
add(P('Переходы между режимами, причины отказа в приеме, отказы, команды, состояния заказа и параметры приведены в приложении Е.'));

/* 3, 4 */
add(H(HeadingLevel.HEADING_1, '3. Физическая среда'));
add(M.physical.map(s => LI(s)));
add(H(HeadingLevel.HEADING_1, '4. Среда поддержки'));
add(M.support.map(s => LI(s)));

/* 5. Сценарии */
add(H(HeadingLevel.HEADING_1, '5. Сценарии'));
add(P('Сценарии описывают работу на пилоте и в целевом решении. Шаги Контура даны кратко, только для связности. Номера переходов T-xx — по приложению Е.1.'));
let numRef = 0;
const scenBlock = s => {
  const out = [H(HeadingLevel.HEADING_3, `${s.id} ${s.name}`)];
  if (s.discuss) out.push(NOTE(s.discuss));
  out.push(P('**Исходное состояние:** ' + s.start));
  const ref = 'sc' + (numRef++);
  s.steps.forEach(([t, hl]) => out.push(LI(t + (/^T-/.test(hl) ? ` (T-${String(hl.slice(2)).padStart(2, '0')})` : ''), ref)));
  out.push(P('**Результат:** ' + s.result));
  return out;
};
add(H(HeadingLevel.HEADING_2, '5.1. Штатные сценарии'));
M.scen.filter(s => s.grp === 'norm').forEach(s => add(scenBlock(s)));
add(H(HeadingLevel.HEADING_2, '5.2. Нештатные сценарии'));
add(H(HeadingLevel.HEADING_3, 'Оповещение и эскалация'));
add(M.escalation.map(s => P(s)));
M.scen.filter(s => s.grp === 'fail').forEach(s => add(scenBlock(s)));

/* 6, 7, 8 */
add(H(HeadingLevel.HEADING_1, '6. Влияние'));
add(P('Раздел в разработке.'));
add(H(HeadingLevel.HEADING_1, '7. Риски'));
add(T(M.risks, [0.8, 4.5, 4.7]), gap());
add(H(HeadingLevel.HEADING_1, '8. Принятые решения'));
add(P('Номера решений постоянные. Новые решения добавляются в конец таблицы.'));
add(T(M.decisions, [0.6, 5.4, 4]), gap());

/* Приложения */
add(H(HeadingLevel.HEADING_1, 'Приложение А. Документы'));
add(T(M.docs, [1.5, 8.5]), gap());
add(H(HeadingLevel.HEADING_1, 'Приложение Б. Сокращения'));
add(T(M.abbr, [2.5, 7.5]), gap());
add(H(HeadingLevel.HEADING_1, 'Приложение В. Открытые вопросы'));
add(T(M.questions, [0.8, 6.7, 2.5]), gap());
add(H(HeadingLevel.HEADING_1, 'Приложение Г. Этапы внедрения и их отличия от целевого решения'));
add(T(M.stages, [2, 4, 4]), gap());
add(H(HeadingLevel.HEADING_4, 'Отличия от целевого решения'));
add(M.diffs.map(s => LI(s)));
add(H(HeadingLevel.HEADING_1, 'Приложение Д. Матрица эскалации'));
add(P('Раздел в разработке.'));

add(H(HeadingLevel.HEADING_1, 'Приложение Е. Модель режимов аппарата'));
add(P('Приложение дополняет раздел 2.4.'));
add(H(HeadingLevel.HEADING_2, 'Е.1. Переходы'));
const tid = n => 'T-' + String(n).padStart(2, '0');
add(T([['№', 'Из', 'В', 'Инициатор и канал', 'Условие', 'Действия аппарата']].concat(M.trans.map(t => [tid(t.n), t.fromL, t.toL, t.who, t.cond, t.act])), [0.7, 1, 0.9, 2.4, 2.6, 2.6]), gap());
add(H(HeadingLevel.HEADING_2, 'Е.2. Причины отказа в приеме и учет времени'));
add(T(M.reasons, [2.2, 2.4, 2.2, 1.4, 1.8]), gap());
add(P(M.reasonsNote));
add(H(HeadingLevel.HEADING_2, 'Е.3. Отказы, требующие инженера'));
add(P(M.failures.intro));
add(M.failures.items.map(s => LI(s)));
add(P(M.failures.note));
add(H(HeadingLevel.HEADING_2, 'Е.4. Удаленные и сервисные команды'));
add(P(M.cmdsNote[0]));
const cellTxt = c => !c ? '—' : c[0] === 'y' ? 'да' : 'да, ' + c[1];
add(T([['Команда', 'Канал', 'Опасная', ...M.rcols, 'Примечание']].concat(M.cmds.map(c => [c.cmd, c.ch, c.danger, ...M.rcols.map(k => cellTxt(c.cells[k])), c.note])), [1.7, 1.2, 1.3, 0.8, 1.0, 0.8, 0.8, 0.9, 1.1, 1.6]), gap());
add(M.cmdsNote.slice(1).map(s => P(s)));
add(H(HeadingLevel.HEADING_2, 'Е.5. Состояния заказа'));
add(T(M.orderStates, [2, 2.3, 5.7]), gap());
add(P('Переходы состояний позиции:'));
add(T(M.orderTrans, [0.8, 1.6, 1.8, 5.8]), gap());
add(M.orderNotes.map(s => P(s)));
add(H(HeadingLevel.HEADING_2, 'Е.6. Параметры'));
add(T(M.params, [4, 6]), gap());

const numbering = {config: [
  {reference: 'bul', levels: [{level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: {paragraph: {indent: {left: 720, hanging: 360}}}}]},
  ...['num1', ...Array.from({length: 40}, (_, i) => 'sc' + i)].map(reference => ({reference, levels: [{level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: {paragraph: {indent: {left: 720, hanging: 360}}}}]}))
]};
const hs = (size, before, after, extra = {}) => ({run: {font: 'Arial', size, bold: true, ...extra}, paragraph: {spacing: {before, after}, keepNext: true, keepLines: true}});
const doc = new Document({
  creator: 'ООО «Кибершеф»',
  title: 'Концепция эксплуатации IPLAYSMART',
  features: {updateFields: true},
  styles: {
    default: {document: {run: {font: 'Arial', size: SZ}}},
    paragraphStyles: [
      {id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...hs(26, 360, 160), paragraph: {spacing: {before: 360, after: 160}, keepNext: true, outlineLevel: 0}},
      {id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...hs(22, 280, 120), paragraph: {spacing: {before: 280, after: 120}, keepNext: true, outlineLevel: 1}},
      {id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...hs(20, 240, 100), paragraph: {spacing: {before: 240, after: 100}, keepNext: true, outlineLevel: 2}},
      {id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: {font: 'Arial', size: 20, bold: true, italics: true}, paragraph: {spacing: {before: 200, after: 80}, keepNext: true, outlineLevel: 3}}
    ]
  },
  numbering,
  sections: [{
    properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1440, bottom: 1440, left: 873, right: 873}}, titlePage: true},
    footers: {
      default: new Footer({children: [new Paragraph({alignment: AlignmentType.RIGHT, children: [run(`${M.meta.code} · ревизия ${M.meta.rev} · стр. `, {size: 16, color: '666666'}), new TextRun({children: [PageNumber.CURRENT], size: 16, color: '666666'})]})]}),
      first: new Footer({children: [new Paragraph({children: []})]})
    },
    children: body
  }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log('Записано:', OUT, b.length, 'байт'); });
