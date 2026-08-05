/* Easy CV — 预览渲染（预览 DOM 即打印对象） */
'use strict';

function renderSequence(blocks, ctx) {
  let html = '';
  let lastType = null;
  let lastCustomTitle = null;
  for (const b of blocks) {
    if (b.visible === false) continue;
    const t = BlockRegistry.get(b.type);
    if (!t) continue;
    if (t.sectionTitle && b.type !== lastType) {
      const lang = (ctx && ctx.lang === 'zh') ? 'zh' : 'en';
      const title = (SECTION_TITLES[lang] && SECTION_TITLES[lang][b.type]) || t.sectionTitle;
      html += '<h2 class="section-title">' + escapeHTML(title) + '</h2>';
    }
    if (b.type === 'custom') {
      // 自定义块：相同 title 自动合并为一个标题（仅连续块；隔其他类型则各自出标题）
      const title = (b.data.title || '').trim();
      if (title && title !== lastCustomTitle) html += '<h2 class="section-title">' + escapeHTML(title) + '</h2>';
      lastCustomTitle = title;
    } else {
      lastCustomTitle = null;
    }
    html += t.renderHTML(b, ctx);
    lastType = b.type;
  }
  return html;
}
function renderPreview(state) {
  const themeKey = THEMES[state.theme] ? state.theme : 'classic';
  const fmt = (state.meta && state.meta.dateFormat) || 'MMM YYYY';
  const lang = (state.meta && state.meta.language) === 'zh' ? 'zh' : 'en';
  const zh = lang === 'zh';
  const ctx = {
    esc: escapeHTML,
    icon,
    inline: inlineMarkup,
    markup: renderLightMarkup,
    fmtDate: v => fmtDate(v, fmt),
    range: (s, e, c) => rangeText(s, e, c, fmt, lang),
    lang,
    colon: zh ? '：' : ': ',   // 冒号（中/英）
    list: zh ? '、' : ', '     // 列表分隔符（中/英）
  };
  const accent = normalizeAccent(state.accent);
  $('#preview-pane').innerHTML = '<div class="page ' + themeKey + '" style="--accent:' + accent + '">' + renderSequence(state.blocks, ctx) + '</div>';
}
