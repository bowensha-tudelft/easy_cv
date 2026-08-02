/* Easy CV — 字体主题 + 配色预设 */
'use strict';

// 字体主题只决定排版（衬线 / 无衬线）；主题色由 state.accent 单独控制
const THEMES = {
  classic: { label: '经典（衬线）' },
  modern:  { label: '现代（无衬线）' }
};

const ACCENT_PRESETS = [
  { hex: '#1a3a5c', name: '藏青' },
  { hex: '#0f766e', name: '青绿' },
  { hex: '#7c3aed', name: '紫' },
  { hex: '#be123c', name: '玫红' },
  { hex: '#b45309', name: '琥珀' }
];

const DEFAULT_ACCENT = '#1a3a5c';
