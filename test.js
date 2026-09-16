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
const order = ['utils', 'photo', 'blocks', 'themes', 'store', 'render', 'editor', 'export', 'sample', 'boot'];
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
  // 中英标点：技能冒号/分隔、教育 in
  assert(zhP.includes('</span>：Python，PyTorch'), '中文技能用：和，');
  assert(zhP.includes('PhD Chemistry') && !zhP.includes('PhD in Chemistry'), '中文教育不加 in');
  assert(enP.includes('</span>: Python, PyTorch'), '英文技能用: 和, ');
  assert(enP.includes('PhD in Chemistry'), '英文教育保留 in');

  // 12. 简历照片
  const tctx = {
    esc: escapeHTML, icon, inline: inlineMarkup, markup: renderLightMarkup,
    fmtDate: v => fmtDate(v, 'MMM YYYY'), range: (s, e, c) => rangeText(s, e, c, 'MMM YYYY', 'en'),
    lang: 'en', colon: ': ', list: ', '
  };

  // 12a. 最高优先级约束：未勾选「显示照片」时，输出与加照片功能之前逐字节一致
  assert(headerRender({ data: { name: 'A', title: 'B', summary: 'S', showPhoto: false } }, tctx)
    === '<header class="cv-header"><h1>A</h1><div class="cv-title">B</div><p class="cv-summary">S</p></header>',
    '未勾选：header 输出与加照片前逐字节一致');
  assert(!headerRender({ data: { name: 'A' } }, tctx).includes('cv-photo'),
    '老数据（根本没有 showPhoto 键）也不渲染照片');

  // 12b. 勾选但没照片 → 会打印出来的虚线占位框
  const emptyHtml = headerRender({ data: { name: 'A', showPhoto: true, photo: '' } }, tctx);
  assert(emptyHtml.includes('cv-photo-empty') && emptyHtml.includes('照片'), '勾选无照片 → 占位框 + 提示文字');
  assert(emptyHtml.includes('cv-header-main'), '勾选后正文包进 cv-header-main');

  // 12c. 勾选且有照片 → img
  const imgHtml = headerRender({ data: { name: 'A', showPhoto: true, photo: 'data:image/jpeg;base64,/9j/4AAQ' } }, tctx);
  assert(imgHtml.includes('<img class="cv-photo" src="data:image/jpeg;base64,/9j/4AAQ"'), '勾选有照片 → img.cv-photo');
  assert(!imgHtml.includes('cv-photo-empty'), '有照片时不出现占位框');

  // 12d. data URL 校验：只放行 canvas 产出的三种 base64 图片
  assert(isValidPhotoDataURL('data:image/jpeg;base64,/9j/4AAQSkZJRg==') === true, 'jpeg data URL 通过');
  assert(isValidPhotoDataURL('data:image/png;base64,iVBORw0KGgo=') === true, 'png data URL 通过');
  assert(isValidPhotoDataURL('data:image/webp;base64,UklGRh4A') === true, 'webp data URL 通过');
  assert(isValidPhotoDataURL('javascript:alert(1)') === false, '拒绝 javascript:');
  assert(isValidPhotoDataURL('data:image/svg+xml;base64,PHN2Zz4=') === false, '拒绝 svg');
  assert(isValidPhotoDataURL('http://x/a.jpg') === false, '拒绝 http URL');
  assert(isValidPhotoDataURL('C:\\Users\\me\\a.jpg') === false, '拒绝文件路径');
  assert(isValidPhotoDataURL('data:image/jpeg;base64,') === false, '拒绝空载荷');
  assert(isValidPhotoDataURL('') === false, '拒绝空串');
  assert(isValidPhotoDataURL(null) === false, '拒绝 null');
  assert(isValidPhotoDataURL(undefined) === false, '拒绝 undefined');
  assert(isValidPhotoDataURL(123) === false, '拒绝非字符串');

  // 12e. 编辑器 photo 字段：空态 / 有照片两副面孔
  const photoField = BLOCK_TYPES.header.fields.find(f => f.key === 'photo');
  const emptyField = fieldHTML({ data: { photo: '' } }, photoField);
  assert(emptyField.includes('未选择照片') && emptyField.includes('pick-photo'), '无照片：空态 + 选择按钮');
  assert(!emptyField.includes('clear-photo'), '无照片：不显示清除按钮');
  const filledField = fieldHTML({ data: { photo: 'data:image/jpeg;base64,/9j/4AAQ' } }, photoField);
  assert(filledField.includes('photo-thumb') && filledField.includes('clear-photo'), '有照片：缩略图 + 清除按钮');

  // 12f. 严格 JSON Resume 往返：有照片时 image 不丢
  const withPhoto = deepClone(SAMPLE);
  const wHdr = withPhoto.blocks.find(b => b.type === 'header');
  wHdr.data.showPhoto = true;
  wHdr.data.photo = 'data:image/jpeg;base64,/9j/4AAQ';
  const strict = JSONResume.toStrict(withPhoto);
  assert(strict.basics.image === 'data:image/jpeg;base64,/9j/4AAQ', 'toStrict 写入 basics.image');
  const backHdr = JSONResume.fromStrict(strict).blocks.find(b => b.type === 'header');
  assert(backHdr.data.photo === 'data:image/jpeg;base64,/9j/4AAQ' && backHdr.data.showPhoto === true,
    '严格往返后有照片：photo / showPhoto 均不丢');

  // 12g. 已知有损：仅占位（无照片）在严格格式下退化为 false —— 断言退化，别日后误判成 bug
  const placeholder = deepClone(SAMPLE);
  const pHdr = placeholder.blocks.find(b => b.type === 'header');
  pHdr.data.showPhoto = true; pHdr.data.photo = '';
  const strict2 = JSONResume.toStrict(placeholder);
  assert(strict2.basics.image === undefined, '无照片时 toStrict 不写 image');
  assert(JSONResume.fromStrict(strict2).blocks.find(b => b.type === 'header').data.showPhoto === false,
    '仅占位状态严格往返后退化为 false（§8 记录的已知行为）');

  // 12h. 严格导入的 image 也要过校验
  const badStrict = JSONResume.fromStrict({ basics: { image: 'javascript:alert(1)' } }).blocks[0].data;
  assert(badStrict.photo === '' && badStrict.showPhoto === false, '严格导入拒绝非图片 image');
  assert(JSONResume.fromStrict({ basics: { name: 'N' } }).blocks[0].data.showPhoto === false, '无 image 时 showPhoto 默认 false');

  // 12i. 迁移：老 header 补默认值，非法 photo 清掉
  const oldHdr = { type: 'header', data: { name: 'Z' } };
  migrateBlock(oldHdr);
  assert(oldHdr.data.showPhoto === false && oldHdr.data.photo === '', 'migrateBlock 补 header 照片默认值');
  const badHdr = { type: 'header', data: { name: 'Z', photo: 'javascript:alert(1)' } };
  migrateBlock(badHdr);
  assert(badHdr.data.photo === '', 'migrateBlock 清掉非法 photo');

  // 12j. 清除照片不改变 showPhoto（回到虚线框，而不是关掉整个照片功能）
  store.setState(deepClone(SAMPLE));
  const cHdr = store.state.blocks.find(b => b.type === 'header');
  store.setField(cHdr.id, 'showPhoto', true);
  store.setField(cHdr.id, 'photo', 'data:image/jpeg;base64,/9j/4AAQ');
  store.setField(cHdr.id, 'photo', '');
  assert(store.state.blocks.find(b => b.id === cHdr.id).data.showPhoto === true, '清除照片后 showPhoto 仍为 true');
  renderPreview(store.state);
  assert(els['#preview-pane'].innerHTML.includes('cv-photo-empty'), '清除照片后预览回到虚线占位框');

  // 13. 自定义信息（籍贯 / 政治面貌…）
  const zhCtx = Object.assign({}, tctx, { lang: 'zh', colon: '：', list: '，' });

  // 13a. 位置：名 → 头衔 → 自定义信息 → 联系方式
  const dH = headerRender({ data: { name: 'N', title: 'T', details: [{ label: '籍贯', value: '江苏' }], email: 'e@x.com' } }, zhCtx);
  const iT = dH.indexOf('cv-title'), iD = dH.indexOf('cv-details'), iC = dH.indexOf('cv-contact');
  assert(iT > -1 && iD > iT && iC > iD, '顺序：头衔 → 自定义信息 → 联系方式');
  assert(dH.includes('<span class="dt">籍贯：江苏</span>'), '渲染为「名称：内容」');
  assert(!dH.includes('has-photo'), '没勾照片时仍是单列 header');

  // 13b. 冒号跟随语言（复用 ctx.colon，与技能行规则一致）
  assert(headerRender({ data: { details: [{ label: 'Hometown', value: 'Jiangsu' }] } }, tctx)
    .includes('<span class="dt">Hometown: Jiangsu</span>'), '英文用 ": " 冒号');

  // 13c. 只填一半也照常渲染
  assert(headerRender({ data: { details: [{ label: '党员', value: '' }] } }, zhCtx).includes('<span class="dt">党员</span>'),
    '只有名称：不补冒号，只渲染名称');
  assert(headerRender({ data: { details: [{ label: '', value: '江苏' }] } }, zhCtx).includes('<span class="dt">江苏</span>'),
    '只有内容：只渲染内容');

  // 13d. 无内容时不产生 cv-details（保证没填过时输出与改动前一致）
  assert(!headerRender({ data: { name: 'N', title: 'T', summary: 'S' } }, tctx).includes('cv-details'), '无 details 键：不渲染');
  assert(!headerRender({ data: { details: [] } }, tctx).includes('cv-details'), '空数组：不渲染');
  assert(!headerRender({ data: { details: [{ label: '', value: '' }] } }, tctx).includes('cv-details'), '全空条目：不渲染');
  assert(!headerRender({ data: { details: [{ label: '   ', value: '  ' }] } }, tctx).includes('cv-details'), '纯空白条目：不渲染');
  assert(!headerRender({ data: { details: [null] } }, tctx).includes('cv-details'), 'null 条目：不炸且不渲染');

  // 13e. 转义：手改 JSON 塞进的标签必须被转义
  const escD = headerRender({ data: { details: [{ label: '<b>x</b>', value: '<img src=x onerror=1>' }] } }, tctx);
  assert(escD.includes('&lt;b&gt;x&lt;/b&gt;') && !escD.includes('<b>x</b>'), '名称被转义');
  assert(!escD.includes('<img'), '内容里的标签被转义');

  // 13f. 编辑器：行结构与 links 同构（两个输入框 + ✕），另有「+ 添加信息」
  const dtField = BLOCK_TYPES.header.fields.find(f => f.key === 'details');
  const dtHTML = fieldHTML({ data: { details: [{ label: '籍贯', value: '江苏' }] } }, dtField);
  assert(dtHTML.includes('data-dt="label"') && dtHTML.includes('data-dt="value"'), '每行是 名称 + 内容 两个输入框');
  assert(dtHTML.includes('data-act="rmdetail"') && dtHTML.includes('data-act="adddetail"'), '有删除 ✕ 与「+ 添加信息」');
  assert(dtHTML.includes('value="籍贯"') && dtHTML.includes('value="江苏"'), '已填内容回填到输入框');
  assert(dtHTML.includes('class="detail-row"') && dtHTML.includes('class="details"'), 'DOM 结构同 links');

  // 13g. store：增 / 改 / 删
  store.setState(deepClone(SAMPLE));
  const dHdr = store.state.blocks.find(b => b.type === 'header');
  addDetailRow(dHdr.id);
  assert(store.state.blocks.find(b => b.id === dHdr.id).data.details.length === 1, 'addDetailRow 追加一行');
  updateDetail(dHdr.id, 0, 'label', '政治面貌');
  updateDetail(dHdr.id, 0, 'value', '党员');
  assert(store.state.blocks.find(b => b.id === dHdr.id).data.details[0].label === '政治面貌', 'updateDetail 改名称');
  store.setLanguage('zh');
  renderPreview(store.state);
  assert(els['#preview-pane'].innerHTML.includes('政治面貌：党员'), '改完预览即时反映（中文冒号）');
  removeDetailRow(dHdr.id, 0);
  assert(store.state.blocks.find(b => b.id === dHdr.id).data.details.length === 0, 'removeDetailRow 删除一行');

  // 13h. 新增 header 块默认带空 details 数组
  assert(Array.isArray(BLOCK_TYPES.header.defaults().details), 'header defaults 含 details 数组');

  // 14. markdown 加粗：所有自由文本字段都支持 **加粗**
  assert(headerRender({ data: { details: [{ label: '**籍贯**', value: '江苏' }] } }, tctx)
    .includes('<span class="dt"><strong>籍贯</strong>: 江苏</span>'), '自定义信息-名称支持加粗');
  assert(headerRender({ data: { details: [{ label: '籍贯', value: '**江苏**' }] } }, tctx)
    .includes('<span class="dt">籍贯: <strong>江苏</strong></span>'), '自定义信息-内容支持加粗');
  assert(headerRender({ data: { name: '**张三**' } }, tctx).includes('<h1><strong>张三</strong></h1>'), '姓名支持加粗');
  assert(headerRender({ data: { title: '**工程师**' } }, tctx).includes('<strong>工程师</strong>'), '头衔支持加粗');
  assert(headerRender({ data: { name: 'N', location: '**上海**' } }, tctx).includes('<strong>上海</strong>'), '所在地支持加粗');

  const skHtml = skillsRender({ data: { name: '**Lang**', keywords: ['**Python**'] } }, tctx);
  assert(skHtml.includes('<strong>Lang</strong>') && skHtml.includes('<strong>Python</strong>'), '技能组名与技能项支持加粗');

  const edHtml = educationRender({ data: { institution: '**MIT**', degree: 'PhD', area: '**Chem**' } }, tctx);
  assert(edHtml.includes('<strong>MIT</strong>') && edHtml.includes('<strong>Chem</strong>'), '学校与专业支持加粗');

  const exHtml = experienceRender({ data: { position: '**RA**', organization: '**Lab**' } }, tctx);
  assert(exHtml.includes('<strong>RA</strong>') && exHtml.includes('<strong>Lab</strong>'), '职位与机构支持加粗');

  // 14b. URL 属性值不套 markdown（往 href 里塞 <strong> 没有意义）
  const urlHtml = headerRender({ data: { name: 'N', links: [{ icon: 'github', label: 'GH', url: 'https://example.com/**a**' }] } }, tctx);
  assert(urlHtml.includes('href="https://example.com/**a**"'), 'href 保持字面量');
  assert(!urlHtml.includes('href="https://example.com/<strong>'), 'href 里不会出现 <strong>');

  // 14c. 加粗没有放松转义：** 之外的标签仍被转义，只有 strong 是「真的」
  const safeHtml = headerRender({ data: { name: '**<img src=x>**' } }, tctx);
  assert(safeHtml.includes('<strong>&lt;img src=x&gt;</strong>'), '** 内的标签被转义，只有 strong 生效');
  assert(!safeHtml.includes('<img'), '不产生真实的 img 标签');
  assert(!headerRender({ data: { name: '<b>x</b>' } }, tctx).includes('<b>x</b>'), '不加 ** 时标签照旧被转义');

  console.log('ALL SMOKE TESTS PASSED ✅  (' + store.state.blocks.length + ' blocks)');
})().catch(e => { console.error('FAIL ❌'); console.error(e.stack || e); process.exit(1); });
`;

eval(code + tests);
