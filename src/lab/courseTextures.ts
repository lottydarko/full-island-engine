import * as THREE from 'three';

export interface CourseTextureBundle {
  concreteMap: THREE.CanvasTexture;
  concreteRoughness: THREE.CanvasTexture;
  concreteNormal: THREE.CanvasTexture;
  brickMap: THREE.CanvasTexture;
  brickRoughness: THREE.CanvasTexture;
  brickNormal: THREE.CanvasTexture;
  glassMap: THREE.CanvasTexture;
  steelMap: THREE.CanvasTexture;
  steelRoughness: THREE.CanvasTexture;
  climbMap: THREE.CanvasTexture;
  climbRoughness: THREE.CanvasTexture;
  climbNormal: THREE.CanvasTexture;
  mountStripeMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function heightsToNormal(heights: Float32Array, size: number, strength: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (heights[y * size + xp] - heights[y * size + xm]) * strength;
      const dy = (heights[yp * size + x] - heights[ym * size + x]) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      d[i] = Math.round((nx * 0.5 + 0.5) * 255);
      d[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      d[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function wrapTex(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  maxAnisotropy: number,
  rx = 1,
  ry = 1,
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  if (isColor) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, Math.max(1, maxAnisotropy || 1));
  t.needsUpdate = true;
  return t;
}

export function createCourseTextures(maxAnisotropy: number): CourseTextureBundle {
  const size = 256;
  const rng = mulberry32(20261127);

  // 1. Poured Soviet Architectural Concrete Panels
  const [cConM, ctxConM] = makeCanvas(size, size);
  const [cConR, ctxConR] = makeCanvas(size, size);
  const conH = new Float32Array(size * size);

  ctxConM.fillStyle = '#5b636d';
  ctxConM.fillRect(0, 0, size, size);
  ctxConR.fillStyle = 'rgb(198,198,198)';
  ctxConR.fillRect(0, 0, size, size);

  for (let i = 0; i < 1200; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1 + rng() * 6;
    const v = 76 + Math.floor(rng() * 34);
    ctxConM.fillStyle = `rgba(${v},${v + 4},${v + 9},0.28)`;
    ctxConM.beginPath();
    ctxConM.arc(x, y, r, 0, Math.PI * 2);
    ctxConM.fill();
  }

  // Formwork panel seams + tie-rod holes
  ctxConM.strokeStyle = 'rgba(32, 36, 42, 0.72)';
  ctxConM.lineWidth = 2;
  for (const s of [0, 128]) {
    ctxConM.beginPath();
    ctxConM.moveTo(s, 0);
    ctxConM.lineTo(s, size);
    ctxConM.stroke();
    ctxConM.beginPath();
    ctxConM.moveTo(0, s);
    ctxConM.lineTo(size, s);
    ctxConM.stroke();
  }
  for (const px of [32, 96, 160, 224]) {
    for (const py of [32, 96, 160, 224]) {
      ctxConM.fillStyle = '#2b3036';
      ctxConM.beginPath();
      ctxConM.arc(px, py, 2.8, 0, Math.PI * 2);
      ctxConM.fill();
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const seam = x % 128 < 2 || y % 128 < 2 ? -0.45 : 0;
      conH[y * size + x] = seam + (rng() - 0.5) * 0.25;
    }
  }

  const concreteMap = wrapTex(cConM, true, maxAnisotropy, 3, 2);
  const concreteRoughness = wrapTex(cConR, false, maxAnisotropy, 3, 2);
  const concreteNormal = wrapTex(heightsToNormal(conH, size, 1.8), false, maxAnisotropy, 3, 2);

  // 2. Weathered Red-Terracotta Brick Masonry
  const [cBrkM, ctxBrkM] = makeCanvas(size, size);
  const [cBrkR, ctxBrkR] = makeCanvas(size, size);
  const brkH = new Float32Array(size * size);

  ctxBrkM.fillStyle = '#736c66'; // mortar
  ctxBrkM.fillRect(0, 0, size, size);
  ctxBrkR.fillStyle = 'rgb(218,218,218)';
  ctxBrkR.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 4;
  const bh = size / rows;
  const bw = size / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * bw + offset;
      const y = r * bh;
      const red = 112 + Math.floor(rng() * 38);
      const grn = 54 + Math.floor(rng() * 20);
      const blu = 42 + Math.floor(rng() * 14);
      ctxBrkM.fillStyle = `rgb(${red},${grn},${blu})`;
      ctxBrkM.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      const rVal = 165 + Math.floor(rng() * 40);
      ctxBrkR.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
      ctxBrkR.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
  }

  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / bh);
    const offset = (row % 2) * (bw * 0.5);
    const inRowY = y % bh;
    for (let x = 0; x < size; x++) {
      const inColX = (x + offset) % bw;
      const isMortar = inRowY < 2 || inRowY > bh - 2 || inColX < 2 || inColX > bw - 2;
      brkH[y * size + x] = (isMortar ? -0.55 : 0.2) + (rng() - 0.5) * 0.2;
    }
  }

  const brickMap = wrapTex(cBrkM, true, maxAnisotropy, 4, 2);
  const brickRoughness = wrapTex(cBrkR, false, maxAnisotropy, 4, 2);
  const brickNormal = wrapTex(heightsToNormal(brkH, size, 2.2), false, maxAnisotropy, 4, 2);

  // 3. Curtain-Wall Architectural Tinted Glass Mullion Grid
  const [cGlsM, ctxGlsM] = makeCanvas(size, size);
  const gGrad = ctxGlsM.createLinearGradient(0, 0, size, size);
  gGrad.addColorStop(0, '#36586e');
  gGrad.addColorStop(0.5, '#4c758e');
  gGrad.addColorStop(1, '#2b475a');
  ctxGlsM.fillStyle = gGrad;
  ctxGlsM.fillRect(0, 0, size, size);
  // Subtle diagonal sky reflection streaks
  ctxGlsM.fillStyle = 'rgba(185, 224, 245, 0.14)';
  ctxGlsM.beginPath();
  ctxGlsM.moveTo(0, 48);
  ctxGlsM.lineTo(148, 0);
  ctxGlsM.lineTo(208, 0);
  ctxGlsM.lineTo(0, 118);
  ctxGlsM.closePath();
  ctxGlsM.fill();
  // Dark aluminum window mullions
  ctxGlsM.strokeStyle = '#18222c';
  ctxGlsM.lineWidth = 6;
  for (let i = 0; i <= size; i += 64) {
    ctxGlsM.beginPath();
    ctxGlsM.moveTo(i, 0);
    ctxGlsM.lineTo(i, size);
    ctxGlsM.stroke();
    ctxGlsM.beginPath();
    ctxGlsM.moveTo(0, i);
    ctxGlsM.lineTo(size, i);
    ctxGlsM.stroke();
  }
  const glassMap = wrapTex(cGlsM, true, maxAnisotropy, 3, 2);

  // 4. Industrial Steel Catwalk Decking
  const [cStlM, ctxStlM] = makeCanvas(size, size);
  const [cStlR, ctxStlR] = makeCanvas(size, size);
  ctxStlM.fillStyle = '#2d3540';
  ctxStlM.fillRect(0, 0, size, size);
  ctxStlR.fillStyle = 'rgb(138,138,138)';
  ctxStlR.fillRect(0, 0, size, size);
  ctxStlM.strokeStyle = '#404a57';
  ctxStlM.lineWidth = 2;
  for (let y = 0; y < size; y += 16) {
    for (let x = 0; x < size; x += 16) {
      ctxStlM.strokeRect(x + 2, y + 2, 12, 12);
    }
  }
  const steelMap = wrapTex(cStlM, true, maxAnisotropy, 4, 4);
  const steelRoughness = wrapTex(cStlR, false, maxAnisotropy, 4, 4);

  // 5. Painted Mount-Zone Chevron Stripe Texture
  const [cMs, ctxMs] = makeCanvas(256, 64);
  ctxMs.fillStyle = '#d97706';
  ctxMs.fillRect(0, 0, 256, 64);
  ctxMs.fillStyle = '#141920';
  for (let x = -64; x < 320; x += 48) {
    ctxMs.beginPath();
    ctxMs.moveTo(x, 64);
    ctxMs.lineTo(x + 24, 64);
    ctxMs.lineTo(x + 56, 0);
    ctxMs.lineTo(x + 32, 0);
    ctxMs.closePath();
    ctxMs.fill();
  }
  const mountStripeMap = wrapTex(cMs, true, maxAnisotropy, 8, 1);

  // 6. Climbable Hand-Over-Hand Grip Wall Panel Texture (ribbing + cyan/amber grip slats)
  const [cClM, ctxClM] = makeCanvas(size, size);
  const [cClR, ctxClR] = makeCanvas(size, size);
  const clH = new Float32Array(size * size);

  ctxClM.fillStyle = '#26303c';
  ctxClM.fillRect(0, 0, size, size);
  ctxClR.fillStyle = 'rgb(168,168,168)';
  ctxClR.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 32) {
    // Dark recessed handhold trough + illuminated cyan/amber grip ridge
    ctxClM.fillStyle = '#141a21';
    ctxClM.fillRect(0, y, size, 9);
    ctxClM.fillStyle = y % 64 === 0 ? '#0ea5e9' : '#38bdf8';
    ctxClM.fillRect(0, y + 9, size, 4);
    ctxClR.fillStyle = 'rgb(110,110,110)';
    ctxClR.fillRect(0, y + 8, size, 6);
  }
  for (let y = 0; y < size; y++) {
    const inSlot = y % 32;
    const h = inSlot < 9 ? -0.65 : inSlot < 14 ? 0.55 : 0;
    for (let x = 0; x < size; x++) {
      clH[y * size + x] = h + (rng() - 0.5) * 0.12;
    }
  }
  const climbMap = wrapTex(cClM, true, maxAnisotropy, 2, 3);
  const climbRoughness = wrapTex(cClR, false, maxAnisotropy, 2, 3);
  const climbNormal = wrapTex(heightsToNormal(clH, size, 2.0), false, maxAnisotropy, 2, 3);

  return {
    concreteMap,
    concreteRoughness,
    concreteNormal,
    brickMap,
    brickRoughness,
    brickNormal,
    glassMap,
    steelMap,
    steelRoughness,
    climbMap,
    climbRoughness,
    climbNormal,
    mountStripeMap,
    dispose() {
      concreteMap.dispose();
      concreteRoughness.dispose();
      concreteNormal.dispose();
      brickMap.dispose();
      brickRoughness.dispose();
      brickNormal.dispose();
      glassMap.dispose();
      steelMap.dispose();
      steelRoughness.dispose();
      climbMap.dispose();
      climbRoughness.dispose();
      climbNormal.dispose();
      mountStripeMap.dispose();
    },
  };
}
