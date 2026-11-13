"""Заполняет «Приложение Д. Матрица эскалации» в docx, остальной текст не трогает.
Документ правится вручную в Word, поэтому он больше не пересобирается из модели целиком:
скрипт заменяет только содержимое между заголовками приложений Д и Е.
Запуск: python tools/fill_escalation.py <вход.docx> <выход.docx>. Данные — M.esc из model/ips-model.js (нужен node)."""
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
W = 10160
NUM_ID = '90'  # своя нумерация шагов Д.1, чтобы не продолжать чужие списки


def load_esc():
    js = "process.stdout.write(JSON.stringify(require(process.argv[1]).esc))"
    out = subprocess.run(['node', '-e', js, str(ROOT / 'model' / 'ips-model.js')], capture_output=True, check=True)
    return json.loads(out.stdout.decode('utf-8'))


def run(t, bold=False, sz=None):
    rpr = ('<w:b/><w:bCs/>' if bold else '') + (f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>' if sz else '')
    return f'<w:r>{"<w:rPr>" + rpr + "</w:rPr>" if rpr else ""}<w:t xml:space="preserve">{escape(t)}</w:t></w:r>'


def para(t):
    return f'<w:p><w:pPr><w:spacing w:before="120" w:after="120" w:line="288" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>{run(t)}</w:p>'


def head(style, t):
    return f'<w:p><w:pPr><w:pStyle w:val="{style}"/></w:pPr>{run(t)}</w:p>'


def item(t, num_id):
    return (f'<w:p><w:pPr><w:pStyle w:val="a4"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num_id}"/></w:numPr>'
            f'<w:spacing w:before="40" w:after="40" w:line="288" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>{run(t)}</w:p>')


def table(rows, weights, sz=None, center_cols=()):
    total = sum(weights)
    cw = [int(W * w / total) for w in weights]
    cw[-1] += W - sum(cw)
    b = ''.join(f'<w:{s} w:val="single" w:sz="8" w:space="0" w:color="000000"/>' for s in ('top', 'left', 'bottom', 'right'))
    out = ['<w:tbl><w:tblPr><w:tblW w:w="10160" w:type="dxa"/><w:tblBorders>'
           + ''.join(f'<w:{s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>' for s in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'))
           + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="10" w:type="dxa"/><w:right w:w="10" w:type="dxa"/></w:tblCellMar>'
           '<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr><w:tblGrid>'
           + ''.join(f'<w:gridCol w:w="{w}"/>' for w in cw) + '</w:tblGrid>']
    for i, r in enumerate(rows):
        hdr = i == 0
        out.append('<w:tr><w:trPr><w:cantSplit/>' + ('<w:tblHeader/>' if hdr else '') + '</w:trPr>')
        for j, c in enumerate(r):
            shd = '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' if hdr else ''
            jc = 'center' if hdr or j in center_cols else 'left'
            out.append(f'<w:tc><w:tcPr><w:tcW w:w="{cw[j]}" w:type="dxa"/><w:tcBorders>{b}</w:tcBorders>{shd}'
                       '<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>'
                       f'<w:p><w:pPr><w:spacing w:line="264" w:lineRule="auto"/><w:jc w:val="{jc}"/></w:pPr>{run(str(c), bold=hdr, sz=sz)}</w:p></w:tc>')
        out.append('</w:tr>')
    out.append('</w:tbl>')
    return ''.join(out)


def gap():
    return '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>'


def build(esc):
    mark = {'p': '●', 's': '○'}
    routes = esc['routes']
    x = [para(p) for p in esc['intro']]
    x.append(head('2', 'Д.1. Порядок обработки инцидента'))
    x += [item(s, NUM_ID) for s in esc['steps']]
    x.append(head('2', 'Д.2. Направления эскалации'))
    rows = [['Направление', 'Канал', 'Что решает', 'Что передает дежурный']]
    rows += [[r['name'], r['ch'], r['what'], r['give']] for r in routes]
    rows += [[s['name'], 'Через инженера-интегратора КШ', s['what'], '—'] for s in esc['second']]
    x += [table(rows, [2, 1.8, 3.6, 2.6]), gap()]
    x.append(head('2', 'Д.3. Матрица эскалации по типам инцидентов'))
    x.append(para('● — основное направление, ○ — при необходимости. Тилпос — СП Тилпос, КШ — инженер-интегратор КШ, ТТ — сотрудник ТТ, Выезд — выезд сервисного инженера.'))
    rows = [['№', 'Инцидент', 'Признак в платформе', 'Блокирует продажи', 'Первое действие дежурного', 'Тилпос', 'КШ', 'ТТ', 'Выезд', 'Закрытие']]
    for n, name, sign, kind, first, rt, close in esc['incidents']:
        rows.append([n, name, sign, 'да' if kind == 'Блокирующий' else 'нет', first] + [mark.get(rt.get(r['id']), '') for r in routes] + [close])
    x += [table(rows, [0.7, 1.4, 1.5, 1.3, 2.2, 1.0, 0.55, 0.55, 1.0, 1.65], sz=16, center_cols=(3, 5, 6, 7, 8)), gap()]
    x.append(head('2', 'Д.4. Закрытие инцидента'))
    x.append(para('Дежурный закрывает инцидент, когда выполнены условия:'))
    x += [item(s, '2') for s in esc['closing']]
    x.append(para(esc['note']))
    return ''.join(x)


def add_numbering(numbering):
    """Новая нумерация на основе первого десятичного списка с началом с 1."""
    if f'w:numId="{NUM_ID}"' in numbering:
        return numbering
    absid = re.search(r'<w:abstractNum [^>]*w:abstractNumId="(\d+)"(?:(?!</w:abstractNum>).)*?<w:numFmt w:val="decimal"', numbering, re.S).group(1)
    num = (f'<w:num w:numId="{NUM_ID}"><w:abstractNumId w:val="{absid}"/>'
           '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>')
    i = numbering.rfind('</w:num>') + len('</w:num>')
    return numbering[:i] + num + numbering[i:]


def main(src, dst):
    esc = load_esc()
    zin = zipfile.ZipFile(src)
    doc = zin.read('word/document.xml').decode('utf-8')
    # заголовок в тексте, а не в оглавлении: у него стиль 1, а не стиль строки оглавления
    h_d = re.search(r'<w:p [^>]*><w:pPr><w:pStyle w:val="1"/></w:pPr>(?:(?!</w:p>).)*Приложение Д\. Матрица эскалации.*?</w:p>', doc, re.S)
    h_e = re.search(r'<w:p [^>]*><w:pPr><w:pStyle w:val="1"/></w:pPr>(?:(?!</w:p>).)*Приложение Е\. Модель режимов', doc[h_d.end():], re.S)
    if not h_d or not h_e:
        sys.exit('Не найдены заголовки приложений Д и Е')
    end = h_d.end() + h_e.start()
    old = doc[h_d.end():end]
    if 'Д.1. Порядок' in old:
        print('Приложение Д уже заполнено, содержимое будет заменено')
    doc = doc[:h_d.end()] + build(esc) + doc[end:]
    num = add_numbering(zin.read('word/numbering.xml').decode('utf-8'))
    # через временный файл, чтобы можно было писать поверх входного
    tmp = Path(str(dst) + '.tmp')
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
        for it in zin.infolist():
            data = zin.read(it.filename)
            if it.filename == 'word/document.xml':
                data = doc.encode('utf-8')
            elif it.filename == 'word/numbering.xml':
                data = num.encode('utf-8')
            zout.writestr(it, data)
    zin.close()
    tmp.replace(dst)
    print('Записано:', dst)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
