# Easy CV 数据格式说明（供 AI / agent 阅读）

> 读完这份文档即可**读取、生成、用 JSON Patch 修改** Easy CV 的数据。
> 它与 `js/blocks.js` 中的 `BLOCK_TYPES` 保持一致；如果代码改了字段，请同步更新本文档。

---

## 1. 总览

应用的**全部数据是一个 JSON 对象**（下文叫「应用 JSON」）。它是：

- 本地草稿 `localStorage['easy_cv.draft']` 的内容；
- 菜单「导出 → 应用 JSON」生成的文件内容；
- Ctrl+S 保存的文件内容。

另有「严格 JSON Resume」格式用于生态兼容（导入/导出时自动转换），见 §6。

顶层结构：

```json
{
  "schemaVersion": 1,
  "theme": "classic",
  "meta": { "dateFormat": "MMM YYYY" },
  "blocks": [ /* 有序块数组，顺序 = CV 里的显示顺序 */ ]
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `schemaVersion` | number | 固定 `1` |
| `theme` | string | `"classic"`（衬线）/ `"modern"`（无衬线）——只决定字体 |
| `accent` | string | 主题色，存为 `#RRGGBB`；解析器也接受 `#RGB`、`rgb(r,g,b)`（整数或百分比），统一归一化为 hex；独立于字体 |
| `meta.dateFormat` | string | `"MMM YYYY"`（显示 `Jun 2022`）或 `"YYYY-MM"`（显示 `2022-06`） |
| `blocks` | array | 块数组，见下 |

## 2. 块（Block）基础结构

```json
{
  "id": "b_ab12cd",
  "type": "work",
  "data": { },
  "visible": true,
  "collapsed": false
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 全局唯一，**不可变**。AI 新增块时需自己生成，如 `"b_" + 6 位随机` |
| `type` | string | 枚举，见 §3 |
| `data` | object | 该类型的字段集合，见 §3 |
| `visible` | boolean | 可选，默认 `true`；为 `false` 时该块不出现在预览/打印，但数据保留 |
| `collapsed` | boolean | 可选，仅编辑器折叠用，渲染可忽略，可不写 |

## 3. 块类型与 `data` 字段

字段类型说明：`text`=字符串；`month`=`"YYYY-MM"` 字符串（可空）；`textarea`=字符串（可含换行）；`bullets`=字符串数组（一项一条）；`tags`=字符串数组（chip，回车添加）；`list`=字符串数组（编辑器里每行一条可编辑）；`checkbox`=布尔；`links`=对象数组（见 header）；`select`=固定枚举。

### 3.1 `header` —— 个人信息（渲染在顶部，无小节标题）

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `name` | text | 姓名 | `"林晓 (Xiao Lin)"` |
| `title` | text | 职位/头衔 | `"ML Engineer"` |
| `email` | text | 邮箱 | `"x@example.com"` |
| `phone` | text | 电话 | `"+86 139 0000 0000"` |
| `location` | text | 所在地 | `"Shanghai, China"` |
| `summary` | textarea | 个人简介 | — |
| `links` | links | 链接数组 | 见下 |

`links` 每项：

```json
{ "id": "l_ab12cd", "label": "", "icon": "github", "url": "https://github.com/xxx" }
```

- `icon` 枚举：`github` `linkedin` `scholar`（谷歌学术）`website` `orcid` `email` `phone` `location` `generic`
- `label`：显示文字，可空；空时渲染器用图标默认名（GitHub / LinkedIn / Google Scholar / Website / ORCID / Email / Phone / Location / Link）
- `url`：完整 URL（必填才显示）

### 3.2 `education` —— 教育经历（小节标题 Education）

| 字段 | 类型 | 说明 |
|---|---|---|
| `institution` | text | 学校 |
| `location` | text | 地点 |
| `degree` | text | 学位，如 `"PhD"` |
| `area` | text | 专业，如 `"Computer Science"`（渲染为 `PhD in Computer Science`） |
| `startDate` | month | 开始 |
| `endDate` | month | 结束；`current=true` 时应为空 |
| `current` | checkbox | 在读中 |
| `score` | text | GPA/成绩，可选 |
| `courses` | list | 课程列表（编辑器里每行一门，可编辑） |
| `highlights` | bullets | 亮点 |

### 3.3 `work` / `research` —— 工作经历 / 研究经历（小节标题 Work Experience / Research Experience）

`work` 用于公司/机构里的正式职位；`research` 用于研究项目/实验室经历（`position` 可填 "PhD Candidate / Research Assistant / 项目名" 等）。两者**字段完全相同**，仅小节标题不同：**Work Experience** / **Research Experience**。

> 迁移：2026-08 起旧的 `experience` 类型拆分为 `work` / `research`；导入旧数据时旧 `experience` 块自动迁移为 `research`。

| 字段 | 类型 | 说明 |
|---|---|---|
| `position` | text | 职位 / 项目 |
| `organization` | text | 公司/机构（或实验室） |
| `location` | text | 地点 |
| `startDate` | month | 开始 |
| `endDate` | month | 结束；`current=true` 时为空 |
| `current` | checkbox | 至今 |
| `url` | text | 链接，可选 |
| `summary` | textarea | 概述 |
| `highlights` | bullets | 职责/成果，每项一条 |

### 3.4 `projects` —— 项目（小节标题 Projects）

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | text | 项目名 |
| `url` | text | 链接，可选 |
| `description` | textarea | 描述 |
| `startDate` | month | 开始 |
| `endDate` | month | 结束；`current=true` 时为空 |
| `current` | checkbox | 进行中 |
| `roles` | tags | 角色 |
| `keywords` | tags | 关键词 |
| `highlights` | bullets | 亮点 |

### 3.5 `skills` —— 技能（小节标题 Skills）

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | text | 技能组名，如 `"Programming Languages"` |
| `keywords` | list | 技能项（字符串数组；编辑器里每行一条可编辑。**没有熟练度字段**，熟练度直接写进内容，如 `"Python (Advanced)"`） |

### 3.6 `custom` —— 自定义（字段完全继承 `work`/`research`，另加一个 `title` 小节标题）

`custom` 的 `data` 与 `work`/`research` 完全相同（`position`/`organization`/`location`/`startDate`/`endDate`/`current`/`url`/`summary`/`highlights`），**仅多一个 `title`**，渲染为小节标题。适合 awards / certifications / languages 等单条目场景。

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | text | 小节标题（唯一比 work/research 多的字段） |
| 其余字段 | — | 见 §3.3 |

> 旧格式（`subtitle`/`rightText`/`columns`/`body`）导入时自动迁移：`subtitle→position`，`body` 的 `- ` 行→`highlights`，其余行→`summary`。

## 4. 值格式约定（容易出错处）

1. **日期**一定是 `"YYYY-MM"` 字符串（如 `"2022-06"`）；`current=true` 时 `endDate` 写空字符串 `""`。
2. `bullets` / `list` / `tags` 都是字符串数组；空就写 `[]`。
3. `links` 必须每项有 `id`、`icon`、`url`。
4. 布尔字段 `current`、`showLevel`、`visible` 为 `true`/`false`。
5. 不要把 `custom` 的 `body` 写成 HTML——只用它的轻量标记语法。

## 5. 用 JSON Patch 修改数据（AI 编辑方式）

应用内部 `StateStore.applyPatch()` 支持 **RFC 6902 子集**：`add` `replace` `remove` `move` `copy` `test`。
Patch 的**路径根是应用 JSON 对象本身**，一次提交一个 patch 数组（原子应用、自动进入撤销栈、可撤销）。

常见路径：

- 改某块的某字段：`/blocks/{index}/data/{field}`
- 改 links 里某项：`/blocks/{index}/data/links/{i}/url`
- 给 bullets 追加一条：`/blocks/{index}/data/highlights/-`
- 删数组中第 i 项：`/blocks/{index}/data/keywords/0`

示例 1 —— 把 header（第 0 块）的简介改短：

```json
[
  { "op": "replace", "path": "/blocks/0/data/summary", "value": "简短版简介。" }
]
```

示例 2 —— 给第 1 块 work 追加一条成果：

```json
[
  { "op": "add", "path": "/blocks/1/data/highlights/-", "value": "Led a team of 3 to ship feature X" }
]
```

示例 3 —— 新增一个 skills 块（追加到末尾）：

```json
[
  {
    "op": "add",
    "path": "/blocks/-",
    "value": {
      "id": "b_x1k2",
      "type": "skills",
      "data": { "name": "Tools", "keywords": ["Git", "Docker"], "level": "", "showLevel": false },
      "visible": true
    }
  }
]
```

> ⚠️ 字段名必须与 §3 完全一致；拼错会被当成新字段，渲染时不显示。不要改动已有块的 `id`。

## 6. 与 JSON Resume 的映射

`JSONResume.toStrict()` 把应用 JSON 转成 jsonresume.org 标准（已不再提供严格导出按钮，映射仍用于内部与导入兼容）：

| 块类型 | 应用字段 → | JSON Resume |
|---|---|---|
| `header` | `name`/`title`/`email`/`phone`/`location`/`summary` → | `basics.name` / `basics.label` / `basics.email` / `basics.phone` / `basics.location.city` / `basics.summary` |
| `header.links` | `icon == "website"` → | `basics.url` |
| `header.links` | 其余 → | `basics.profiles[]`（`network`=label 或图标默认名，`url`） |
| `work` / `research` | → | `work[]`（`organization→name`，`position`，`endDate` 在 `current=true` 时为 null） |
| `education` | → | `education[]`（`degree→studyType`） |
| `projects` | → | `projects[]` |
| `skills` | → | `skills[]` |
| `custom` | 丢弃 | （严格导出不包含） |

「导入」时若 JSON 没有 `blocks` 字段，则按 `fromStrict()` 反向还原为块。

## 7. 渲染规则（AI 应知道的展示行为）

- **小节分组**：连续同类型块合并到一个小节标题下。有自动标题的类型：`education→Education`、`work→Work Experience`、`research→Research Experience`、`projects→Projects`、`skills→Skills`；`header` 与 `custom` 没有自动标题（`custom` 用自身 `title` 作标题）。
- **custom 标题合并**：连续多个 `custom` 块的 `title` 相同时，只渲染**一个**小节标题，其下依次列出各块内容（适合把多个同类条目放一个标题下）；`title` 不同或中间隔着其他类型时，各自独立出标题。空 `title` 不渲染标题。
- **日期显示**：由 `meta.dateFormat` 决定 `Jun 2022` 或 `2022-06`；`current=true` 显示 `开始 – Present`。
- `visible:false` 的块在预览/打印中隐藏。
- 顺序即文档顺序：header 建议放最前；想让某小节出现在别的类型之间，就调整 `blocks` 数组顺序。

## 8. 完整最小示例

```json
{
  "schemaVersion": 1,
  "theme": "classic",
  "accent": "#1a3a5c",
  "meta": { "dateFormat": "MMM YYYY" },
  "blocks": [
    {
      "id": "b_a1",
      "type": "header",
      "data": {
        "name": "林晓 (Xiao Lin)",
        "title": "Machine Learning Engineer",
        "email": "xiao@example.com",
        "phone": "+86 139 0000 0000",
        "location": "Shanghai, China",
        "summary": "5+ years building LLM systems.",
        "links": [
          { "id": "l_a1", "label": "", "icon": "github", "url": "https://github.com/xiaolin" },
          { "id": "l_a2", "label": "", "icon": "scholar", "url": "https://scholar.google.com/citations?user=xiaolin" }
        ]
      }
    },
    {
      "id": "b_a2",
      "type": "work",
      "data": {
        "position": "Senior ML Engineer",
        "organization": "Alibaba Cloud",
        "location": "Hangzhou",
        "startDate": "2021-07",
        "endDate": "",
        "current": true,
        "url": "",
        "summary": "Leading retrieval team.",
        "highlights": ["Cut answer latency by 40%"]
      }
    }
  ]
}
```

## 9. 给 AI 的操作守则（建议写进 system prompt）

1. **读**：先调用 `read_cv` 拿到当前完整状态对象，再动手，不要凭空假设字段。
2. **改**：用 `patch_blocks` 一次提交一组 patch（原子 + 可撤销）；能一次改完就一次改完。
3. **校验**：字段名与 §3 严格一致；不改已有 `id`；新增块用唯一 `id`；日期用 `YYYY-MM`。
4. **未知**：内容缺信息时用 `ask_user` 澄清，不要编造事实。
5. **改完告知**：说明改了什么、改在哪个块，方便用户用撤销回退。
