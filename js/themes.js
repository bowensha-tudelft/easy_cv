/* Easy CV — 字体主题 + 配色预设 */
'use strict';

// 字体主题只决定排版（衬线 / 无衬线）；主题色由 state.accent 单独控制
const THEMES = {
  classic: { label: '经典（衬线）' },
  modern:  { label: '现代（无衬线）' }
};

// 5 个专业简历配色（来自调研：藏青/青绿/墨绿/酒红/深紫）
const ACCENT_PRESETS = [
  { hex: '#1F3864', name: '藏青' },
  { hex: '#168F8B', name: '青绿' },
  { hex: '#1E4D2B', name: '墨绿' },
  { hex: '#6E1F2E', name: '酒红' },
  { hex: '#4A2C5A', name: '深紫' }
];

const DEFAULT_ACCENT = '#1f3864';
