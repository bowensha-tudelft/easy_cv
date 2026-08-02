/* Easy CV — 事件绑定 + 启动 */
'use strict';

let store = null;
let editingSwatch = null;
let swatchMenuHex = null;

function bindEvents() {
  const list = $('#block-list');

  // 关闭弹层（点空白处）
  document.addEventListener('click', e => {
    if (!e.target.closest('.menu') && !e.target.closest('[data-act="add-block"]') && !e.target.closest('[data-action="menu"]')) hideMenus();
  });

  // 块级操作（在 .block-card 内部）
  list.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const card = a.closest('.block-card');
    const id = card ? card.dataset.blockId : null;
    switch (a.dataset.action) {
      case 'toggle': store.toggleCollapsed(id); break;
      case 'up': store.moveBlock(id, -1); break;
      case 'down': store.moveBlock(id, 1); break;
      case 'menu': menuBlockId = id; showMenu($('#blockMenu'), a.getBoundingClientRect()); break;
    }
  });

  // 文本输入 → 更新状态（预览即时刷新，编辑器不重建以保留焦点）
  list.addEventListener('input', e => {
    const el = e.target;
    if (el.matches('[data-field]')) {
      const card = el.closest('.block-card');
      const id = card.dataset.blockId;
      store.setField(id, el.dataset.field, el.value);
      return;
    }
    if (el.matches('[data-lk]')) {
      const card = el.closest('.block-card');
      const id = card.dataset.blockId;
      updateLink(id, +el.dataset.i, el.dataset.lk, el.value);
      return;
    }
    if (el.matches('[data-bl]')) {
      const card = el.closest('.block-card');
      const id = card.dataset.blockId;
      const key = el.closest('.field').dataset.key;
      updateBullet(id, key, +el.dataset.bl, el.value);
    }
  });

  // checkbox / select
  list.addEventListener('change', e => {
    const el = e.target;
    if (el.matches('input[type=checkbox][data-field]')) {
      const card = el.closest('.block-card');
      const id = card.dataset.blockId;
      const key = el.dataset.field;
      store.setField(id, key, el.checked);
      if (key === 'current') {
        const wrap = card.querySelector('[data-key="endDate"]');
        if (wrap) wrap.classList.toggle('hidden', el.checked);
      }
      return;
    }
    if (el.matches('select[data-field]')) {
      const card = el.closest('.block-card');
      store.setField(card.dataset.blockId, el.dataset.field, el.value);
    }
  });

  // tags 回车添加
  list.addEventListener('keydown', e => {
    if (e.target.matches('.tag-input') && e.key === 'Enter') {
      e.preventDefault();
      const card = e.target.closest('.block-card');
      const key = e.target.closest('.field').dataset.key;
      const v = e.target.value.trim();
      if (v) { addTag(card.dataset.blockId, key, v); e.target.value = ''; }
    }
  });

  // 全局操作
  document.addEventListener('click', e => {
    const p = e.target.closest('[data-act]');
    if (!p) return;
    const card = p.closest('.block-card');
    const id = card ? card.dataset.blockId : null;
    switch (p.dataset.act) {
      case 'chip-del': {
        const key = p.closest('.field').dataset.key;
        removeTag(id, key, p.dataset.tag);
        break;
      }
      case 'addlink': addLinkRow(id); break;
      case 'rmlink': removeLinkRow(id, +p.dataset.i); break;
      case 'addbullet': { const k = p.closest('.field').dataset.key; addBullet(id, k); break; }
      case 'rmbullet': { const k = p.closest('.field').dataset.key; removeBullet(id, k, +p.dataset.i); break; }
      case 'add-block': addMenuAfterId = null; showMenu($('#addMenu'), p.getBoundingClientRect()); break;
      case 'pick-type': {
        const bid = store.addBlock(p.dataset.type, addMenuAfterId);
        hideMenus(); focusBlock(bid);
        break;
      }
      case 'menu-insert': addMenuAfterId = menuBlockId; showMenu($('#addMenu'), p.getBoundingClientRect()); break;
      case 'menu-dup': { const nid = store.duplicateBlock(menuBlockId); hideMenus(); focusBlock(nid); break; }
      case 'menu-del': store.deleteBlock(menuBlockId); hideMenus(); break;
      case 'undo': store.undo(); break;
      case 'redo': store.redo(); break;
      case 'print': printPDF(); break;
      case 'import': $('#import-file').click(); break;
      case 'export': exportJSON('app'); break;
      case 'dd-typst': showMenu($('#typstMenu'), p.getBoundingClientRect()); break;
      case 'typst-source': downloadTypstSource(); hideMenus(); break;
      case 'typst-pdf': exportTypstPDF(); hideMenus(); break;
      case 'theme': store.setTheme(p.dataset.theme); hideMenus(); break;
      case 'dd-theme': showMenu($('#themeMenu'), p.getBoundingClientRect()); break;
      case 'dd-color': syncAccentUI(); showMenu($('#colorMenu'), p.getBoundingClientRect()); break;
      case 'accent-pick': editingSwatch = null; setAddBtnLabel(); $('#swatchMenu').hidden = true; store.setAccent(p.dataset.accent); syncAccentUI(); break;
      case 'accent-add': addCustomColor(); break;
      case 'swatch-edit': startEditSwatch(swatchMenuHex); break;
      case 'swatch-del': removeCustomColor(swatchMenuHex); hideMenus(); showToast('已删除 ' + swatchMenuHex); break;
      case 'accent-random': { const hex = randomAccent(); store.setAccent(hex); syncAccentUI(); showToast('随机配色 ' + hex); break; }
      case 'dd-settings': openSettings(); break;
      case 'save-settings': saveSettings(); break;
      case 'close-settings': closeSettings(); break;
    }
  });

  // 导入文件
  $('#import-file').addEventListener('change', e => { if (e.target.files[0]) importJSONFile(e.target.files[0]); e.target.value = ''; });

  // 配色输入框回车：编辑模式保存修改，否则应用为主题色
  $('#accent-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); editingSwatch ? addCustomColor() : applyAccentInput(); } });

  // 打印提示：浏览器自带的页眉/页脚无法用 CSS 去除，需在打印对话框取消勾选
  window.addEventListener('beforeprint', () => {
    showToast('打印时请取消勾选「页眉和页脚」，否则会带出日期和页面标题');
  });

  // 自定义色块：右键弹出修改/删除菜单
  $('#color-swatches').addEventListener('contextmenu', e => {
    const sw = e.target.closest('.swatch');
    if (!sw || !sw.dataset.custom) return;
    e.preventDefault();
    swatchMenuHex = sw.dataset.accent;
    showMenu($('#swatchMenu'), { left: e.clientX, top: e.clientY, bottom: e.clientY, right: e.clientX });
  });

  // 快捷键
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && !e.shiftKey && k === 'z') { e.preventDefault(); store.undo(); }
    else if (mod && (k === 'y' || (e.shiftKey && k === 'z'))) { e.preventDefault(); store.redo(); }
    else if (mod && !e.shiftKey && k === 's') { e.preventDefault(); saveJSONFile(); }
  });

}

function loadInitial() {
  let state;
  try {
    const raw = localStorage.getItem('easy_cv.draft');
    if (raw) state = JSON.parse(raw);
  } catch (e) { /* 忽略 */ }
  if (!state) state = deepClone(SAMPLE);
  if (!THEMES[state.theme]) state.theme = 'classic';
  if (!isValidHex(state.accent)) state.accent = DEFAULT_ACCENT;
  // 兼容旧数据：experience→research；旧 custom→继承 experience 字段
  for (const b of state.blocks) {
    migrateBlock(b);
    // 块默认折叠（已有折叠状态则尊重）
    if (typeof b.collapsed !== 'boolean') b.collapsed = true;
  }
  return state;
}

/* ---- 配色菜单 ---- */
function getCustomColors() {
  try {
    const raw = localStorage.getItem('easy_cv.custom_colors');
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr.filter(isValidHex); }
  } catch (e) { /* 忽略 */ }
  return [];
}
function saveCustomColors(arr) {
  try { localStorage.setItem('easy_cv.custom_colors', JSON.stringify(arr)); } catch (e) { /* 忽略 */ }
}
function swatchHTML(hex, isCustom) {
  return '<button class="swatch' + (isCustom ? ' custom' : '') + '" data-act="accent-pick" data-accent="' + hex + '"' + (isCustom ? ' data-custom="1"' : '') + ' style="background:' + hex + '" title="' + hex + (isCustom ? '（右键：修改/删除）' : '') + '"></button>';
}
function buildColorMenu() {
  const presets = ACCENT_PRESETS.map(p => p.hex);
  const custom = getCustomColors();
  $('#color-swatches').innerHTML = presets.map(h => swatchHTML(h, false)).join('') + custom.map(h => swatchHTML(h, true)).join('');
}
function removeCustomColor(hex) {
  const custom = getCustomColors().filter(c => c !== hex);
  saveCustomColors(custom);
  if (editingSwatch === hex) editingSwatch = null;
  buildColorMenu();
  syncAccentUI();
  setAddBtnLabel();
}
function setAddBtnLabel() {
  const b = $('#accent-add');
  if (b) b.textContent = editingSwatch ? '保存' : '+ 添加';
}
function startEditSwatch(hex) {
  editingSwatch = hex;
  $('#accent-input').value = hex;
  $('#accent-input').focus();
  $('#accent-input').select();
  setAddBtnLabel();
  hideMenus();
  showToast('正在修改 ' + hex + '，改完按 Enter 或点「保存」');
}
function syncAccentUI() {
  const cur = normalizeAccent(store.state.accent);
  $('#accent-input').value = cur;
  $('#accent-current').textContent = cur;
  document.querySelectorAll('#color-swatches .swatch').forEach(el => {
    el.classList.toggle('active', String(el.dataset.accent).toLowerCase() === cur);
    el.classList.toggle('editing', String(el.dataset.accent).toLowerCase() === (editingSwatch || '').toLowerCase());
  });
}
function applyAccentInput() {
  const hex = parseColor($('#accent-input').value.trim());
  if (!hex) { showToast('颜色格式：支持 #RRGGBB / #RGB / rgb(r,g,b)'); return; }
  store.setAccent(hex);
  syncAccentUI();
}
function addCustomColor() {
  const hex = parseColor($('#accent-input').value.trim());
  if (!hex) { showToast('颜色格式：支持 #RRGGBB / #RGB / rgb(r,g,b)'); return; }
  let custom = getCustomColors();
  if (editingSwatch) {
    // 编辑模式：替换正在修改的色块
    custom = custom.filter(c => c !== editingSwatch);
    editingSwatch = null;
    if (!custom.includes(hex)) custom.push(hex);
    saveCustomColors(custom);
    buildColorMenu(); syncAccentUI(); setAddBtnLabel();
    showToast('已修改为 ' + hex);
    return;
  }
  if (!custom.includes(hex)) { custom.push(hex); saveCustomColors(custom); }
  buildColorMenu(); syncAccentUI();
  showToast('已添加 ' + hex);
}
function buildAddMenu() {
  $('#addMenu').innerHTML = Object.keys(BLOCK_TYPES).map(k => {
    const t = BLOCK_TYPES[k];
    return '<div class="menu-item" data-act="pick-type" data-type="' + k + '">' + icon(t.icon) + t.label + '</div>';
  }).join('');
}
function boot() {
  buildAddMenu();
  buildColorMenu();
  store = new StateStore(loadInitial());
  store.subscribe((state, kind) => {
    renderPreview(state);
    if (kind === 'structure') renderEditor();
    updateToolbar();
  });
  renderEditor();
  renderPreview(store.state);
  updateToolbar();
  bindEvents();
}

boot();
