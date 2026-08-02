/* 冒烟测试（Node 环境，桩模拟浏览器）。运行：node test.js */
'use strict';
const fs = require('fs');
const path = require('path');

/* ---- 浏览器桩 ---- */
const els = {};
function fakeEl() {
  const el = {
    innerHTML: '', value: '', checked: false, disabled: false, hidden: false,
    dataset: {}, style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, appendChild() {}, focus() {}, scrollIntoView() {},
    scrollTop: 0, scrollHeight: 0,
    querySelector() { return fakeEl(); }, querySelectorAll() { return []; },
    closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, bottom: 0, right: 0, width: 0, height: 0 }; }
  };
  return el;
}
global.document = {
  querySelector(sel) { if (!els[sel]) els[sel] = fakeEl(); return els[sel]; },
  querySelectorAll() { return []; },
  addEventListener() {}, createElement() { return fakeEl(); },
  body: fakeEl()
};
global.window = { innerWidth: 1400, innerHeight: 900, print() {} };
global.alert = (m) => { throw new Error('alert called: ' + m); };
global.localStorage = {
  _d: {},
  getItem(k) { return k in this._d ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};

/* ---- 拼接全部模块 + 测试代码，一次性 eval（共享作用域） ---- */
const order = ['utils', 'blocks', 'themes', 'store', 'render', 'editor', 'export', 'ai', 'sample', 'boot'];
let code = '';
for (const f of order) code += '\n' + fs.readFileSync(path.join(__dirname, 'js', f + '.js'), 'utf8');

const tests = `
;(async () => {
  const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAIL: ' + msg); };

  // 1. 启动后预览渲染出示例 CV
  const preview = els['#preview-pane'].innerHTML;
  assert(preview.includes('林晓'), 'preview 应包含姓名');
  assert(preview.includes('Alibaba Cloud'), 'preview 应包含公司');
  assert(preview.includes('Experience'), 'preview 应有 Experience 区块标题');
  assert((preview.match(/Experience/g) || []).length === 1, 'Experience 标题只出现一次（分组）');
  assert(preview.includes('cv-links'), 'preview 应包含链接行');

  // HTML 转义生效：注入内容被转义，不出现原始标签
  const evil = '<img src=x onerror=alert(1)>';
  store.setField(store.state.blocks.find(b => b.type === 'header').id, 'title', evil);
  const pEsc = els['#preview-pane'].innerHTML;
  assert(pEsc.includes('&lt;img'), '注入被转义成实体');
  assert(!pEsc.includes('<img src=x onerror'), '不出现原始注入标签');
  store.undo();
  assert(store.state.blocks.find(b => b.type === 'header').data.title !== evil, 'undo 恢复标题');

  // 2. StateStore：添加 / 修改 / 排序 / 删除 / 撤销 / 重做
  const n0 = store.state.blocks.length;
  const nid = store.addBlock('skills');
  assert(store.state.blocks.length === n0 + 1, 'addBlock 数量+1');
  store.setField(nid, 'name', 'Test Skill');
  store.setField(nid, 'keywords', ['a', 'b']);
  assert(store.state.blocks.find(b => b.id === nid).data.name === 'Test Skill', 'setField 生效');
  store.moveBlock(nid, -1);
  assert(store.state.blocks.findIndex(b => b.id === nid) === n0 - 1, 'moveBlock 上移');
  store.undo();
  assert(store.state.blocks.findIndex(b => b.id === nid) === n0, 'undo 恢复位置');
  store.redo();
  assert(store.state.blocks.findIndex(b => b.id === nid) === n0 - 1, 'redo 重做位置');
  store.deleteBlock(nid);
  assert(store.state.blocks.length === n0, 'deleteBlock 数量恢复');

  // 3. JSON Patch
  JSONPatch.apply(store.state, { op: 'replace', path: '/blocks/0/data/name', value: 'PATCHED' });
  assert(store.state.blocks[0].data.name === 'PATCHED', 'JSONPatch replace');
  JSONPatch.apply(store.state, { op: 'add', path: '/blocks/0/data/links/-', value: { id: 'l_t', icon: 'github', label: '', url: 'https://x' } });
  assert(store.state.blocks[0].data.links.length > 0, 'JSONPatch add to array');
  store.undo(); // 撤销 patch（applyPatch 用的是 commit，这里直接 apply 不 commit，回滚到 undo 栈最顶层）

  // 4. JSON Resume 往返
  const strict = JSONResume.toStrict(store.state);
  assert(strict.basics && strict.basics.name === '林晓 (Xiao Lin)', 'toStrict basics.name');
  assert(strict.work.length >= 2, 'toStrict work 数量');
  const back = JSONResume.fromStrict(strict);
  assert(Array.isArray(back.blocks) && back.blocks.length > 0, 'fromStrict 生成块');
  assert(back.blocks.some(b => b.type === 'header' && b.data.name.includes('林晓')), 'fromStrict 保留姓名');

  // 5. 主题：sidebar 双栏
  store.setState(deepClone(SAMPLE));
  store.setTheme('sidebar');
  const sp = els['#preview-pane'].innerHTML;
  assert(sp.includes('col-left') && sp.includes('col-right'), 'sidebar 渲染两栏');

  // 6. echo AI：缩短简介走 patch
  const res = await Providers.echo.chat({ userText: '把简介缩短一半', state: store.state });
  assert(res && res.action === 'patch' && res.patches.length === 1, 'echo 返回 patch');
  const r2 = store.applyPatch(res.patches);
  assert(r2.ok, 'echo patch 应用成功');
  const wordsAfter = store.state.blocks[0].data.summary.split(/\\s+/).filter(Boolean).length;
  const wordsBefore = SAMPLE.blocks[0].data.summary.split(/\\s+/).filter(Boolean).length;
  assert(wordsAfter === Math.ceil(wordsBefore / 2), '简介确实缩短一半');

  // 7. 数据不被 localStorage 污染
  assert(store.state.blocks.every(b => b.id && b.type), '所有块有 id 和 type');

  console.log('ALL SMOKE TESTS PASSED ✅  (' + store.state.blocks.length + ' blocks)');
})().catch(e => { console.error('FAIL ❌'); console.error(e.stack || e); process.exit(1); });
`;

eval(code + tests);
