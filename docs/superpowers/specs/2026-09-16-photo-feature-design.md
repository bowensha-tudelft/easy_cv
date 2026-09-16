# 简历照片功能 —— 设计文档

日期：2026-09-16
分支：`feat/photo`
状态：设计已确认，待实现

## 1. 目标

在「个人信息」（`header`）块里加入简历照片：照片显示在 CV 右上角，未上传时显示一个会打印出来的虚线占位框。

**最高优先级约束（用户原话）**：「没勾选的话，默认和现在完全一样」。

功能边界（用户明确不要的，见 §11）：不做裁切 UI、不做位置微调控件、不做编辑面板的提前警告。

## 2. 数据模型

`header.data` 新增两个字段，写进 `BLOCK_TYPES.header.defaults()`（`js/blocks.js:89`）：

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `showPhoto` | boolean | `false` | 「显示照片」勾选。声明「我要在这里放照片」 |
| `photo` | string | `''` | JPEG data URL，形如 `data:image/jpeg;base64,...` |

**为什么必须是两个字段**：需要区分三种状态 —— 不要照片（`false` + 空）、要照片但还没传（`true` + 空）、要照片且已传（`true` + 有值）。单字段无法表达第二种，而第二种正是虚线框存在的意义。

`schemaVersion` **保持 1**：新字段纯可选且向后兼容（旧 JSON 缺字段走默认值；新 JSON 被旧版本读取时多余键被忽略）。

**老数据天然安全**：`headerRender` 读 `d.showPhoto`，老草稿里是 `undefined`（falsy）→ 走「和现在完全一样」的分支。所以即使没经过 `migrateBlock` 也不会出问题，迁移只是为了让数据干净、便于导出。

## 3. 上传管线（新文件 `js/photo.js`）

```
选择文件 → 校验类型/体积 → 解码 → 画进 canvas（最长边 ≤400px，先铺白底）
        → toDataURL('image/jpeg', 0.85) → 存入 d.photo
```

常量：

```js
const PHOTO_MAX_EDGE  = 400;                  // 最长边像素
const PHOTO_QUALITY   = 0.85;                 // JPEG 质量
const PHOTO_MAX_BYTES = 20 * 1024 * 1024;     // 输入文件上限 20MB
const PHOTO_MIME = /^data:image\/(png|jpeg|webp);base64,/;
```

**为什么缩到 400px**：放在 30mm 宽上等于 339 DPI，远超打印需要；缩完约 30–50KB，使 `localStorage`（`js/store.js:56`，配额约 5MB）和导出 JSON 的体积都不成为问题。这是「内嵌 data URL」方案成立的前提。

### 导出两个函数

- `isValidPhotoDataURL(s)` —— 只放行匹配 `PHOTO_MIME` 的字符串，其余一律 `false`
- `makePhotoDataURL(file)` —— async，返回 data URL；出错时 `throw new Error(可读文案)`，由调用方 `showToast`

> **说明**：`<img>` 加载 SVG 时脚本不执行，所以 `isValidPhotoDataURL` **不是 XSS 防线**。它的作用是保持数据模型干净、避免渲染出坏图或乱码。文档里不要把它写成安全措施。

### 实现要点与已知陷阱

1. **格式校验**：`file.type` 必须以 `image/` 开头。失败文案要点名 HEIC —— iPhone 默认拍 HEIC，`file.type` 是 `image/heic`，能通过 `image/*` 检查但 canvas 解不了。笼统说「加载失败」会让用户困惑。文案：`不支持的图片格式（iPhone 的 HEIC 请先转成 JPG）`
2. **体积校验**：超过 `PHOTO_MAX_BYTES` 直接拒绝并提示，避免解码爆内存
3. **解码**：优先 `createImageBitmap(file, { imageOrientation: 'from-image' })` —— 解码在主线程外，且处理手机照片的 EXIF 旋转方向；失败回退 `<img>` + `FileReader.readAsDataURL`
4. **先铺白底再画**：PNG 透明区域转成 JPEG 会变黑，`ctx.fillStyle='#fff'; ctx.fillRect(...)` 解决
5. **缩放**：`scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(w, h))`，只缩不放（小图不拉伸模糊）
6. **⚠️ canvas 污染（tainted canvas）**：`toDataURL()` 在 canvas 被非本源图像污染时会抛 `SecurityError`。项目定位是 `file://` 双击打开（`README.md:7`、`:41`），而 `file://` 页面下的源处理各浏览器不一致 —— **这是本功能唯一可能在某个浏览器上整体失效的点**。对策是两级回退：

   - **主路径**：`createImageBitmap` 解码（见上面要点 3）。正常情况下 File 与页面同源，不污染 canvas
   - **回退**：若 `toDataURL()` 抛 `SecurityError`，改用 `FileReader.readAsDataURL` 走 `data:` URL 重新解码再画一次 —— data URL 明确不污染 canvas
   - **两级都失败**：`throw` 明确文案，**不要静默失败**

   **这条必须在 Chrome 和 Firefox 下用 `file://` 各实测一遍**（见 `test-checklist.md`）

## 4. 编辑器 UI

### 字段声明

`BLOCK_TYPES.header.fields` 新增两项，位置在 `summary` 之后、`links` 之前：

```js
{ key: 'showPhoto', label: '显示照片', type: 'checkbox' },
{ key: 'photo',     label: '照片（3:4 竖版最佳）', type: 'photo' }
```

勾选框放前面：先声明意图，再选素材。

### `fieldHTML` 新增 `photo` 分支

`js/editor.js:21` 的 switch 里加：

- 有照片：缩略图 + 「选择图片」+「清除」
- 无照片：显示「未选择照片」+「选择图片」

### 照片选择器常驻可见（不做联动隐藏）

考虑过「未勾选 `showPhoto` 时隐藏照片选择器」（复用 `js/boot.js:61` 的 `current`/`endDate` 联动模式），**否决**，两个理由：

1. **发现性**：用户刚打开「个人信息」时如果看不到任何照片相关的 UI，就不会知道有这功能
2. **更简单**：少维护一处联动，符合「尽可能不要太难实现」

照片选择器和勾选框是两个独立的控件，各自的可见性不互相依赖。

### 交互接线

- `index.html` 新增 `<input type="file" id="photo-file" accept="image/*" hidden>`，与现有 `#import-file`（`index.html:88`）并列
- `data-act="pick-photo"` → 把触发块的 id 记进模块级变量 `photoTargetBlockId`，再 `$('#photo-file').click()`
- `#photo-file` 的 `change` → `makePhotoDataURL(file)` → 成功则 `store.setField(photoTargetBlockId, 'photo', url)`；失败则 `showToast(err.message)`；最后清空 `input.value`（复用 `js/boot.js:129` 导入文件的写法）
- `data-act="clear-photo"` → `store.setField(id, 'photo', '')`

**需要手动刷新缩略图**：`store.setField` 触发 `emit('data')`，但 `renderEditor` 只在 `kind === 'structure'` 时重建（`js/boot.js:258`）。所以照片变化后要手动重写缩略图 DOM，做法与现有 `renderLinkRows`（`js/editor.js:125`）、`renderBulletRows`（`js/editor.js:156`）一致 —— 定位到卡片内的 `.photo-field` 重写 `innerHTML`。

**清除行为的约定**：清除照片**不**改变 `showPhoto`。「我要放照片」这个意图没有变，只是素材没了 —— 所以清空后回到虚线框，而不是静默关掉整个照片功能。（用户已确认）

## 5. 预览渲染

改 `headerRender`（`js/blocks.js:4`）。

把现有输出抽成 `body`（`name` / `title` / `contact` / `links` / `summary` 全部原样不动），然后：

```js
if (!d.showPhoto) return '<header class="cv-header">' + body + '</header>';
```

**这一行是「没勾选 = 和现在完全一样」的结构性保证** —— 走的是同一条字符串拼接路径，不是靠 CSS 恰好没变化。测试要逐字节比对这个输出。

勾选后走两列布局：

```js
const photo = isValidPhotoDataURL(d.photo)
  ? '<img class="cv-photo" src="' + d.photo + '" alt="">'
  : '<div class="cv-photo cv-photo-empty">照片</div>';
return '<header class="cv-header has-photo">'
  + '<div class="cv-header-main">' + body + '</div>'
  + photo
  + '</header>';
```

`d.photo` 经 `isValidPhotoDataURL` 校验后直接插入，不做 `escapeHTML`：base64 字母表是 `A-Za-z0-9+/=`，不含 `& < > " '`，转义对它是恒等操作。校验已经保证了字符串形状，比转义更强。

## 6. 尺寸与位置

```css
.page .cv-header.has-photo { display: flex; gap: 8mm; align-items: flex-start; }
.page .cv-header-main { flex: 1 1 auto; min-width: 0; }
.page .cv-photo {
  flex: 0 0 auto;
  width: 30mm; height: 40mm;      /* 3:4 */
  object-fit: cover;              /* 自动居中裁切，不失真 */
  border-radius: 2px;
}
```

- **照片 30mm × 40mm（3:4）**。理由：A4 正文宽 180mm（210 − 两侧 15mm 页边距），照片占 1/6；常见简历照在 25–35mm 区间，30mm 居中
- `align-items: flex-start` 让照片落在右上角
- 正文列宽 = 180 − 30 − 8 = **142mm**。`min-width: 0` 是必需的 —— 否则长英文串（如很长的 URL）会撑破 flex 容器而不是换行
- 打印：`.page .cv-header { break-inside: avoid; }`，防止照片和文字被分页切开。header 永远是第一个块、位于第 1 页顶部，所以这条不会造成「整块被推到第 2 页导致首页大片空白」
- `object-position` **保持默认（居中）**。已知取舍：cover 默认居中，人脸偏上的照片可能裁到头顶。若 GUI 验收时确认此问题，加一行 `object-position: 50% 25%` 即可改善 —— 本次不做用户可调的位置控件

## 7. 占位框是报错信号，必须打印

用户定调：虚线框的作用是**提醒用户回填照片**。

> 原话：「虚线框就是提醒用户，打印出来没有框的话，他会忘了放自己原本想照片，有框才会提醒他有 bug，属于 raise 一个 error」

因此：

- 占位框**照常打印**，**不做** `@media print` 隐藏。预览 DOM 就是打印对象（`js/render.js:1`），保持 WYSIWYG。屏幕上看得见但纸上消失的话，提醒就失效了
- 框内放一行居中的灰色小字「照片」。纯虚线矩形在纸上语义不明，加字后一眼能看出「这里缺照片」

```css
.page .cv-photo-empty {
  border: 1px dashed #bbb;
  background: #fafafa;
  display: flex; align-items: center; justify-content: center;
  color: #aaa; font-size: 9pt;
}
```

## 8. 导出 / 导入

- **Ctrl+S / 导出 JSON**：`photo` 在 `state` 里，`JSON.stringify` 自动带上，**零改动**
- **严格 JSON Resume 导出**（`JSONResume.toStrict`，`js/export.js:16`）：写到 `basics.image`。仅当 `showPhoto` 且有合法照片时才写
- **严格 JSON Resume 导入**（`JSONResume.fromStrict`，`js/export.js:53`）：`basics.image` 经 `isValidPhotoDataURL` 校验后写入 `photo`，并令 `showPhoto = !!有效照片`
- ⚠️ **必改点**：`js/export.js:57-65` 里 `fromStrict` 构造 header 的 data 用的是**硬编码对象字面量**。必须补上 `showPhoto` / `photo` 两个新键，否则严格格式导入会静默丢掉这两个字段
- **`migrateBlock`**（`js/utils.js:144`）：给 header 补上两个键的默认值

**已知的有损场景（可接受，需记录）**：严格格式下 `showPhoto:true` 但 `photo:''`（即「要照片但还没传」）无法表达 —— JSON Resume 没有对应字段。往返一次后这个状态会退化成 `showPhoto:false`，虚线框消失。严格格式是给生态互作用的，丢一个占位标记可以接受；应用自身的 JSON 格式（Ctrl+S）完整保留。

## 9. 测试

### 前置问题：本机没有 Node

`test.js` 是项目唯一的测试入口（`node test.js`），但**当前机器上找不到 `node`**（PATH 和常见安装路径都没有）。实现阶段必须先解决，否则无法自证改动正确。三个选项：装 Node / 用户用 `!node test.js` 自己跑 / 改用浏览器手工验证。

### Node 冒烟测试可覆盖的

`test.js` 用 `fakeEl()` 桩模拟 DOM，通过 `els['#preview-pane'].innerHTML` 断言：

1. `showPhoto:false` 时 `headerRender` 输出与改动前**逐字节一致**（这是最高优先级的那条约束）
2. `showPhoto:true` + `photo:''` → 输出含 `cv-photo-empty` 和「照片」
3. `showPhoto:true` + 合法 data URL → 输出含 `<img class="cv-photo"`
4. `isValidPhotoDataURL` 对 `javascript:alert(1)`、`data:image/svg+xml;base64,...`、`http://x/a.jpg`、`C:\...\a.jpg`、`''`、`null`、`undefined`、数字全部返回 `false`；对 png/jpeg/webp 的 base64 data URL 返回 `true`
5. 严格格式往返（`toStrict` → `fromStrict`）：**有照片时** `photo` 与 `showPhoto` 均不丢；**仅有占位**（`showPhoto:true` + `photo:''`）时退化为 `showPhoto:false` —— 这是 §8 记录在案的已知行为，测试要断言它退化（而不是断言它保留），免得日后被误判成 bug
6. 清除照片后 `showPhoto` 仍为 `true`（回到虚线框）

### 测不了的（必须人工在 GUI 验证）

canvas 缩放管线需要真浏览器 API，Node 桩覆盖不到：

- 选图 → 缩略图出现 → 预览显示照片（完整链路）
- 大图（如 4000×3000）能正确缩到 400px
- 手机竖拍照片方向正确（EXIF）
- 带透明通道的 PNG 不会变黑
- HEIC 给出正确报错文案
- **`file://` 下在 Chrome 和 Firefox 各跑一遍**（canvas 污染风险，见 §3）
- 打印预览里虚线框**确实出现**（§7 的核心验收点）

### 接线改动

`test.js:45` 的 `order` 数组和 `index.html:92-100` 的 script 列表都要加 `js/photo.js`，位置在 `utils` 之后、`blocks` 之前（`blocks.js` 的 `headerRender` 会调用 `isValidPhotoDataURL`）。

## 10. 文档同步

- `CV_JSON_SPEC.md`：header 字段表补 `showPhoto` / `photo`；说明二者在严格格式下映射到 `basics.image`，以及「占位状态在严格格式下不保留」
- `README.md`：功能列表补一句照片
- `skills/convert-cv-to-easycv/SKILL.md`：header 字段说明同步
- `test-checklist.md`：补入 §9 的人工验证项（尤其是 `file://` 双浏览器 + 打印虚线框）

## 11. 明确不做

- 上传时的裁切 / 平移 / 缩放 UI（已选择固定框 + `object-fit: cover` 自动裁切）
- 照片位置微调控件（`object-position`）
- 编辑面板里「⚠ 照片未上传」的提前警告（用户明确说不用，嫌麻烦）
- 让 `convert-cv-to-easycv` skill 从 PDF 里提取照片并嵌入 base64（独立任务，另开）
- **照片存外部文件 / 以路径引用的方案。已评估并否决**，理由：
  1. 项目定位是 `file://` 双击打开（`README.md:7`、`:41`），而 `file://` 页面加载本地子资源的行为各浏览器不一致，Firefox 68+ 为每个 `file://` 文档分配唯一源、可能拦截
  2. 路径会使 JSON 失去自包含性 —— `README.md:47` 写明主要的 AI 集成方式是「agent 直接编辑 `*.json` 再导入」，路径方案下 agent 生成的 JSON 永远带不了照片
  3. 换机器 / 换目录即失效，且**应用本身无法修复**（浏览器不能凭路径打开文件，必须有用户手势），只能弹个死胡同式的报错
  4. 存路径的主要动机（避免 JSON 体积膨胀）已被 §3 的 400px 缩放解决
