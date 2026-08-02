/* Easy CV — 事件绑定 + 启动 */
'use strict';

let store = null;

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
      const key = el.dataset.field;
      if (key.startsWith('bullets:')) {
        const real = key.slice(8);
        store.setField(id, real, el.value.split('\n').map(s => s.trim()).filter(Boolean));
      } else {
        store.setField(id, key, el.value);
      }
      return;
    }
    if (el.matches('[data-lk]')) {
      const card = el.closest('.block-card');
      const id = card.dataset.blockId;
      updateLink(id, +el.dataset.i, el.dataset.lk, el.value);
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
      case 'export-app': exportJSON('app'); hideMenus(); break;
      case 'export-strict': exportJSON('strict'); hideMenus(); break;
      case 'theme': store.setTheme(p.dataset.theme); hideMenus(); break;
      case 'dd-theme': showMenu($('#themeMenu'), p.getBoundingClientRect()); break;
      case 'dd-export': showMenu($('#exportMenu'), p.getBoundingClientRect()); break;
      case 'dd-settings': openSettings(); break;
      case 'ai-send': aiSend(); break;
      case 'ai-settings': openSettings(); break;
      case 'save-settings': saveSettings(); break;
      case 'close-settings': closeSettings(); break;
    }
  });

  // 导入文件
  $('#import-file').addEventListener('change', e => { if (e.target.files[0]) importJSONFile(e.target.files[0]); e.target.value = ''; });

  // 快捷键
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); store.undo(); }
    else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); store.redo(); }
  });

  // Enter 发送 AI 消息
  $('#ai-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); }
  });
}

function loadInitial() {
  try {
    const raw = localStorage.getItem('easy_cv.draft');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* 忽略 */ }
  return deepClone(SAMPLE);
}
function buildAddMenu() {
  $('#addMenu').innerHTML = Object.keys(BLOCK_TYPES).map(k => {
    const t = BLOCK_TYPES[k];
    return '<div class="menu-item" data-act="pick-type" data-type="' + k + '">' + icon(t.icon) + t.label + '</div>';
  }).join('');
}
function boot() {
  buildAddMenu();
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
  aiAddMessage('asst', '你好，我是你的 CV 助手（本地演示）。\n\nv2 将接入 DeepSeek agent：读取 → 修改 → 联网搜索。\n现在可以试试「把简介缩短一半」或「读一下我的简历」。');
}

boot();
