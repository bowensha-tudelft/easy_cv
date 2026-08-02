# Easy CV —— 简历块编辑器

一个**块式** CV 编辑器：左侧编辑块（点 `+` 添加）、右侧实时预览，`Ctrl+P` 直接导出 PDF。打开即用、零安装、离线可用。

## 快速开始

直接双击 `index.html`（用 Chrome / Edge 打开效果最佳）。首次打开会载入一份示例简历。

- **添加块**：点右下角 `+`，选择类型（个人信息 / 教育经历 / 工作·研究经历 / 项目 / 技能 / 自定义）
- **编辑**：每个块是一个表单，改动即时反映到中间预览
- **排序 / 复制 / 删除**：块标题右侧 `↑ ↓ ⋯`
- **导出 PDF**：`打印 / 导出 PDF`（或 `Ctrl+P`）→ 浏览器"另存为 PDF"。这是零依赖的 PDF 路径
- **保存 JSON（Ctrl+S）**：Chrome/Edge 下第一次让你选一次保存位置（建议选项目文件夹），之后自动静默存到同一文件；Firefox 无此 API，退回普通下载
- **保存 / 备份**：数据自动存到浏览器 `localStorage`（按文件路径隔离）；建议常点 `导出 ▾ → 应用 JSON` 备份
- **导入**：`导入 JSON`，支持应用 JSON 与 JSON Resume 两种格式
- **主题**：经典（衬线）/ 现代（无衬线）——只影响字体
- **配色**：5 个预设色 / 自定义色号 / 🎲 随机配色（主题色独立于字体，写入 JSON）

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
│   ├── sample.js       示例数据
│   └── boot.js         事件绑定 + 启动
├── sample-cv.json      示例数据（可作导入夹具）
├── CV_JSON_SPEC.md     JSON 字段与格式规范（供 AI / agent 阅读复用）
├── test.js             冒烟测试（Node：node test.js）
└── test-checklist.md   端到端人工验证清单
```

> 设计说明：用普通 `<script>`（非 ES module）按顺序加载，因此 **`file://` 双击即可运行**，不需要服务器、不需要构建。若以后要分享成"单个 HTML 文件"，可加一个拼接脚本（当前刻意不做，保持模块化）。

## AI 集成方式（不在应用内做 AI）

应用**不内置 AI 对话**（已砍掉，避免重复造轮子）。AI 能力通过两种方式使用：

1. **Agent / skill**：用 Claude Code 建一个 skill，读 `CV_JSON_SPEC.md` 了解字段与格式，直接编辑 `*.json`（再导入应用）。这是"改文件"式 agent 的推荐做法。
2. **对话式 AI**：把 `CV_JSON_SPEC.md` 发给任意 AI，让它生成/修改 JSON，再导入应用。

**`CV_JSON_SPEC.md` 是唯一需要维护的"AI 接口"**——它完整描述了字段、值格式、JSON Patch 路径和 JSON Resume 映射。

## 已知限制 / 注意事项

- **localStorage 按文件路径隔离**：移动 `index.html` 到别的路径会"丢"草稿（旧数据仍在旧路径下），用导出/导入兜底
- **Safari 可能禁用 file:// 下的 localStorage**：会提示用导出 JSON 手动保存
- **Firefox 打印**：不支持 `@page` 页脚页码（无页号），内容照常打印；Chrome/Edge 完整支持页码
- **打印保真**：多页时用 `@page` 边距而不是元素 padding，第 2 页起边距正常
- **ATS 解析**：单栏、真实文本、标准标题，ATS 友好
- **中文**：预览/打印用系统字体（Windows 微软雅黑 / 宋体），免费支持，无需打包字体
