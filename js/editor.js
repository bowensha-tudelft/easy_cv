/* Easy CV — 编辑器 UI：块列表、表单字段、tags/links 子组件、弹层 */
'use strict';

/* ---- 表单字段渲染 ---- */
function bulletRowHTML(val, i) {
  return '<div class="bullet-row"><input type="text" data-bl="' + i + '" value="' + escapeHTML(val || '') + '" placeholder="项目符号内容"><span class="blk-btn del" data-act="rmbullet" data-i="' + i + '" title="删除">✕</span></div>';
}
function linkRowHTML(l, i) {
  const opts = Object.keys(ICONS).map(k =>
    '<option value="' + k + '"' + (k === l.icon ? ' selected' : '') + '>' + (ICON_LABELS[k] || k) + '</option>').join('');
  return '<div class="link-row">'
    + '<select data-lk="icon" data-i="' + i + '">' + opts + '</select>'
    + '<input type="text" data-lk="label" data-i="' + i + '" value="' + escapeHTML(l.label || '') + '" placeholder="标签">'
    + '<input type="url" data-lk="url" data-i="' + i + '" value="' + escapeHTML(l.url || '') + '" placeholder="https://...">'
    + '<span class="blk-btn del" data-act="rmlink" data-i="' + i + '" title="删除">✕</span>'
    + '</div>';
}
function fieldHTML(b, f) {
  const val = b.data[f.key];
  const v = val == null ? '' : val;
  switch (f.type) {
    case 'text': case 'url': case 'email': {
      const type = f.type === 'email' ? 'email' : (f.type === 'url' ? 'url' : 'text');
      return '<div class="field" data-key="' + f.key + '"><label>' + f.label + '</label><input type="' + type + '" data-field="' + f.key + '" value="' + escapeHTML(v) + '"></div>';
    }
    case 'month':
      return '<div class="field" data-key="' + f.key + '"><label>' + f.label + '</label><input type="month" data-field="' + f.key + '" value="' + escapeHTML(v) + '"></div>';
    case 'checkbox':
      return '<div class="field" data-key="' + f.key + '"><label class="chk"><input type="checkbox" data-field="' + f.key + '"' + (v ? ' checked' : '') + '> ' + f.label + '</label></div>';
    case 'textarea':
      return '<div class="field" data-key="' + f.key + '"><label>' + f.label + '</label><textarea data-field="' + f.key + '">' + escapeHTML(v) + '</textarea></div>';
    case 'bullets': {
      const rows = (v || []).map((bl, i) => bulletRowHTML(bl, i)).join('');
      return '<div class="field" data-key="' + f.key + '"><label>' + f.label + '</label><div class="bullets" data-rows>' + rows + '</div><button class="btn small" data-act="addbullet">+ 添加条目</button></div>';
    }
    case 'tags': {
      const chips = (v || []).map(t => '<span class="chip">' + escapeHTML(t) + '<span class="x" data-act="chip-del" data-tag="' + escapeHTML(t) + '">×</span></span>').join('');
      return '<div class="field" data-key="' + f.key + '"><label>' + f.label + '</label><div class="tags"><div class="chips">' + chips + '</div><input class="tag-input" placeholder="输入后回车添加"></div></div>';
    }
    case 'links': {
      const rows = (v || []).map((l, i) => linkRowHTML(l, i)).join('');
      return '<div class="field" data-key="links"><label>' + f.label + '</label><div class="links">' + rows + '</div><button class="btn small" data-act="addlink">+ 添加链接</button></div>';
    }
    case 'select': {
      const opts = (f.options || []).map(o => '<option value="' + escapeHTML(o.v) + '"' + (o.v === v ? ' selected' : '') + '>' + escapeHTML(o.l) + '</option>').join('');
      return '<div class="field" data-key="' + f.key + '"><label>' + f.label + '</label><select data-field="' + f.key + '">' + opts + '</select></div>';
    }
  }
  return '';
}
function renderFields(b, t) {
  const rows = [];
  let buf = [];
  const flush = () => { if (buf.length) { rows.push('<div class="field-row">' + buf.join('') + '</div>'); buf = []; } };
  for (const f of t.fields) {
    if (f.inline) { buf.push(fieldHTML(b, f)); continue; }
    flush();
    rows.push(fieldHTML(b, f));
  }
  flush();
  return rows.join('');
}

/* ---- 块卡片 ---- */
function blockCardHTML(b) {
  const t = BlockRegistry.get(b.type);
  const label = t ? t.label : b.type;
  const iconName = t ? t.icon : 'grid';
  const sum = blockSummary(b);
  return '<div class="block-card' + (b.collapsed ? ' collapsed' : '') + '" data-block-id="' + b.id + '">'
    + '<div class="block-head" data-action="toggle">'
    + icon(iconName, 'blk-icon')
    + '<span class="type">' + escapeHTML(label) + '</span>'
    + (sum ? '<span class="meta">' + escapeHTML(sum) + '</span>' : '')
    + '<span class="spacer"></span>'
    + '<span class="blk-btn" data-action="up" title="上移">↑</span>'
    + '<span class="blk-btn" data-action="down" title="下移">↓</span>'
    + '<span class="blk-btn" data-action="menu" title="更多">⋯</span>'
    + '</div>'
    + (b.collapsed ? '' : '<div class="block-body">' + renderFields(b, t) + '</div>')
    + '</div>';
}
function renderEditor() {
  const list = $('#block-list');
  if (store.state.blocks.length === 0) {
    list.innerHTML = '<div class="pane-title" style="padding:20px;text-align:center">还没有块。<br>点右下角 <b>+</b> 开始添加。</div>';
    return;
  }
  list.innerHTML = store.state.blocks.map(blockCardHTML).join('');
}
function focusBlock(id) {
  const card = document.querySelector('.block-card[data-block-id="' + id + '"]');
  if (!card) return;
  card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  const first = card.querySelector('input, textarea, select');
  if (first) first.focus();
  card.classList.remove('hl'); void card.offsetWidth; card.classList.add('hl');
}
function updateToolbar() {
  $('#btn-undo').disabled = !store.canUndo();
  $('#btn-redo').disabled = !store.canRedo();
}

/* ---- tags / links 子组件 ---- */
function updateChipsFor(id, arr) {
  const card = document.querySelector('.block-card[data-block-id="' + id + '"]');
  if (!card) return;
  const chipsEl = card.querySelector('.tags .chips');
  if (chipsEl) chipsEl.innerHTML = arr.map(t => '<span class="chip">' + escapeHTML(t) + '<span class="x" data-act="chip-del" data-tag="' + escapeHTML(t) + '">×</span></span>').join('');
}
function addTag(id, key, tag) {
  const b = store.state.blocks.find(x => x.id === id);
  if (!b) return;
  const arr = [...(b.data[key] || []), tag];
  store.setField(id, key, arr);
  updateChipsFor(id, arr);
}
function removeTag(id, key, tag) {
  const b = store.state.blocks.find(x => x.id === id);
  if (!b) return;
  const arr = (b.data[key] || []).filter(t => t !== tag);
  store.setField(id, key, arr);
  updateChipsFor(id, arr);
}
function renderLinkRows(id) {
  const b = store.state.blocks.find(x => x.id === id);
  const card = document.querySelector('.block-card[data-block-id="' + id + '"]');
  if (!b || !card) return;
  const wrap = card.querySelector('.links');
  if (wrap) wrap.innerHTML = (b.data.links || []).map((l, i) => linkRowHTML(l, i)).join('');
}
function updateLink(id, i, k, val) {
  const b = store.state.blocks.find(x => x.id === id);
  if (!b) return;
  const links = [...(b.data.links || [])];
  if (!links[i]) return;
  links[i][k] = val;
  store.setField(id, 'links', links);
}
function addLinkRow(id) {
  const b = store.state.blocks.find(x => x.id === id);
  if (!b) return;
  const links = [...(b.data.links || []), { id: uid('l'), label: '', icon: 'website', url: '' }];
  store.setField(id, 'links', links);
  renderLinkRows(id);
}
function removeLinkRow(id, i) {
  const b = store.state.blocks.find(x => x.id === id);
  if (!b) return;
  const links = (b.data.links || []).filter((_, j) => j !== i);
  store.setField(id, 'links', links);
  renderLinkRows(id);
}

/* ---- bullets 行编辑器（每个项目符号一行输入框，类似添加链接） ---- */
function renderBulletRows(id, key) {
  const b = store.state.blocks.find(x => x.id === id);
  const card = document.querySelector('.block-card[data-block-id="' + id + '"]');
  if (!b || !card) return;
  const wrap = card.querySelector('.field[data-key="' + key + '"] [data-rows]');
  if (wrap) wrap.innerHTML = (b.data[key] || []).map((bl, i) => bulletRowHTML(bl, i)).join('');
}
function updateBullet(id, key, i, val) {
  const b = store.state.blocks.find(x => x.id === id);
  if (!b) return;
  const arr = [...(b.data[key] || [])];
  if (arr[i] === undefined) return;
  arr[i] = val;
  store.setField(id, key, arr);
}
function addBullet(id, key) {
  const b = store.state.blocks.find(x => x.id === id);
  if (!b) return;
  const arr = [...(b.data[key] || []), ''];
  store.setField(id, key, arr);
  renderBulletRows(id, key);
}
function removeBullet(id, key, i) {
  const b = store.state.blocks.find(x => x.id === id);
  if (!b) return;
  const arr = (b.data[key] || []).filter((_, j) => j !== i);
  store.setField(id, key, arr);
  renderBulletRows(id, key);
}

/* ---- 弹层 ---- */
let menuBlockId = null;
let addMenuAfterId = null;
function showMenu(el, rect) {
  el.hidden = false;
  const r = el.getBoundingClientRect();
  let x = rect.left, y = rect.bottom + 4;
  if (x + r.width > window.innerWidth - 8) x = window.innerWidth - r.width - 8;
  if (y + r.height > window.innerHeight - 8) y = rect.top - r.height - 4;
  el.style.left = x + 'px'; el.style.top = y + 'px';
}
function hideMenus() { document.querySelectorAll('.menu').forEach(m => m.hidden = true); }
