/* Easy CV — 预览渲染（预览 DOM 即打印对象） */
'use strict';

function renderSequence(blocks, ctx) {
  let html = '';
  let lastType = null;
  for (const b of blocks) {
    if (b.visible === false) continue;
    const t = BlockRegistry.get(b.type);
    if (!t) continue;
    if (t.sectionTitle && b.type !== lastType) html += '<h2 class="section-title">' + escapeHTML(t.sectionTitle) + '</h2>';
    html += t.renderHTML(b, ctx);
    lastType = b.type;
  }
  return html;
}
function renderPreview(state) {
  const themeKey = THEMES[state.theme] ? state.theme : 'classic';
  const fmt = (state.meta && state.meta.dateFormat) || 'MMM YYYY';
  const ctx = {
    esc: escapeHTML,
    icon,
    inline: inlineMarkup,
    markup: renderLightMarkup,
    fmtDate: v => fmtDate(v, fmt),
    range: (s, e, c) => rangeText(s, e, c, fmt)
  };
  const accent = normalizeAccent(state.accent);
  $('#preview-pane').innerHTML = '<div class="page ' + themeKey + '" style="--accent:' + accent + '">' + renderSequence(state.blocks, ctx) + '</div>';
}
