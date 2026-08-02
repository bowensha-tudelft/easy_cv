/* Easy CV — AI 面板（v1：本地 echo 占位；v2 目标：DeepSeek agent 工具循环） */
'use strict';

const Providers = {
  echo: {
    label: '本地演示（离线）',
    async chat({ userText, state }) {
      const t = userText.toLowerCase();
      if (t.includes('shorten') || t.includes('缩短') || t.includes('简介')) {
        const idx = state.blocks.findIndex(b => b.type === 'header');
        if (idx < 0) return { text: '还没有「个人信息」块，先添加一个再让我改简介。' };
        const sum = state.blocks[idx].data.summary;
        if (!sum) return { text: '简介为空，没啥可缩短的。' };
        const words = sum.split(/\s+/).filter(Boolean);
        if (words.length <= 8) return { text: '简介已经很短了（' + words.length + ' 词），不用再缩。' };
        const n = Math.ceil(words.length / 2);
        return {
          action: 'patch',
          patches: [{ op: 'replace', path: '/blocks/' + idx + '/data/summary', value: words.slice(0, n).join(' ') }],
          note: '已把简介从 ' + words.length + ' 词缩短到 ' + n + ' 词（本地演示）。不满意可撤销。'
        };
      }
      if (t.includes('read') || t.includes('读') || t.includes('summar')) {
        const lines = state.blocks.map(b => {
          const tt = BlockRegistry.get(b.type);
          return '- ' + (tt ? tt.label : b.type) + ': ' + (blockSummary(b) || '(空)');
        });
        return { text: '当前 CV 共 ' + state.blocks.length + ' 个块：\n\n' + lines.join('\n') };
      }
      return { text: '（本地演示）这个面板还没有接入后端。\n\nv2 会用 DeepSeek 实现 agent 级能力：读取你的 CV → 用 JSON Patch 修改块 → 联网搜索 → 提问。\n\n现在可以试试：\n· 「把简介缩短一半」\n· 「读一下我的简历」' };
    }
  },
  deepseek: {
    label: 'DeepSeek（v2 接入中）',
    async chat() { return { text: 'DeepSeek 接入计划在 v2 实现：调用 api.deepseek.com（需你自己的 API key，设置里填）。当前先用本地演示。' }; }
  }
};

function aiAddMessage(role, text, withUndo) {
  const box = $('#ai-msgs');
  const el = document.createElement('div');
  el.className = 'ai-msg ' + role;
  el.textContent = text;
  if (withUndo) {
    const btn = document.createElement('button');
    btn.className = 'btn small';
    btn.textContent = '⤺ 撤销这次修改';
    btn.onclick = () => { store.undo(); btn.disabled = true; btn.textContent = '已撤销'; };
    el.appendChild(btn);
  }
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}
async function aiSend() {
  const input = $('#ai-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  aiAddMessage('user', text);
  const prov = Providers[$('#ai-provider').value] || Providers.echo;
  const res = await prov.chat({ userText: text, state: store.state });
  if (res && res.action === 'patch' && Array.isArray(res.patches)) {
    aiAddMessage('tool', '✓ read_cv');
    const r = store.applyPatch(res.patches);
    if (r.ok) { aiAddMessage('tool', '✓ patch_blocks（已应用，可撤销）'); aiAddMessage('asst', res.note || '已修改。', true); }
    else aiAddMessage('asst', '应用修改失败：' + r.error);
  } else {
    aiAddMessage('asst', (res && res.text) || '（无响应）');
  }
}
