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
function renderBlocks(blocks, theme, ctx) {
  if (theme.layout === 'sidebar') {
    const left = blocks.filter(b => b.type === 'header' || b.type === 'skills' || b.type === 'education' || b.type === 'custom');
    const right = blocks.filter(b => !left.includes(b));
    return '<div class="col col-left">' + renderSequence(left, ctx) + '</div>'
      + '<div class="col col-right">' + renderSequence(right, ctx) + '</div>';
  }
  return renderSequence(blocks, ctx);
}
function renderPreview(state) {
  const theme = THEMES[state.theme] || THEMES.classic;
  const fmt = (state.meta && state.meta.dateFormat) || 'MMM YYYY';
  const ctx = {
    esc: escapeHTML,
    icon,
    inline: inlineMarkup,
    markup: renderLightMarkup,
    fmtDate: v => fmtDate(v, fmt),
    range: (s, e, c) => rangeText(s, e, c, fmt)
  };
  const pageClass = state.theme + (theme.layout === 'sidebar' ? ' sidebar' : '');
  $('#preview-pane').innerHTML = '<div class="page ' + pageClass + '">' + renderBlocks(state.blocks, theme, ctx) + '</div>';
}
