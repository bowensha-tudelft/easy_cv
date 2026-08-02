/* Easy CV — 导出 / 导入 / 打印 / 设置（含 JSON Resume 兼容映射） */
'use strict';

let storageOK = true;

function networkIcon(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('google')) return 'scholar';
  if (n.includes('github')) return 'github';
  if (n.includes('linkedin')) return 'linkedin';
  if (n.includes('orcid')) return 'orcid';
  return 'generic';
}

const JSONResume = {
  toStrict(state) {
    const basics = { profiles: [] };
    const work = [], education = [], projects = [], skills = [];
    for (const b of state.blocks) {
      const d = b.data;
      switch (b.type) {
        case 'header':
          if (d.name) basics.name = d.name;
          if (d.title) basics.label = d.title;
          if (d.email) basics.email = d.email;
          if (d.phone) basics.phone = d.phone;
          if (d.location) { basics.location = basics.location || {}; basics.location.city = d.location; }
          if (d.summary) basics.summary = d.summary;
          for (const l of d.links || []) {
            if (!l.url) continue;
            if (l.icon === 'website') basics.url = l.url;
            else basics.profiles.push({ network: l.label || ICON_LABELS[l.icon] || 'profile', url: l.url });
          }
          break;
        case 'experience':
          work.push({ name: d.organization, position: d.position, location: d.location, startDate: d.startDate, endDate: d.current ? null : (d.endDate || null), summary: d.summary, highlights: d.highlights, url: d.url });
          break;
        case 'education':
          education.push({ institution: d.institution, location: d.location, studyType: d.degree, area: d.area, startDate: d.startDate, endDate: d.current ? null : (d.endDate || null), score: d.score, courses: d.courses, highlights: d.highlights });
          break;
        case 'projects':
          projects.push({ name: d.name, url: d.url, description: d.description, startDate: d.startDate, endDate: d.current ? null : (d.endDate || null), keywords: d.keywords, roles: d.roles, highlights: d.highlights });
          break;
        case 'skills':
          skills.push({ name: d.name, keywords: d.keywords, level: d.level });
          break;
      }
    }
    return { basics, work, education, projects, skills };
  },
  fromStrict(r) {
    const blocks = [];
    if (r.basics) {
      blocks.push({
        id: uid('b'), type: 'header', visible: true,
        data: {
          name: r.basics.name || '', title: r.basics.label || '', email: r.basics.email || '',
          phone: r.basics.phone || '',
          location: (r.basics.location && r.basics.location.city) || '',
          summary: r.basics.summary || '',
          links: (r.basics.profiles || []).map(p => ({ id: uid('l'), label: p.network || '', icon: networkIcon(p.network), url: p.url || '' }))
            .concat(r.basics.url ? [{ id: uid('l'), label: 'Website', icon: 'website', url: r.basics.url }] : [])
        }
      });
    }
    for (const w of r.work || []) blocks.push({ id: uid('b'), type: 'experience', visible: true, data: { organization: w.name || '', position: w.position || '', location: w.location || '', startDate: w.startDate || '', endDate: w.endDate || '', current: !w.endDate, summary: w.summary || '', highlights: w.highlights || [], url: w.url || '' } });
    for (const e of r.education || []) blocks.push({ id: uid('b'), type: 'education', visible: true, data: { institution: e.institution || '', location: e.location || '', degree: e.studyType || '', area: e.area || '', startDate: e.startDate || '', endDate: e.endDate || '', current: !e.endDate, score: e.score || '', courses: e.courses || [], highlights: e.highlights || [] } });
    for (const p of r.projects || []) blocks.push({ id: uid('b'), type: 'projects', visible: true, data: { name: p.name || '', url: p.url || '', description: p.description || '', startDate: p.startDate || '', endDate: p.endDate || '', current: !p.endDate, keywords: p.keywords || [], roles: p.roles || [], highlights: p.highlights || [] } });
    for (const s of r.skills || []) blocks.push({ id: uid('b'), type: 'skills', visible: true, data: { name: s.name || '', keywords: s.keywords || [], level: s.level || '', showLevel: false } });
    return { schemaVersion: 1, theme: 'classic', meta: { dateFormat: 'MMM YYYY' }, blocks };
  }
};

function exportJSON(kind) {
  const obj = kind === 'strict' ? JSONResume.toStrict(store.state) : store.state;
  downloadBlob(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }), kind === 'strict' ? 'resume.json' : 'easy-cv.json');
}
function importJSONFile(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const obj = JSON.parse(r.result);
      const state = obj && Array.isArray(obj.blocks) ? obj : JSONResume.fromStrict(obj);
      state.blocks = state.blocks || [];
      state.meta = state.meta || { dateFormat: 'MMM YYYY' };
      state.theme = THEMES[state.theme] ? state.theme : 'classic';
      if (!isValidHex(state.accent)) state.accent = DEFAULT_ACCENT;
      store.setState(state);
    } catch (err) { alert('导入失败：' + err.message); }
  };
  r.readAsText(file);
}
function printPDF() { window.print(); }

function openSettings() {
  $('#set-datefmt').value = (store.state.meta && store.state.meta.dateFormat) || 'MMM YYYY';
  $('#settings-modal').hidden = false;
}
function saveSettings() {
  store.setDateFormat($('#set-datefmt').value);
  $('#settings-modal').hidden = true;
  showToast('设置已保存');
}
function closeSettings() { $('#settings-modal').hidden = true; }
function showStorageNote() {
  const b = $('#btn-export');
  if (b && !b.dataset.noteShown) { b.dataset.noteShown = '1'; alert('注意：此浏览器不允许本地自动保存（localStorage 受限），请用「导出 JSON」手动保存。'); }
}

/* ---- Ctrl+S：保存应用 JSON 到指定文件（File System Access API） ---- */
const FSDB = 'easy_cv_fs';
function idbOpen() {
  return new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('no idb'));
    const r = indexedDB.open(FSDB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('handles');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function fsLoadHandle() {
  try {
    const db = await idbOpen();
    return await new Promise((res, rej) => {
      const tx = db.transaction('handles', 'readonly');
      const rq = tx.objectStore('handles').get('app');
      rq.onsuccess = () => res(rq.result || null);
      rq.onerror = () => rej(rq.error);
    });
  } catch (e) { return null; }
}
async function fsSaveHandle(h) {
  try {
    const db = await idbOpen();
    await new Promise((res, rej) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(h, 'app');
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch (e) { /* 忽略，保存失败就每次询问 */ }
}
let savedFileHandle = null;
async function saveJSONFile() {
  const json = JSON.stringify(store.state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  try {
    if (window.showSaveFilePicker) {
      let handle = savedFileHandle || await fsLoadHandle();
      if (!handle) {
        // 首次：让用户选一次保存位置（建议项目文件夹，可重命名为 easy-cv.json）
        handle = await window.showSaveFilePicker({
          suggestedName: 'easy-cv.json',
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
        });
        savedFileHandle = handle;
        fsSaveHandle(handle);
      }
      const w = await handle.createWritable();
      await w.write(blob);
      await w.close();
      showToast('已保存 easy-cv.json（Ctrl+S 继续自动保存到此文件）');
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return; // 用户取消选择，不打扰
    // 其它失败（无权限等）回退到普通下载
  }
  downloadBlob(blob, 'easy-cv.json');
  showToast('已导出 easy-cv.json 到浏览器下载目录');
}
