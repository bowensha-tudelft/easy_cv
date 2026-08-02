/* Easy CV — 工具函数 + 内联图标（零外链） */
'use strict';

const $ = s => document.querySelector(s);

function showToast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, 2200);
}
const uid = (p = 'b') => p + '_' + Math.random().toString(36).slice(2, 8);
const deepClone = x => structuredClone(x);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function escapeHTML(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function inlineMarkup(s) { // **bold** → <strong>
  return escapeHTML(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function renderLightMarkup(text) { // - 列表 / **加粗** / 空行分段
  const lines = String(text == null ? '' : text).split('\n');
  const out = [];
  let ul = false;
  const closeUl = () => { if (ul) { out.push('</ul>'); ul = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeUl(); continue; }
    if (line.startsWith('- ')) {
      if (!ul) { out.push('<ul>'); ul = true; }
      out.push('<li>' + inlineMarkup(line.slice(2)) + '</li>');
    } else {
      closeUl();
      out.push('<p>' + inlineMarkup(line) + '</p>');
    }
  }
  closeUl();
  return out.join('');
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(ym, fmt) {
  if (!ym) return '';
  const p = String(ym).split('-');
  if (!p[0]) return '';
  if (!p[1]) return p[0];
  if (fmt === 'YYYY-MM') return p[0] + '-' + p[1];
  const mi = parseInt(p[1], 10) - 1;
  return (MONTHS[mi] || p[1]) + ' ' + p[0];
}
function rangeText(start, end, current, fmt) {
  const f = v => fmtDate(v, fmt);
  if (current) return (start ? f(start) + ' – ' : '') + 'Present';
  if (start && end) return f(start) + ' – ' + f(end);
  return f(start) || f(end) || '';
}
function detectCJK(blocks) {
  return /[㐀-䶿一-鿿豈-﫿]/g.test(JSON.stringify(blocks));
}

/* ---- 图标 ---- */
const ICONS = {
  user:      '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  email:     '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  phone:     '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  location:  '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  github:    '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
  linkedin:  '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V8h4v2a6 6 0 0 1 2-2Z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  scholar:   '<path d="M22 9 12 4 2 9l10 5 10-5Z"/><path d="M6 11v5c0 1 2.7 3 6 3s6-2 6-3v-5"/>',
  website:   '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>',
  orcid:     '<circle cx="12" cy="12" r="10"/><path d="M8 9h1v6H8z"/><circle cx="15" cy="9" r="1"/><path d="M15 11v4"/>',
  generic:   '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  education: '<path d="M22 9 12 4 2 9l10 5 10-5Z"/><path d="M6 11v5c0 1 2.7 3 6 3s6-2 6-3v-5"/>',
  folder:    '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  zap:       '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  grid:      '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  flask:     '<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/>'
};
const ICON_LABELS = {
  email: 'Email', phone: 'Phone', location: 'Location', github: 'GitHub',
  linkedin: 'LinkedIn', scholar: 'Google Scholar', website: 'Website', orcid: 'ORCID', generic: 'Link'
};
function icon(name, cls) {
  const body = ICONS[name] || ICONS.generic;
  return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
}

/* ---- 主题色（accent）工具 ---- */
function isValidHex(v) { return /^#[0-9a-fA-F]{6}$/.test(String(v || '')); }
// 统一解析：接受 #RGB / #RRGGBB / rgb(r,g,b)（整数或百分比），归一化为 #rrggbb
function parseColor(str) {
  const s = String(str == null ? '' : str).trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (/^[0-9a-f]{3}$/.test(h)) h = h.split('').map(c => c + c).join('');
    if (/^[0-9a-f]{6}$/.test(h)) return '#' + h;
    if (/^[0-9a-f]{8}$/.test(h)) return '#' + h.slice(0, 6);
    return null;
  }
  const m = s.match(/^rgb\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*\)$/);
  if (m) {
    const to255 = v => v.endsWith('%') ? Math.round(parseFloat(v) / 100 * 255) : Math.round(parseFloat(v));
    const vals = [m[1], m[2], m[3]].map(to255);
    if (vals.every(v => v >= 0 && v <= 255)) return '#' + vals.map(v => v.toString(16).padStart(2, '0')).join('');
    return null;
  }
  return null;
}
function normalizeAccent(v) { return parseColor(v) || DEFAULT_ACCENT; }
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
}
function randomAccent() {
  // 随机色相，饱和/亮度控制在中暗区间，保证在白底上好看
  const h = Math.floor(Math.random() * 360);
  const s = 45 + Math.floor(Math.random() * 30);
  const l = 28 + Math.floor(Math.random() * 16);
  return hslToHex(h, s, l);
}

/* ---- 旧数据迁移 ----
   experience → research；
   旧 custom（title/subtitle/rightText/columns/body）→ 继承 experience 字段（title 保留为小节标题） */
function migrateBlock(b) {
  if (!b || typeof b !== 'object') return;
  if (b.type === 'experience') b.type = 'research';
  if (b.type === 'custom' && b.data && b.data.position === undefined) {
    const d = b.data;
    const lines = String(d.body || '').split('\n').map(s => s.trim()).filter(Boolean);
    d.position = d.subtitle || '';
    d.organization = '';
    d.location = '';
    d.startDate = '';
    d.endDate = '';
    d.current = false;
    d.url = '';
    d.summary = lines.filter(s => !s.startsWith('- ')).join('\n');
    d.highlights = lines.filter(s => s.startsWith('- ')).map(s => s.slice(2));
    delete d.subtitle; delete d.rightText; delete d.columns; delete d.body;
  }
}
