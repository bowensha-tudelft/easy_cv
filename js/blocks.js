/* Easy CV — 块类型注册表 + 预览渲染函数 */
'use strict';

function headerRender(b, ctx) {
  const d = b.data, esc = ctx.esc;
  const contact = [];
  if (d.email) contact.push('<a href="mailto:' + esc(d.email) + '">' + ctx.icon('email') + esc(d.email) + '</a>');
  if (d.phone) contact.push('<span>' + ctx.icon('phone') + esc(d.phone) + '</span>');
  if (d.location) contact.push('<span>' + ctx.icon('location') + esc(d.location) + '</span>');
  const links = (d.links || []).filter(l => l.url)
    .map(l => '<a class="cv-link" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + ctx.icon(l.icon) + esc(l.label || ICON_LABELS[l.icon] || 'Link') + '</a>')
    .join('');
  // 自定义信息（如「籍贯：江苏」）：流式排列，整项不拆行。
  // 先 trim 再过滤 —— 否则纯空白条目会渲染出一个空的 .cv-details 行。
  const details = (d.details || [])
    .map(x => ({ k: String((x && x.label) || '').trim(), v: String((x && x.value) || '').trim() }))
    .filter(x => x.k || x.v)
    .map(x => '<span class="dt">' + (x.k && x.v ? esc(x.k) + ctx.colon + esc(x.v) : esc(x.k || x.v)) + '</span>')
    .join('');
  const body = (d.name ? '<h1>' + esc(d.name) + '</h1>' : '')
    + (d.title ? '<div class="cv-title">' + esc(d.title) + '</div>' : '')
    + (details ? '<div class="cv-details">' + details + '</div>' : '')
    + (contact.length ? '<div class="cv-contact">' + contact.join('') + '</div>' : '')
    + (links ? '<div class="cv-links">' + links + '</div>' : '')
    + (d.summary ? '<p class="cv-summary">' + ctx.inline(d.summary) + '</p>' : '');

  // 未勾选「显示照片」：不进入两列布局，走与没有照片功能时同一条拼接路径
  //（不是靠 CSS 恰好没变化）。body 里各字段仍各自按「有没有内容」决定是否输出。
  if (!d.showPhoto) return '<header class="cv-header">' + body + '</header>';

  // photo 经校验后直接插入，不做 escapeHTML：base64 字母表是 A-Za-z0-9+/=，
  // 不含 & < > " '，转义对它是恒等操作；校验已保证字符串形状。
  const photo = isValidPhotoDataURL(d.photo)
    ? '<img class="cv-photo" src="' + d.photo + '" alt="">'
    : '<div class="cv-photo cv-photo-empty">照片</div>';
  return '<header class="cv-header has-photo">'
    + '<div class="cv-header-main">' + body + '</div>'
    + photo
    + '</header>';
}
function educationRender(b, ctx) {
  const d = b.data, esc = ctx.esc;
  // 英文用 "PhD in Mechanical Engineering"；中文不用 in，直接拼接
  const head = ctx.lang === 'zh'
    ? [d.degree, d.area].filter(Boolean).join(' ')
    : [d.degree, d.area ? 'in ' + d.area : ''].filter(Boolean).join(' ');
  const org = [d.institution, d.location].filter(Boolean).join(' · ');
  const hs = (d.highlights || []).filter(Boolean);
  return '<div class="entry">'
    + '<div class="entry-head">'
    + (head ? '<h3>' + esc(head) + '</h3>' : '')
    + '<div class="dates">' + ctx.range(d.startDate, d.endDate, d.current) + '</div>'
    + '</div>'
    + (org ? '<div class="org">' + esc(org) + '</div>' : '')
    + (d.score ? '<p class="score">GPA' + ctx.colon + esc(d.score) + '</p>' : '')
    + ((d.courses || []).length ? '<div class="tags-line">' + d.courses.map(c => '<span class="ptag">' + esc(c) + '</span>').join('') + '</div>' : '')
    + (hs.length ? '<ul>' + hs.map(h => '<li>' + ctx.inline(h) + '</li>').join('') + '</ul>' : '')
    + '</div>';
}
function experienceRender(b, ctx) {
  const d = b.data, esc = ctx.esc;
  const org = [d.organization, d.location].filter(Boolean).join(' · ');
  const hs = (d.highlights || []).filter(Boolean);
  return '<div class="entry">'
    + '<div class="entry-head">'
    + (d.position ? '<h3>' + esc(d.position) + '</h3>' : '')
    + '<div class="dates">' + ctx.range(d.startDate, d.endDate, d.current) + '</div>'
    + '</div>'
    + (org ? '<div class="org">' + esc(org) + (d.url ? ' · <a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.url) + '</a>' : '') + '</div>' : '')
    + (d.summary ? '<p>' + ctx.inline(d.summary) + '</p>' : '')
    + (hs.length ? '<ul>' + hs.map(h => '<li>' + ctx.inline(h) + '</li>').join('') + '</ul>' : '')
    + '</div>';
}
function projectsRender(b, ctx) {
  const d = b.data, esc = ctx.esc;
  const hs = (d.highlights || []).filter(Boolean);
  return '<div class="entry">'
    + '<div class="entry-head">'
    + (d.name ? '<h3>' + esc(d.name) + '</h3>' : '')
    + '<div class="dates">' + ctx.range(d.startDate, d.endDate, d.current) + '</div>'
    + '</div>'
    + ((d.roles || []).length ? '<div class="org">' + d.roles.map(esc).join(ctx.list) + '</div>' : '')
    + (d.description ? '<p>' + ctx.inline(d.description) + '</p>' : '')
    + (d.url ? '<div class="org"><a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.url) + '</a></div>' : '')
    + ((d.keywords || []).length ? '<div class="tags-line">' + d.keywords.map(k => '<span class="ptag">' + esc(k) + '</span>').join('') + '</div>' : '')
    + (hs.length ? '<ul>' + hs.map(h => '<li>' + ctx.inline(h) + '</li>').join('') + '</ul>' : '')
    + '</div>';
}
function skillsRender(b, ctx) {
  const d = b.data, esc = ctx.esc;
  return '<div class="skill-row"><span class="skill-name">' + esc(d.name) + '</span>'
    + ((d.keywords || []).length ? ctx.colon + d.keywords.map(esc).join(ctx.list) : '')
    + '</div>';
}
function customRender(b, ctx) {
  // 标题由 renderSequence 统一输出（相同 title 自动合并），这里只渲染内容
  return '<section class="custom-block">' + experienceRender(b, ctx) + '</section>';
}

/* 自动小节标题的多语言映射（zh 与「+」添加菜单的中文标签一致） */
const SECTION_TITLES = {
  en: { education: 'Education', work: 'Work Experience', research: 'Research Experience', projects: 'Projects', skills: 'Skills' },
  zh: { education: '教育经历', work: '工作经历', research: '研究经历', projects: '项目', skills: '技能' }
};

const BLOCK_TYPES = {
  header: {
    key: 'header', label: '个人信息', icon: 'user', sectionTitle: null,
    defaults: () => ({ name: '', title: '', details: [], email: '', phone: '', location: '', summary: '', links: [], showPhoto: false, photo: '' }),
    fields: [
      { key: 'name', label: '姓名', type: 'text' },
      { key: 'title', label: '职位 / 头衔', type: 'text' },
      { key: 'details', label: '自定义信息（如 籍贯 / 政治面貌）', type: 'details' },
      { key: 'email', label: '邮箱', type: 'email' },
      { key: 'phone', label: '电话', type: 'text' },
      { key: 'location', label: '所在地', type: 'text' },
      { key: 'summary', label: '个人简介', type: 'textarea' },
      { key: 'showPhoto', label: '显示照片', type: 'checkbox' },
      { key: 'photo', label: '照片（3:4 竖版最佳）', type: 'photo' },
      { key: 'links', label: '链接（谷歌学术 / GitHub / 领英等）', type: 'links' }
    ],
    renderHTML: headerRender
  },
  education: {
    key: 'education', label: '教育经历', icon: 'education', sectionTitle: 'Education',
    defaults: () => ({ institution: '', location: '', degree: '', area: '', startDate: '', endDate: '', current: false, score: '', courses: [], highlights: [] }),
    fields: [
      { key: 'institution', label: '学校', type: 'text' },
      { key: 'degree', label: '学位', type: 'text' },
      { key: 'area', label: '专业', type: 'text' },
      { key: 'location', label: '地点', type: 'text' },
      { key: 'startDate', label: '开始', type: 'month', inline: true },
      { key: 'endDate', label: '结束', type: 'month', inline: true },
      { key: 'current', label: '在读中', type: 'checkbox' },
      { key: 'score', label: 'GPA / 成绩', type: 'text' },
      { key: 'courses', label: '课程（每行一门）', type: 'bullets' },
      { key: 'highlights', label: '亮点', type: 'bullets' }
    ],
    renderHTML: educationRender
  },
  work: {
    key: 'work', label: '工作经历', icon: 'briefcase', sectionTitle: 'Work Experience',
    defaults: () => ({ organization: '', position: '', location: '', startDate: '', endDate: '', current: false, summary: '', highlights: [], url: '' }),
    fields: [
      { key: 'position', label: '职位', type: 'text' },
      { key: 'organization', label: '公司 / 机构', type: 'text' },
      { key: 'location', label: '地点', type: 'text' },
      { key: 'startDate', label: '开始', type: 'month', inline: true },
      { key: 'endDate', label: '结束', type: 'month', inline: true },
      { key: 'current', label: '至今在职', type: 'checkbox' },
      { key: 'url', label: '链接', type: 'url' },
      { key: 'summary', label: '概述', type: 'textarea' },
      { key: 'highlights', label: '职责 / 成果', type: 'bullets' }
    ],
    renderHTML: experienceRender
  },
  research: {
    key: 'research', label: '研究经历', icon: 'flask', sectionTitle: 'Research Experience',
    defaults: () => ({ organization: '', position: '', location: '', startDate: '', endDate: '', current: false, summary: '', highlights: [], url: '' }),
    fields: [
      { key: 'position', label: '职位 / 项目', type: 'text' },
      { key: 'organization', label: '机构 / 实验室', type: 'text' },
      { key: 'location', label: '地点', type: 'text' },
      { key: 'startDate', label: '开始', type: 'month', inline: true },
      { key: 'endDate', label: '结束', type: 'month', inline: true },
      { key: 'current', label: '至今', type: 'checkbox' },
      { key: 'url', label: '链接', type: 'url' },
      { key: 'summary', label: '概述', type: 'textarea' },
      { key: 'highlights', label: '职责 / 成果', type: 'bullets' }
    ],
    renderHTML: experienceRender
  },
  projects: {
    key: 'projects', label: '项目', icon: 'folder', sectionTitle: 'Projects',
    defaults: () => ({ name: '', url: '', description: '', startDate: '', endDate: '', current: false, keywords: [], roles: [], highlights: [] }),
    fields: [
      { key: 'name', label: '项目名', type: 'text' },
      { key: 'url', label: '链接', type: 'url' },
      { key: 'startDate', label: '开始', type: 'month', inline: true },
      { key: 'endDate', label: '结束', type: 'month', inline: true },
      { key: 'current', label: '进行中', type: 'checkbox' },
      { key: 'roles', label: '角色（回车添加）', type: 'tags' },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'keywords', label: '关键词', type: 'tags' },
      { key: 'highlights', label: '亮点', type: 'bullets' }
    ],
    renderHTML: projectsRender
  },
  skills: {
    key: 'skills', label: '技能', icon: 'zap', sectionTitle: 'Skills',
    defaults: () => ({ name: '', keywords: [] }),
    fields: [
      { key: 'name', label: '技能组名', type: 'text' },
      { key: 'keywords', label: '技能（每行一条，熟练度直接写进内容，如 "Python (Advanced)"）', type: 'bullets' }
    ],
    renderHTML: skillsRender
  },
  custom: {
    key: 'custom', label: '自定义', icon: 'grid', sectionTitle: null,
    defaults: () => ({ title: '', position: '', organization: '', location: '', startDate: '', endDate: '', current: false, url: '', summary: '', highlights: [] }),
    fields: [
      { key: 'title', label: '标题（小节标题）', type: 'text' },
      { key: 'position', label: '职位 / 项目', type: 'text' },
      { key: 'organization', label: '公司 / 机构', type: 'text' },
      { key: 'location', label: '地点', type: 'text' },
      { key: 'startDate', label: '开始', type: 'month', inline: true },
      { key: 'endDate', label: '结束', type: 'month', inline: true },
      { key: 'current', label: '至今', type: 'checkbox' },
      { key: 'url', label: '链接', type: 'url' },
      { key: 'summary', label: '概述', type: 'textarea' },
      { key: 'highlights', label: '职责 / 成果', type: 'bullets' }
    ],
    renderHTML: customRender
  }
};

const BlockRegistry = {
  get(t) { return BLOCK_TYPES[t] || null; },
  make(t) { const def = BLOCK_TYPES[t] || BLOCK_TYPES.custom; return { id: uid('b'), type: def.key, data: def.defaults(), visible: true }; }
};

function blockSummary(b) {
  const d = b.data;
  switch (b.type) {
    case 'header': return d.title || '';
    case 'education': return [d.degree, d.institution].filter(Boolean).join(' · ');
    case 'work':
    case 'research':
    case 'experience': return (d.position || '') + (d.organization ? ' @ ' + d.organization : '');
    case 'projects': return d.name || '';
    case 'skills': return d.name || '';
    case 'custom': return d.title || '';
    default: return '';
  }
}
