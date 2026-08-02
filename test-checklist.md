# Easy CV —— 端到端验证清单

## v1（编辑器 + 预览 + 打印 PDF + JSON）

1. **打开**：Chrome/Edge 双击 `index.html` → 载入示例 CV（林晓）。
2. **添加块**：右下角 `+` → 选各类块 → 新块自动聚焦首个输入框并高亮。
3. **编辑联动**：改任意字段 → 中间预览即时更新；含中文（如姓名"林晓"）正常显示。
4. **排序/复制/删除**：`↑ ↓` 排序、`⋯` 内复制/删除 → 预览跟随；`Ctrl+Z` 可撤销。
5. **折叠**：点块标题折叠/展开。
6. **打印 PDF**：`打印 / 导出 PDF` 或 `Ctrl+P` → 另存为 PDF，验证：
   - 无工具栏/编辑器/AI 面板骨架
   - A4 尺寸、页脚页码（Chrome/Edge；Firefox 无页码属预期）
   - 多页时断页不截断块、中文正常
7. **持久化**：刷新页面 → 草稿从 localStorage 恢复。
8. **JSON 往返**：`导出` → 新浏览器 profile `导入` → 内容一致。
9. **打印干净**：打印时取消勾选「页眉和页脚」，PDF 不带日期/页面标题。

## v1.1（AI 聊天 UI + 本地占位）

10. **断网演示**：断网状态下，AI 面板可用（本地 echo）。
11. 「把简介缩短一半」→ 出现 `✓ read_cv` / `✓ patch_blocks` → 简介变短 → 消息上的「撤销这次修改」恢复。
12. 「读一下我的简历」→ 列出所有块。

## v2（DeepSeek agent，联网）—— 未实现

- [ ] `curl -i -X OPTIONS https://api.deepseek.com/chat/completions` 确认 CORS `Access-Control-Allow-Origin: *`
- [ ] 设置里填 DeepSeek key → 真实对话改写 block（走 patch + undo）
- [ ] Tavily key → 联网搜索返回摘要

## v2.1（stretch）—— 未实现

- [ ] Typst 高级导出：生成的 `.typ` 在 typst playground 能编译
- [ ] 浏览器内 WASM 编译含中文的 PDF
- [ ] `languages` / `awards` 块类型、拖拽排序

## 回归

- `node test.js` 全部通过（冒烟测试：启动渲染、StateStore 增删改/撤销重做、JSON Patch、JSON Resume 往返、主题、转义、AI echo patch）
