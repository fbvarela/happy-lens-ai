const HEIC_RE = /heic|heif/i;

function looksHeic(file) {
  return HEIC_RE.test(file.type || "") || HEIC_RE.test(file.name || "");
}

async function decodeHeic(file) {
  const { heicTo } = await import("heic-to");
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  return new File([blob], (file.name || "image").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

async function loadImage(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("decode-failed"));
      el.src = objectUrl;
    });
  } finally { URL.revokeObjectURL(objectUrl); }
}

export async function fileToDownscaledDataUrl(rawFile, maxPx = 1600, quality = 0.82) {
  let file = rawFile;
  if (looksHeic(file)) {
    try { file = await decodeHeic(file); }
    catch (e) {
      console.warn("[image-decode] HEIC decode failed", { name: rawFile.name, type: rawFile.type, size: rawFile.size, err: e?.message });
      throw new Error(`Couldn't decode HEIC. ${e?.message || "Try exporting the photo as JPEG from Photos."}`);
    }
  }

  let img;
  try { img = await loadImage(file); }
  catch {
    if (file === rawFile) {
      try {
        const decoded = await decodeHeic(rawFile);
        img = await loadImage(decoded);
        file = decoded;
      } catch (e) {
        console.warn("[image-decode] image load + heic fallback failed", { name: rawFile.name, type: rawFile.type, size: rawFile.size, err: e?.message });
        throw new Error(`Browser couldn't decode this file (${rawFile.type || "unknown type"}, ${rawFile.name || "unnamed"}). Supported: JPEG, PNG, WebP, HEIC. RAW/DNG and ProRAW aren't supported in-browser yet.`);
      }
    } else {
      throw new Error(`Browser couldn't decode the converted image (${file.type}). The HEIC source may be malformed.`);
    }
  }

  const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
