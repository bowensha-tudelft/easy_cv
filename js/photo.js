/* Easy CV — 简历照片：data URL 校验 + canvas 缩放管线 */
'use strict';

const PHOTO_MAX_EDGE = 400;                    // 最长边像素上限（30mm 宽 ≈ 339 DPI）
const PHOTO_QUALITY = 0.85;                    // JPEG 质量
const PHOTO_MAX_BYTES = 20 * 1024 * 1024;      // 输入文件上限 20MB，避免解码爆内存
const PHOTO_MIME = /^data:image\/(png|jpeg|webp);base64,/;

/* 只放行 canvas 产出的三种 base64 图片。
   注意：这不是 XSS 防线（<img> 加载 SVG 时脚本不执行），
   作用是保持数据模型干净、避免渲染出坏图。 */
function isValidPhotoDataURL(s) {
  return typeof s === 'string' && PHOTO_MIME.test(s);
}
function sanitizePhoto(s) {
  return isValidPhotoDataURL(s) ? s : '';
}

/* ---- 解码 ---- */
function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('读取文件失败'));
    r.readAsDataURL(file);
  });
}
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('图片解码失败（格式可能不受支持）'));
    img.src = src;
  });
}

/* 统一返回 { src, width, height, close, retryable }。
   retryable 表示「已在用 createImageBitmap，失败时值得换 data URL 重试」。
   尺寸显式取 naturalWidth/naturalHeight：未挂载的 <img> 上 .width 在部分浏览器不可靠。 */
async function decodePhoto(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { src: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close(), retryable: true };
    } catch (e) { /* 回退到下面 */ }
  }
  const img = await loadImage(await readFileAsDataURL(file));
  return { src: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {}, retryable: false };
}

/* ---- 绘制：铺白底 → 等比缩到最长边 ≤400px → 导出 JPEG ---- */
function drawPhotoToDataURL(src, w, h) {
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(w, h));  // 只缩不放
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';                 // PNG 透明区转 JPEG 会变黑，先铺白
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(src, 0, 0, cw, ch);
  return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);   // canvas 被污染时抛 SecurityError
}

/* 选中的文件 → JPEG data URL。出错 throw Error(可读文案)，由调用方 showToast。 */
async function makePhotoDataURL(file) {
  if (!file) throw new Error('没有选择文件');
  if (!/^image\//.test(file.type || '')) {
    // 点名 HEIC：iPhone 默认格式，能通过 image/* 检查但 canvas 解不了
    throw new Error('不支持的图片格式（iPhone 的 HEIC 请先转成 JPG）');
  }
  if (file.size > PHOTO_MAX_BYTES) {
    throw new Error('图片太大了（上限 20MB），请先压缩再上传');
  }

  const decoded = await decodePhoto(file);
  try {
    return drawPhotoToDataURL(decoded.src, decoded.width, decoded.height);
  } catch (err) {
    // canvas 被污染（file:// 下各浏览器源处理不一致）：换 data URL 重新解码再画一次。
    // data URL 明确不污染 canvas，这是第二级回退。已在 data URL 路径上就别重试了。
    if (!decoded.retryable) throw new Error('无法处理该图片（浏览器安全限制）');
    let img;
    try { img = await loadImage(await readFileAsDataURL(file)); }
    catch (e) { throw new Error('无法处理该图片（浏览器安全限制）'); }
    try { return drawPhotoToDataURL(img, img.naturalWidth, img.naturalHeight); }
    catch (e) { throw new Error('无法处理该图片（浏览器安全限制）'); }
  } finally {
    decoded.close();
  }
}
