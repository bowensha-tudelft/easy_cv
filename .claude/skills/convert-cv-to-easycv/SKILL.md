---
name: convert-cv-to-easycv
description: >-
  Convert an existing CV/resume in ANY format (PDF, DOCX, HTML, Markdown, plain
  text, LinkedIn export, etc.) into the JSON format used by the Easy CV editor
  (easy_cv), so it can be imported with the app's 导入 button. Use this whenever
  the user wants to bring an existing resume/CV into Easy CV — for example
  "把这份简历转成 easy_cv 的 JSON", "convert this CV to easy-cv format", "帮我导入
  这份简历到 easy_cv", or when the user hands over a CV/resume file (PDF/DOCX/HTML/MD)
  that isn't already in easy_cv JSON. This is the INGESTION skill for easy_cv:
  if the user has an existing CV file and wants it as editable easy_cv data, use
  this skill. Do NOT use this for writing a new CV from scratch or tailoring one
  to a job posting (that's cv-creator / tailor-resume).
---

# Convert a CV to Easy-CV JSON

把一份已有的简历（PDF / Word / HTML / Markdown / 纯文本等任意格式）转成 **Easy CV 编辑器** 能直接导入的 JSON 文件。产物是一个 `.json`，用户打开 `easy_cv/index.html` → 「导入」→ 选择即可。

## 先读格式规范（必读）

Easy CV 的 JSON 格式由项目根目录的 **`CV_JSON_SPEC.md`** 权威定义：块类型、字段名、值格式、JSON Patch 等。**动手前必须读它**，字段名要与规范完全一致——拼错的字段渲染不出来。

## 工作流程

1. **定位源文件**：问清或找到用户给的简历文件（PDF/DOCX/HTML/MD/纯文本）。
2. **提取文本**：
   - PDF → 用 `pdf` skill（pdftotext / pypdf），保留布局提取正文
   - DOCX → 用 `docx` skill
   - HTML/Markdown/纯文本 → 直接读取
3. **结构化解析**：把内容切成区块：
   - 头部：姓名、职位/头衔、邮箱、电话、所在地、简介、个人主页链接（谷歌学术/GitHub/领英/ORCID 等）
   - 教育经历、工作经历、研究经历、项目、技能、奖项/证书/出版物/语言/教学等
4. **映射为 Easy CV 块**（对照 `CV_JSON_SPEC.md`）：
   - 头部信息 → 一个 `header` 块（`links` 数组带 `icon`/`url`）
   - 教育 → `education` 块（`degree`/`area`/`institution`/时间）
   - 正式工作（公司职位）→ `work` 块
   - 研究项目 → `research` 块（`position` 可填 "PhD Candidate / Research Assistant / 项目名"）
   - 项目 → `projects` 块
   - 技能 → `skills` 块（按类别分组，如 Programming / Tools）
   - 其他（出版物、奖项、证书、语言、教学）→ `custom` 块：`title` 作小节标题 + 复用 experience 字段（`position`/`organization`/`startDate`/`highlights`）
5. **生成 JSON 文件**：顶层为
   ```json
   {
     "schemaVersion": 1,
     "theme": "classic",
     "accent": "#1f3864",
     "meta": { "dateFormat": "MMM YYYY" },
     "blocks": [ ... ]
   }
   ```
   `theme` 可选 `classic`（衬线）或 `modern`（无衬线）；`accent` 为主题色 `#RRGGBB`。
6. **写文件**：默认存到源文件旁，如 `<name>.json`；告诉用户路径和导入步骤。

## 值格式约定（易错点）

- **日期**一律 `"YYYY-MM"`；`current: true` 时 `endDate` 留空字符串 `""`。
- `highlights` / `keywords` / `courses` 是**字符串数组**。
- `links` 每项必须有 `id`、`label`（可空）、`icon`（枚举见规范）、`url`。
- 布尔字段 `current` / `showLevel` / `visible` 为 `true`/`false`。
- 每个块要有唯一 `id`（`b_` + 随机），链接 `id`（`l_` + 随机）。

## 规则

- **忠实于原文，不编造**：源里没有的信息不要补（职位、日期、成绩等），拿不准的用 `ask_user` 或留空，并在交付说明里列出你做的假设（例如推断的职位抬头）。
- **字段名严格照抄规范**，不要自己发明。
- 顺序即显示顺序：header 通常最前；教育→经历→技能→其他。
- 转换完如果方便，可用 easy_cv 的 `node test.js` 思路或手动检查 JSON 合法性（`JSON.parse`），确保能导入。
