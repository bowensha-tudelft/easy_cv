# Easy CV —— 简历块编辑器

一个**块式** CV 编辑器：左侧编辑块（点 `+` 添加）、中间实时预览、右侧 AI 助手面板。打开即用、零安装、离线可用。

## 快速开始

直接双击 `index.html`（用 Chrome / Edge 打开效果最佳）。首次打开会载入一份示例简历。

- **添加块**：点右下角 `+`，选择类型（个人信息 / 教育经历 / 工作·研究经历 / 项目 / 技能 / 自定义）
- **编辑**：每个块是一个表单，改动即时反映到中间预览
- **排序 / 复制 / 删除**：块标题右侧 `↑ ↓ ⋯`
- **导出 PDF**：`打印 / 导出 PDF`（或 `Ctrl+P`）→ 浏览器"另存为 PDF"。这是零依赖的 PDF 路径
- **保存 JSON（Ctrl+S）**：Chrome/Edge 下第一次让你选一次保存位置（建议选项目文件夹），之后自动静默存到同一文件；Firefox 无此 API，退回普通下载
- **保存 / 备份**：数据自动存到浏览器 `localStorage`（按文件路径隔离）；建议常点 `导出 ▾ → 应用 JSON` 备份
- **导入**：`导入 JSON`，支持应用 JSON 与 JSON Resume 两种格式
- **主题**：经典（衬线）/ 现代（无衬线）/ 双栏侧边

## 目录结构

```
easy_cv/
├── index.html          入口（壳 + 菜单/弹层标记 + 模块加载）
├── css/style.css       全部样式（含 @media print 打印样式）
├── js/
│   ├── utils.js        工具函数 + 内联 SVG 图标
│   ├── blocks.js       块类型注册表 + 预览渲染函数
│   ├── themes.js       主题配置
│   ├── store.js        StateStore（数据源/历史/undo）+ JSON Patch
│   ├── render.js       预览渲染（预览 DOM 即打印对象）
│   ├── editor.js       编辑器 UI（表单字段、tags/links 子组件、弹层）
│   ├── export.js       导出/导入/打印/设置 + JSON Resume 映射
│   ├── ai.js           AI 面板（v1 本地 echo 占位）
│   ├── sample.js       示例数据
│   └── boot.js         事件绑定 + 启动
├── sample-cv.json      示例数据（可作导入夹具）
├── CV_JSON_SPEC.md     JSON 字段与格式规范（供 AI / agent 阅读复用）
├── test.js             冒烟测试（Node：node test.js）
└── test-checklist.md   端到端人工验证清单
```

> 设计说明：用普通 `<script>`（非 ES module）按顺序加载，因此 **`file://` 双击即可运行**，不需要服务器、不需要构建。若以后要分享成"单个 HTML 文件"，可加一个拼接脚本（当前刻意不做，保持模块化）。

## AI 面板（当前为本地演示）

右侧 AI 助手 v1 只提供**本地占位**（离线可用）：

- 输入「把简介缩短一半」→ 演示通过 JSON Patch 修改数据 + 可撤销
- 输入「读一下我的简历」→ 列出当前所有块

**v2 规划**（未实现）：

- 接 **DeepSeek**（OpenAI 兼容 API），用你自己的 key（设置里填，存本机浏览器 localStorage）；让 AI 读/改 CV 的字段规范见 **`CV_JSON_SPEC.md`**（可作为 agent 的 system prompt 上下文）
- agent 级能力：`read_cv`（读取当前 CV）→ `patch_blocks`（JSON Patch 修改块，可撤销）→ `web_search`（Tavily 联网搜索）→ `ask_user`（提问）
- ⚠️ 注意：`file://` 下请求 API 需要服务端返回 `Access-Control-Allow-Origin: *`，接 v2 时先用 `curl` 验证 DeepSeek / Tavily 的 CORS

## 已知限制 / 注意事项

- **localStorage 按文件路径隔离**：移动 `index.html` 到别的路径会"丢"草稿（旧数据仍在旧路径下），用导出/导入兜底
- **Safari 可能禁用 file:// 下的 localStorage**：会提示用导出 JSON 手动保存
- **Firefox 打印**：不支持 `@page` 页脚页码（无页号），内容照常打印；Chrome/Edge 完整支持页码
- **打印保真**：多页时用 `@page` 边距而不是元素 padding，第 2 页起边距正常
- **ATS 解析**：默认单栏、真实文本、标准标题，ATS 友好；双栏主题是可选且提示有解析风险
- **中文**：预览/打印用系统字体（Windows 微软雅黑 / 宋体），免费支持，无需打包字体
