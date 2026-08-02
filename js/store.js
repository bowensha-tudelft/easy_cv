/* Easy CV — 状态仓库（唯一数据源）+ JSON Patch（RFC6902 子集） */
'use strict';

const JSONPatch = {
  resolve(root, path) {
    const parts = String(path || '').split('/').filter(p => p !== '');
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]];
      if (cur == null) throw new Error('path not found: ' + parts[i]);
    }
    return { parent: cur, key: parts[parts.length - 1], value: cur[parts[parts.length - 1]] };
  },
  apply(root, op) {
    const { parent, key } = this.resolve(root, op.path);
    switch (op.op) {
      case 'add':
        if (Array.isArray(parent)) { if (key === '-' || key == null) parent.push(op.value); else parent.splice(+key, 0, op.value); }
        else parent[key] = op.value;
        break;
      case 'replace':
        if (Array.isArray(parent)) parent.splice(+key, 1, op.value);
        else parent[key] = op.value;
        break;
      case 'remove':
        if (Array.isArray(parent)) parent.splice(+key, 1);
        else delete parent[key];
        break;
      case 'move': {
        const src = this.resolve(root, op.from);
        parent[key] = src.value;
        if (Array.isArray(src.parent)) src.parent.splice(+src.key, 1);
        else delete src.parent[src.key];
        break;
      }
      case 'copy': {
        const src = this.resolve(root, op.from);
        parent[key] = deepClone(src.value);
        break;
      }
      case 'test':
        if (JSON.stringify(this.resolve(root, op.path).value) !== JSON.stringify(op.value)) throw new Error('test failed');
        break;
    }
  }
};

class StateStore {
  constructor(initial) {
    this.state = initial;
    this.history = [deepClone(initial)];
    this.historyIdx = 0;
    this.lastMergeKey = null;
    this.listeners = [];
    this.autosave = debounce(() => {
      try { localStorage.setItem('easy_cv.draft', JSON.stringify(this.state)); storageOK = true; }
      catch (e) { storageOK = false; showStorageNote(); }
    }, 400);
  }
  subscribe(fn) { this.listeners.push(fn); }
  emit(kind) { for (const fn of this.listeners) fn(this.state, kind); }
  commit(mergeKey, kind) {
    const canMerge = mergeKey && mergeKey === this.lastMergeKey && this.historyIdx === this.history.length - 1;
    if (canMerge) {
      this.history[this.historyIdx] = deepClone(this.state);
    } else {
      this.history = this.history.slice(0, this.historyIdx + 1);
      this.history.push(deepClone(this.state));
      if (this.history.length > 500) this.history.shift();
      this.historyIdx = this.history.length - 1;
    }
    this.lastMergeKey = mergeKey || null;
    this.autosave();
    this.emit(kind);
  }
  canUndo() { return this.historyIdx > 0; }
  canRedo() { return this.historyIdx < this.history.length - 1; }
  undo() {
    if (!this.canUndo()) return;
    this.historyIdx--;
    this.state = deepClone(this.history[this.historyIdx]);
    this.lastMergeKey = null; this.autosave(); this.emit('structure');
  }
  redo() {
    if (!this.canRedo()) return;
    this.historyIdx++;
    this.state = deepClone(this.history[this.historyIdx]);
    this.lastMergeKey = null; this.autosave(); this.emit('structure');
  }
  setState(s) {
    this.state = s;
    this.history = [deepClone(s)]; this.historyIdx = 0; this.lastMergeKey = null;
    this.autosave(); this.emit('structure');
  }
  addBlock(type, afterId) {
    const blk = BlockRegistry.make(type);
    const idx = afterId ? this.state.blocks.findIndex(b => b.id === afterId) + 1 : this.state.blocks.length;
    this.state.blocks.splice(idx, 0, blk);
    this.commit(null, 'structure');
    return blk.id;
  }
  setField(id, key, value) {
    const b = this.state.blocks.find(x => x.id === id);
    if (!b) return;
    b.data[key] = value;
    this.commit(id + ':' + key, 'data');
  }
  toggleCollapsed(id) {
    const b = this.state.blocks.find(x => x.id === id);
    if (!b) return;
    b.collapsed = !b.collapsed;
    this.commit(null, 'structure');
  }
  moveBlock(id, dir) {
    const i = this.state.blocks.findIndex(b => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= this.state.blocks.length) return;
    const [b] = this.state.blocks.splice(i, 1);
    this.state.blocks.splice(j, 0, b);
    this.commit(null, 'structure');
  }
  duplicateBlock(id) {
    const i = this.state.blocks.findIndex(b => b.id === id);
    if (i < 0) return null;
    const copy = deepClone(this.state.blocks[i]);
    copy.id = uid('b');
    this.state.blocks.splice(i + 1, 0, copy);
    this.commit(null, 'structure');
    return copy.id;
  }
  deleteBlock(id) {
    const i = this.state.blocks.findIndex(b => b.id === id);
    if (i < 0) return;
    this.state.blocks.splice(i, 1);
    this.commit(null, 'structure');
  }
  setTheme(t) {
    if (!THEMES[t]) return;
    this.state.theme = t;
    this.commit(null, 'structure');
  }
  setDateFormat(fmt) {
    this.state.meta = this.state.meta || {};
    this.state.meta.dateFormat = fmt;
    this.commit(null, 'data');
  }
  applyPatch(patches) {
    try { for (const p of patches) JSONPatch.apply(this.state, p); }
    catch (err) { return { ok: false, error: String(err) }; }
    this.commit('aipatch', 'data');
    return { ok: true };
  }
}
