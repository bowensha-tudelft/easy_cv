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
global.window = { innerWidth: 1400, innerHeight: 900, print() {}, addEventListener() {} };
global.alert = (m) => { throw new Error('alert called: ' + m); };
global.localStorage = {
  _d: {},
  getItem(k) { return k in this._d ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};
// FileReader 桩：同步喂回 JSON 内容（用于测试导入）
global.FileReader = function () {
  this.result = '';
  this.readAsText = function (file) {
    this.result = '{"schemaVersion":1,"theme":"classic","accent":"#1f3864","meta":{"dateFormat":"MMM YYYY"},"blocks":[]}';
    if (this.onload) this.onload();
  };
};

/* ---- 拼接全部模块 + 测试代码，一次性 eval（共享作用域） ---- */
const order = ['utils', 'blocks', 'themes', 'store', 'render', 'editor', 'export', 'sample', 'boot'];
let code = '';
for (const f of order) code += '\n' + fs.readFileSync(path.join(__dirname, 'js', f + '.js'), 'utf8');

const tests = `
;(async () => {
  const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAIL: ' + msg); };

  // 1. 启动后预览渲染出示例 CV
  const preview = els['#preview-pane'].innerHTML;
  assert(preview.includes('Bowen Sha'), 'preview 应包含姓名');
  assert(preview.includes('Massachusetts Institute of Technology'), 'preview 应包含学校');
  assert(preview.includes('Research Experience'), 'preview 应有 Research Experience 标题');
  assert(preview.includes('Selected Publications'), 'preview 应有 Publications 标题');
  assert(preview.includes('cv-links'), 'preview 应包含链接行');
  assert(store.state.blocks.every(b => b.collapsed === true), '块默认折叠');

  // 1b. 迁移：旧 experience→research；旧 custom→继承 experience 字段
  localStorage.setItem('easy_cv.draft', JSON.stringify({ schemaVersion: 1, theme: 'classic', accent: '#1f3864', meta: { dateFormat: 'MMM YYYY' }, blocks: [
    { id: 'b_old1', type: 'experience', data: {}, visible: true },
    { id: 'b_old2', type: 'custom', data: { title: 'Awards', subtitle: 'Some Award', rightText: '2020', body: '- Won first prize' + String.fromCharCode(10) + '- Runner-up' }, visible: true }
  ] }));
  const migrated = loadInitial();
  assert(migrated.blocks[0].type === 'research', '旧 experience 迁移为 research');
  const mc = migrated.blocks[1];
  assert(mc.type === 'custom' && mc.data.position === 'Some Award', '旧 custom subtitle→position');
  assert(JSON.stringify(mc.data.highlights) === JSON.stringify(['Won first prize', 'Runner-up']), '旧 custom body -行→highlights');
  assert(mc.data.title === 'Awards', 'custom title 保留');
  localStorage.removeItem('easy_cv.draft');

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
  assert(strict.basics && strict.basics.name === 'Bowen Sha', 'toStrict basics.name');
  assert(strict.work.length >= 2, 'toStrict work 数量');
  const back = JSONResume.fromStrict(strict);
  assert(Array.isArray(back.blocks) && back.blocks.length > 0, 'fromStrict 生成块');
  assert(back.blocks.some(b => b.type === 'header' && b.data.name.includes('Bowen')), 'fromStrict 保留姓名');

  // 5. 主题切换：经典 / 现代（无双栏）
  store.setState(deepClone(SAMPLE));
  store.setTheme('modern');
  assert(store.state.theme === 'modern', 'setTheme 生效');
  assert(els['#preview-pane'].innerHTML.includes('page modern'), 'modern 应用到预览');
  store.setTheme('classic');
  assert(store.state.theme === 'classic', '切回 classic');

  // 5b. 配色：parser 支持 hex/rgb，非法拒绝，随机为真随机
  assert(parseColor('#abc') === '#aabbcc', 'parseColor #RGB 展开');
  assert(parseColor('rgb(255, 0, 0)') === '#ff0000', 'parseColor rgb 整数');
  assert(parseColor('rgb(100%, 0%, 50%)') === '#ff0080', 'parseColor rgb 百分比');
  assert(parseColor('red') === null, 'parseColor 拒绝非法名');
  assert(store.setAccent('rgb(0, 128, 0)') === true, 'setAccent 接受 rgb');
  assert(store.state.accent === '#008000', 'rgb 归一化为 hex');
  assert(els['#preview-pane'].innerHTML.includes('--accent:#008000'), '预览应用 accent');
  assert(store.setAccent('red') === false, 'setAccent 拒绝非法色');
  assert(store.state.accent === '#008000', '非法色不改变状态');
  assert(isValidHex(randomAccent()) && isValidHex(randomAccent()), '随机配色是合法 hex');
  store.setAccent('#1f3864');

  // 5c. 自定义色块：添加 / 右键删除
  saveCustomColors(['#123456']);
  assert(getCustomColors().includes('#123456'), '自定义色保存');
  removeCustomColor('#123456');
  assert(!getCustomColors().includes('#123456'), '自定义色右键删除');

  // 5d. 自定义色块：修改（编辑模式替换）
  saveCustomColors(['#123456']);
  editingSwatch = '#123456';
  $('#accent-input').value = '#abcdef';
  addCustomColor();
  assert(getCustomColors().includes('#abcdef') && !getCustomColors().includes('#123456'), '编辑模式替换色块');
  assert(editingSwatch === null, '编辑模式结束');

  // 6. bullets 行编辑器（+ 添加 / 编辑 / 删除，类似添加链接）
  const expId = store.state.blocks.find(b => b.type === 'research').id;
  store.setField(expId, 'highlights', ['a', 'b']);
  addBullet(expId, 'highlights');
  assert(store.state.blocks.find(b => b.id === expId).data.highlights.length === 3, 'addBullet 添加空行');
  updateBullet(expId, 'highlights', 2, 'c');
  assert(store.state.blocks.find(b => b.id === expId).data.highlights[2] === 'c', 'updateBullet 更新');
  removeBullet(expId, 'highlights', 0);
  assert(store.state.blocks.find(b => b.id === expId).data.highlights[0] === 'b', 'removeBullet 删除');

  // 7. 数据不被 localStorage 污染
  assert(store.state.blocks.every(b => b.id && b.type), '所有块有 id 和 type');

  // 8. 导入新 JSON 后清空旧保存句柄（防止 Ctrl+S 写回旧文件覆盖真简历）
  savedFileHandle = { fake: 'old-handle' };
  importedFileName = null;
  importJSONFile({ name: 'imported-resume.JSON' });
  assert(importedFileName === 'imported-resume.json', '导入文件名规范化为 .json');
  assert(savedFileHandle === null, '导入后清空内存保存句柄');
  assert(store.state.blocks.length === 0, '导入替换当前状态');

  // 8b. 工具栏显示 Ctrl+S 保存目标（有句柄显文件名 / 无句柄提示另存为）
  savedFileHandle = { name: 'BowenSha-import.json', fake: true };
  await refreshSaveTarget();
  assert(els['#save-target'].textContent === '保存到 BowenSha-import.json', '有句柄时显示保存文件名');
  savedFileHandle = null;
  await refreshSaveTarget();
  assert(els['#save-target'].textContent.includes('另存为'), '无句柄时提示 Ctrl+S 另存为');

  // 9. 自定义块相同 title 自动合并（避免重复大标题）
  store.setState({
    schemaVersion: 1, theme: 'classic', accent: '#1f3864', meta: { dateFormat: 'MMM YYYY' },
    blocks: [
      { id: 'c1', type: 'custom', data: { title: 'Teaching', position: 'TA A', highlights: [] }, visible: true },
      { id: 'c2', type: 'custom', data: { title: 'Teaching', position: 'TA B', highlights: [] }, visible: true },
      { id: 'c3', type: 'custom', data: { title: 'Awards', position: 'Award 1', highlights: [] }, visible: true },
      { id: 'c4', type: 'custom', data: { title: '', position: 'No title', highlights: [] }, visible: true }
    ]
  });
  renderPreview(store.state);
  const ph9 = els['#preview-pane'].innerHTML;
  const h2Count = (ph9.match(/class="section-title"/g) || []).length;
  assert(h2Count === 2, '自定义块合并后标题数=2（Teaching+Awards），实际 ' + h2Count);
  assert((ph9.match(/section-title">Teaching</g) || []).length === 1, 'Teaching 只出现一次标题');
  assert(ph9.includes('TA A') && ph9.includes('TA B'), '同标题两个块内容都在');
  assert(ph9.includes('Award 1') && ph9.includes('No title'), '其他块内容都在');

  // 10. 技能块：无熟练度字段；keywords 用行式编辑（同职责 UI）
  const skId = store.addBlock('skills');
  const skBlk = store.state.blocks.find(b => b.id === skId);
  assert(!('level' in skBlk.data) && !('showLevel' in skBlk.data), '技能块默认无 level/showLevel');
  store.setField(skId, 'keywords', ['Python', 'C++']);
  const kwField = fieldHTML(skBlk, BLOCK_TYPES.skills.fields.find(f => f.key === 'keywords'));
  assert(kwField.includes('data-bl="0"') && kwField.includes('addbullet'), '技能项用行式编辑 UI（同职责）');
  store.setField(skId, 'name', 'Lang');
  renderPreview(store.state);
  const ph10 = els['#preview-pane'].innerHTML;
  assert(ph10.includes('Lang') && ph10.includes('Python, C++'), '技能组名与技能项渲染');

  // 11. 中英文切换：小节标题 + Present/至今 本地化
  store.setState(deepClone(SAMPLE));
  store.addBlock('projects'); // 补一个 projects 块，验证「项目」标题
  store.setLanguage('zh');
  assert(store.state.meta.language === 'zh', 'setLanguage 存入 meta.language');
  renderPreview(store.state);
  const zhP = els['#preview-pane'].innerHTML;
  assert(zhP.includes('教育经历') && zhP.includes('研究经历') && zhP.includes('项目') && zhP.includes('技能'), '中文小节标题渲染');
  assert(zhP.includes('至今'), '中文 current 显示至今');
  store.setLanguage('en');
  renderPreview(store.state);
  const enP = els['#preview-pane'].innerHTML;
  assert(enP.includes('Education') && enP.includes('Research Experience') && enP.includes('Projects') && enP.includes('Skills'), '英文小节标题渲染');
  assert(!enP.includes('教育经历'), '英文模式无中文标题');

  console.log('ALL SMOKE TESTS PASSED ✅  (' + store.state.blocks.length + ' blocks)');
})().catch(e => { console.error('FAIL ❌'); console.error(e.stack || e); process.exit(1); });
`;

eval(code + tests);
