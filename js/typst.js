/* Easy CV — Typst 源码生成 + 导出 */
'use strict';

/* ---- Typst 转义 ---- */
function escTypst(s) { // 用于 Typst 内容块 [ ... ]；@ 是引用语法，~ 是非断空格
  return String(s == null ? '' : s).replace(/([\\#$*_`\[\]@~])/g, '\\$1');
}
function escTypstStr(s) { // 用于 Typst 字符串 " ... "
  return String(s == null ? '' : s).replace(/[\\"]/g, '\\$1');
}

const TYPST_FONTS = {
  classic: 'Libertinus Serif',
  modern: 'New Computer Modern Sans'
};

/* ---- 文档模板头部 ---- */
function typstPreamble(accent, font) {
  return `#set page("a4", margin: (x: 15mm, y: 16mm))
#set text(size: 10.5pt, fill: rgb("#1c1e21"), font: "${font}")
#set par(leading: 0.55em, spacing: 0.4em)

#let accent = rgb("${accent}")
#let sec(t) = block(above: 8pt, below: 3pt)[
  #text(weight: "bold", size: 10pt, fill: accent, tracking: 0.5pt)[#upper(t)]
  #v(1pt)
  #line(length: 100%, stroke: 0.4pt + rgb("#bbbbbb"))
  #v(4pt)
]
#let entry(head, right: none) = grid(
  columns: (1fr, auto), column-gutter: 6pt,
)[
  #head
][
  #if right != none [
    #v(1fr)
    #text(size: 9pt, fill: rgb("#555555"))[#right]
  ]
]
#let small(t) = text(size: 9pt)[#t]
#let sub(t) = text(weight: "bold")[#t]
#let bl(..items) = list(..items)

`;
}

/* ---- 各块类型生成 ---- */
function entryTypst(o, ctx) {
  const esc = ctx.esc;
  const out = [];
  // entry(...) 的参数是 code mode，sub 不能带 #；内容块内部才用 #small
  let head = 'sub[' + (o.title ? esc(o.title) : '');
  if (o.org) head += '\n#small[' + esc(o.org) + ']';
  head += ']';
  const right = o.date ? '"' + ctx.escStr(o.date) + '"' : 'none';
  out.push(`#entry(${head}, right: ${right})`);
  if (o.summary) out.push(esc(o.summary));
  if (o.score) out.push(esc(o.score));
  if (o.tags && o.tags.length) out.push(o.tags.map(esc).join('  ·  '));
  if (o.highlights && o.highlights.length) out.push(`#bl(${o.highlights.filter(Boolean).map(h => '[' + esc(h) + ']').join(', ')})`);
  if (o.url) out.push(`#link("${ctx.escStr(o.url)}")[${esc(o.url)}]`);
  out.push('#v(4pt)');
  return out.join('\n');
}
function typstHeader(b, ctx) {
  const d = b.data, esc = ctx.esc;
  const out = [];
  if (d.name) out.push(`#text(size: 19pt, weight: "bold", fill: accent)[${esc(d.name)}]`);
  if (d.title) out.push(`#text(size: 11pt)[${esc(d.title)}]`);
  const contact = [d.email, d.phone, d.location].filter(Boolean);
  if (contact.length) out.push(`#text(size: 9.5pt)[${contact.map(esc).join('  ·  ')}]`);
  const links = (d.links || []).filter(l => l.url);
  if (links.length) out.push('#text(size: 9.5pt)[' + links.map(l => `#link("${ctx.escStr(l.url)}")[${esc(l.label || ICON_LABELS[l.icon] || l.url)}]`).join('  ·  ') + ']');
  if (d.summary) out.push(`#text(size: 10pt)[${esc(d.summary)}]`);
  out.push('#v(8pt)');
  return out.join('\n#v(2pt)\n');
}
function typstEducation(b, ctx) {
  const d = b.data;
  const head = [d.degree, d.area ? 'in ' + d.area : ''].filter(Boolean).join(' ');
  const org = [d.institution, d.location].filter(Boolean).join(' · ');
  return entryTypst({ title: head, org, date: ctx.range(d.startDate, d.endDate, d.current), score: d.score ? 'GPA: ' + d.score : '', tags: d.courses, highlights: d.highlights }, ctx);
}
function typstWorkResearch(b, ctx) {
  const d = b.data;
  const org = [d.organization, d.location].filter(Boolean).join(' · ');
  return entryTypst({ title: d.position, org, date: ctx.range(d.startDate, d.endDate, d.current), summary: d.summary, url: d.url, highlights: d.highlights }, ctx);
}
function typstProjects(b, ctx) {
  const d = b.data;
  const roles = (d.roles || []).join(', ');
  return entryTypst({ title: d.name, org: roles, date: ctx.range(d.startDate, d.endDate, d.current), summary: d.description, url: d.url, tags: d.keywords, highlights: d.highlights }, ctx);
}
function typstSkills(b, ctx) {
  const d = b.data, esc = ctx.esc;
  let s = '#text(size: 10pt)[';
  if (d.name) s += '*' + esc(d.name) + '*';
  if ((d.keywords || []).length) s += ': ' + d.keywords.map(esc).join(', ');
  if (d.showLevel && d.level) s += '  ·  ' + esc(d.level);
  s += ']\n#v(2pt)';
  return s;
}
function typstCustom(b, ctx) {
  const d = b.data;
  let out = '';
  if (d.title) out += '\n#sec("' + ctx.escStr(d.title) + '")\n';
  const org = [d.organization, d.location].filter(Boolean).join(' · ');
  out += entryTypst({ title: d.position, org, date: ctx.range(d.startDate, d.endDate, d.current), summary: d.summary, highlights: d.highlights }, ctx);
  return out;
}

function renderTypst(b, ctx) {
  switch (b.type) {
    case 'header': return typstHeader(b, ctx);
    case 'education': return typstEducation(b, ctx);
    case 'work':
    case 'research': return typstWorkResearch(b, ctx);
    case 'projects': return typstProjects(b, ctx);
    case 'skills': return typstSkills(b, ctx);
    case 'custom': return typstCustom(b, ctx);
    default: return '';
  }
}

/* ---- 生成完整 .typ 源码 ---- */
function typstDoc(state) {
  const theme = THEMES[state.theme] ? state.theme : 'classic';
  const accent = normalizeAccent(state.accent);
  const font = TYPST_FONTS[theme] || TYPST_FONTS.classic;
  const fmt = (state.meta && state.meta.dateFormat) || 'MMM YYYY';
  const ctx = {
    esc: escTypst,
    escStr: escTypstStr,
    fmtDate: v => fmtDate(v, fmt),
    range: (s, e, c) => rangeText(s, e, c, fmt)
  };
  let out = typstPreamble(accent, font);
  let lastType = null;
  for (const b of state.blocks) {
    if (b.visible === false) continue;
    const t = BlockRegistry.get(b.type);
    if (!t) continue;
    if (t.sectionTitle && b.type !== lastType) out += '\n#sec("' + escTypstStr(t.sectionTitle) + '")\n';
    out += renderTypst(b, ctx) + '\n';
    lastType = b.type;
  }
  return out;
}

/* ---- 导出入口 ---- */
function downloadTypstSource() {
  downloadBlob(new Blob([typstDoc(store.state)], { type: 'text/plain;charset=utf-8' }), 'easy-cv.typ');
  showToast('已下载 easy-cv.typ（可用 typst CLI 或 typst.app/playground 编译）');
}
async function exportTypstPDF() {
  const src = typstDoc(store.state);
  try {
    showToast('正在加载 Typst 编译器（首次约 28MB，联网一次）…');
    const mod = await import('https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0/+esm');
    const compiler = await mod.TypstCompiler.create();
    const pdf = await compiler.compile(src, { format: 'pdf' });
    downloadBlob(new Blob([pdf], { type: 'application/pdf' }), 'easy-cv.pdf');
    showToast('已导出 Typst PDF（easy-cv.pdf）');
  } catch (e) {
    console.error(e);
    showToast('Typst PDF 导出失败：' + e.message + '（可先用「下载 .typ 源码」离线编译）');
  }
}
