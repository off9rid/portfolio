// One particle cloud that morphs between shapes as the page scrolls.
// Shapes are point clouds of the same length N, generated once; each frame blends two of them.
import * as THREE from "three";

const TAU = Math.PI * 2;

// Seeded random so every visit gets the same shapes.
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(1804);
const gauss = () => (R() + R() + R() - 1.5) / 1.5;

function rotate(arr, rx, ry) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
  for (let i = 0; i < arr.length; i += 3) {
    let x = arr[i], y = arr[i + 1], z = arr[i + 2];
    const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
    arr[i] = x * cy + z1 * sy; arr[i + 1] = y1; arr[i + 2] = -x * sy + z1 * cy;
  }
  return arr;
}

// Draw something on a 2D canvas, then scatter N points over its filled pixels.
// The result is centred and scaled so its height (or width, if `fitWidth`) equals `size`.
function fromCanvas(N, w, h, draw, { size, fitWidth = false, depth = 0.25 }) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  draw(g, w, h);
  const data = g.getImageData(0, 0, w, h).data;
  const px = [];
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (data[(y * w + x) * 4 + 3] > 140) {
        px.push(x, y);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (px.length < 400) return null;
  const k = size / (fitWidth ? maxX - minX : maxY - minY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const j = Math.floor(R() * (px.length / 2)) * 2;
    out[i * 3] = (px[j] + R() * 2 - cx) * k;
    out[i * 3 + 1] = -(px[j + 1] + R() * 2 - cy) * k;
    out[i * 3 + 2] = gauss() * depth;
  }
  return out;
}

function sphere(N, r = 1.7) {
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const shell = R() < 0.82;
    const y = 1 - (2 * (i + 0.5)) / N;
    const rad = Math.sqrt(1 - y * y), th = i * 2.399963;
    const rr = shell ? r * (1 + gauss() * 0.025) : r * Math.cbrt(R()) * 0.9;
    out[i * 3] = Math.cos(th) * rad * rr;
    out[i * 3 + 1] = y * rr;
    out[i * 3 + 2] = Math.sin(th) * rad * rr;
  }
  return out;
}

// Friday: a voice orb with a sound ring around it.
function voiceRing(N) {
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const p = R();
    let x, y, z;
    if (p < 0.55) {
      const a = R() * TAU;
      const wave = 0.22 * Math.sin(a * 7) * Math.sin(a * 3 + 1) + gauss() * 0.04;
      const r = 1.75 + wave;
      x = Math.cos(a) * r; y = Math.sin(a) * r; z = gauss() * 0.08;
    } else if (p < 0.85) {
      const u = R() * 2 - 1, a = R() * TAU, r = 0.62 * Math.cbrt(R());
      const s = Math.sqrt(1 - u * u);
      x = s * Math.cos(a) * r; y = u * r; z = s * Math.sin(a) * r;
    } else {
      const a = R() * TAU, r = 2.25 + gauss() * 0.03;
      x = Math.cos(a) * r; y = Math.sin(a) * r; z = gauss() * 0.05;
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return rotate(out, -0.35, 0.25);
}

// Clap: a waveform with two sharp spikes.
function clapWave(N) {
  const out = new Float32Array(N * 3);
  const bars = 72, span = 5.2;
  for (let i = 0; i < N; i++) {
    const b = Math.floor(R() * bars);
    const x = -span / 2 + (b + 0.5) * (span / bars);
    const env = 0.1 + 0.18 * Math.abs(Math.sin(x * 7.3)) * Math.exp(-x * x * 0.4)
      + 1.55 * Math.exp(-(((x + 0.5) / 0.13) ** 2)) + 1.35 * Math.exp(-(((x - 0.5) / 0.13) ** 2));
    out[i * 3] = x + (R() - 0.5) * 0.035;
    out[i * 3 + 1] = (R() * 2 - 1) * env;
    out[i * 3 + 2] = (R() - 0.5) * 0.25;
  }
  return rotate(out, 0.15, -0.35);
}

// FinLit: a coin with a raised dollar sign.
function coin(N) {
  const out = new Float32Array(N * 3);
  const r = 1.6, t = 0.13;
  const dollar = fromCanvas(Math.floor(N * 0.22), 256, 256, (g, w, h) => {
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `800 ${h * 0.86}px Archivo, "Arial Black", sans-serif`;
    g.fillText("$", w / 2, h / 2);
  }, { size: 1.9, depth: 0.02 });
  let i = 0;
  if (dollar) {
    for (; i < dollar.length / 3; i++) {
      out[i * 3] = dollar[i * 3]; out[i * 3 + 1] = dollar[i * 3 + 1]; out[i * 3 + 2] = t + 0.07 + dollar[i * 3 + 2];
    }
  }
  for (; i < N; i++) {
    const p = R(), a = R() * TAU;
    if (p < 0.62) {
      const rr = r * Math.sqrt(R());
      const ridge = rr > r * 0.86 ? 0.04 : 0;
      out[i * 3] = Math.cos(a) * rr; out[i * 3 + 1] = Math.sin(a) * rr;
      out[i * 3 + 2] = (R() < 0.5 ? t + ridge : -t - ridge);
    } else {
      out[i * 3] = Math.cos(a) * r; out[i * 3 + 1] = Math.sin(a) * r;
      out[i * 3 + 2] = (R() * 2 - 1) * t;
    }
  }
  return rotate(out, 0.3, -0.55);
}

// Cortex: HUD rings around a bright core.
function hudRings(N) {
  const out = new Float32Array(N * 3);
  const rings = [
    { r: 0.62, dash: 0, tilt: 0 }, { r: 1.0, dash: 18, tilt: 0 },
    { r: 1.38, dash: 0, tilt: 0 }, { r: 1.78, dash: 9, tilt: 0 }, { r: 2.2, dash: 40, tilt: 0 },
  ];
  for (let i = 0; i < N; i++) {
    const p = R();
    if (p < 0.14) {
      const u = R() * 2 - 1, a = R() * TAU, rr = 0.3 * Math.cbrt(R()), s = Math.sqrt(1 - u * u);
      out[i * 3] = s * Math.cos(a) * rr; out[i * 3 + 1] = u * rr; out[i * 3 + 2] = s * Math.sin(a) * rr;
      continue;
    }
    const ring = rings[Math.floor(R() * rings.length)];
    let a = R() * TAU;
    if (ring.dash) {
      while (((a / TAU) * ring.dash) % 1 > 0.62) a = R() * TAU;
    }
    const rr = ring.r + gauss() * 0.025;
    out[i * 3] = Math.cos(a) * rr; out[i * 3 + 1] = Math.sin(a) * rr; out[i * 3 + 2] = gauss() * 0.03;
  }
  return rotate(out, -1.05, 0.2);
}

// Contact: a three-armed galaxy.
function galaxy(N) {
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const arm = i % 3, r = Math.pow(R(), 0.7) * 2.6;
    const a = arm * (TAU / 3) + r * 2.1 + gauss() * (0.35 / (r + 0.4));
    out[i * 3] = Math.cos(a) * r + gauss() * 0.08;
    out[i * 3 + 1] = gauss() * 0.12 * (1.2 - r / 2.6);
    out[i * 3 + 2] = Math.sin(a) * r + gauss() * 0.08;
  }
  return rotate(out, 0.55, 0);
}

// A photo (transparent background) turned into a particle hologram: denser where it is bright or has detail.
function fromImage(N, img, size) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h), alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
    alpha[i] = d[i * 4 + 3];
  }
  // Local contrast (pixel vs. its neighbourhood) keeps eyes, brows and hair curls readable;
  // global brightness keeps the overall light and shadow.
  const sum = new Float64Array((w + 1) * (h + 1));
  let lo = 1, hi = 0;
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      row += lum[i];
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row;
      if (alpha[i] >= 128) { if (lum[i] < lo) lo = lum[i]; if (lum[i] > hi) hi = lum[i]; }
    }
  }
  const rad = Math.round(w / 32);
  const mean = (x, y) => {
    const x0 = Math.max(0, x - rad), y0 = Math.max(0, y - rad), x1 = Math.min(w, x + rad + 1), y1 = Math.min(h, y + rad + 1);
    return (sum[y1 * (w + 1) + x1] - sum[y0 * (w + 1) + x1] - sum[y1 * (w + 1) + x0] + sum[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0));
  };
  const cand = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (alpha[i] < 128) continue;
      const global = (lum[i] - lo) / (hi - lo || 1);
      const local = Math.min(1, Math.max(0, 0.5 + (lum[i] - mean(x, y)) * 3.2));
      const v = 0.5 * global + 0.5 * local;
      const rim = alpha[i - 2] < 128 || alpha[i + 2] < 128 || alpha[i - 2 * w] < 128 || alpha[i + 2 * w] < 128 ? 0.55 : 0;
      const fade = Math.min(1, (h - y) / (h * 0.16)); // soften the cut at the bottom of the photo
      const body = y > h * 0.52 ? 0.4 : 1; // spend the particles on the face and hair, not the sweater
      cand.push(i, Math.min(1, 0.02 + v ** 2.4 * 1.15 + rim) * fade * body);
    }
  }
  if (cand.length < 4000) return null;
  const out = new Float32Array(N * 3), k = size / h;
  let n = 0, guard = 0;
  while (n < N && guard++ < N * 80) {
    const j = Math.floor(R() * (cand.length / 2)) * 2;
    if (R() > cand[j + 1]) continue;
    const i = cand[j], x = i % w, y = (i / w) | 0;
    out[n * 3] = (x + R() - w / 2) * k;
    out[n * 3 + 1] = -(y + R() - h / 2) * k;
    out[n * 3 + 2] = (lum[i] - 0.45) * 0.55 + gauss() * 0.03;
    n++;
  }
  for (; n < N; n++) out.copyWithin(n * 3, Math.floor(R() * n) * 3, Math.floor(R() * n) * 3 + 3);
  return out;
}

// NGN Hacks: a wireframe globe with arcs between cities.
function globe(N) {
  const out = new Float32Array(N * 3), r = 1.6;
  const unit = (lat, lon) => [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
  const cities = Array.from({ length: 18 }, () => unit(Math.asin(R() * 1.6 - 0.8), R() * TAU));
  const arcs = Array.from({ length: 18 }, () => [cities[Math.floor(R() * 18)], cities[Math.floor(R() * 18)]]);
  for (let i = 0; i < N; i++) {
    const p = R();
    let v, rr = r;
    if (p < 0.5) {
      v = R() < 0.5
        ? unit((Math.floor(R() * 7) - 3) * (Math.PI / 9), R() * TAU)
        : unit((R() - 0.5) * Math.PI, Math.floor(R() * 12) * (TAU / 12));
    } else if (p < 0.82) {
      const [a, b] = arcs[Math.floor(R() * arcs.length)], t = R();
      v = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      const len = Math.hypot(v[0], v[1], v[2]) || 1;
      v = v.map((q) => q / len);
      rr = r * (1 + 0.32 * Math.sin(Math.PI * t));
    } else {
      const c = cities[Math.floor(R() * cities.length)];
      v = [c[0] + gauss() * 0.03, c[1] + gauss() * 0.03, c[2] + gauss() * 0.03];
      rr = r * 1.01;
    }
    out[i * 3] = v[0] * rr; out[i * 3 + 1] = v[1] * rr; out[i * 3 + 2] = v[2] * rr;
  }
  return rotate(out, 0.35, 0);
}

// Experience: a double helix.
function helix(N) {
  const out = new Float32Array(N * 3), turns = 2.2, H = 4.2, r = 0.85, rungs = 22;
  for (let i = 0; i < N; i++) {
    let x, y, z;
    if (R() < 0.7) {
      const t = R(), a = t * TAU * turns + (R() < 0.5 ? 0 : Math.PI);
      x = Math.cos(a) * r + gauss() * 0.03; z = Math.sin(a) * r + gauss() * 0.03; y = (t - 0.5) * H;
    } else {
      const t = (Math.floor(R() * rungs) + 0.5) / rungs, a = t * TAU * turns, u = R() * 2 - 1;
      x = Math.cos(a) * r * u; z = Math.sin(a) * r * u; y = (t - 0.5) * H + gauss() * 0.01;
    }
    // lean it slightly to the side
    const tz = 0.32;
    out[i * 3] = x * Math.cos(tz) - y * Math.sin(tz);
    out[i * 3 + 1] = x * Math.sin(tz) + y * Math.cos(tz);
    out[i * 3 + 2] = z;
  }
  return rotate(out, 0.15, 0);
}

function textShape(N, text, size, font) {
  return fromCanvas(N, 1400, 320, (g, w, h) => {
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = font(h);
    if ("fontStretch" in g) g.fontStretch = "expanded";
    g.fillText(text, w / 2, h / 2);
  }, { size, fitWidth: true, depth: 0.2 });
}

// Press: a front page (masthead, headline, photo, columns) curled in 3D, with a second paper behind it.
function newspaper(N) {
  const page = (g, w, h, front) => {
    g.fillStyle = "#fff"; g.strokeStyle = "#fff";
    g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    if (!front) {
      for (let y = 120; y < h - 40; y += 34) g.fillRect(40, y, w - 80, 6);
      return;
    }
    g.textAlign = "center"; g.textBaseline = "top";
    g.font = `900 ${w * 0.15}px Georgia, "Times New Roman", serif`;
    g.fillText("THE NEWS", w / 2, 34);
    g.fillRect(36, 158, w - 72, 6); g.fillRect(36, 172, w - 72, 2);
    g.fillRect(36, 200, w - 72, 34); g.fillRect(36, 246, (w - 72) * 0.72, 34);
    // photo block, hatched so it reads as an image
    const px = 36, py = 304, pw = (w - 72) * 0.58, ph = 250;
    g.lineWidth = 5; g.strokeRect(px, py, pw, ph);
    g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip(); g.lineWidth = 3;
    for (let k = 0; k < pw + ph; k += 18) { g.beginPath(); g.moveTo(px + k, py); g.lineTo(px + k - ph, py + ph); g.stroke(); }
    g.restore();
    // columns of text lines
    const colW = (w - 72 - 2 * 24) / 3;
    for (let c = 0; c < 3; c++) {
      const x0 = 36 + c * (colW + 24);
      const yStart = c < 2 ? py + ph + 28 : py;
      for (let y = yStart; y < h - 40; y += 22) g.fillRect(x0, y, colW * ((y + c * 13) % 5 ? 1 : 0.7), 7);
    }
  };
  const nf = Math.floor(N * 0.74);
  const front = fromCanvas(nf, 700, 900, (g, w, h) => page(g, w, h, true), { size: 3.3, depth: 0.015 });
  const back = fromCanvas(N - nf, 700, 900, (g, w, h) => page(g, w, h, false), { size: 3.3, depth: 0.015 });
  if (!front || !back) return null;
  const out = new Float32Array(N * 3);
  out.set(front, 0);
  const c = Math.cos(0.12), sn = Math.sin(0.12);
  for (let i = 0; i < N - nf; i++) {
    const x = back[i * 3], y = back[i * 3 + 1];
    out[(nf + i) * 3] = x * c - y * sn + 0.42;
    out[(nf + i) * 3 + 1] = x * sn + y * c + 0.18;
    out[(nf + i) * 3 + 2] = back[i * 3 + 2] - 0.4;
  }
  // curl the pages like paper
  for (let i = 0; i < N; i++) {
    const x = out[i * 3];
    out[i * 3 + 2] += 0.16 * x * x - 0.25 * Math.max(0, x - 0.9) ** 2;
  }
  return rotate(out, 0.12, -0.42);
}

async function buildShapes(N) {
  let portrait = null;
  try {
    const img = new Image();
    img.src = "media/me-cutout.png";
    await img.decode();
    portrait = fromImage(N, img, 3.8);
  } catch (e) { /* fall back to a sphere */ }

  const hand = fromCanvas(N, 520, 520, (g, w, h) => {
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `${h * 0.86}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    g.fillText("✋", w / 2, h / 2 + h * 0.04);
  }, { size: 3.7, depth: 0.22 });

  return [
    portrait || sphere(N),
    textShape(N, "500K+", 4.4, (h) => `800 ${h * 0.8}px Archivo, "Arial Black", sans-serif`) || sphere(N),
    globe(N),
    coin(N),
    newspaper(N) || sphere(N),
    voiceRing(N),
    hand || sphere(N, 1.5),
    clapWave(N),
    hudRings(N),
    helix(N),
    galaxy(N),
  ];
}

// Per-shape look: body colour, sparkle colour, sway, hologram scanlines.
const LOOKS = [
  { a: "#3be8ff", b: "#ffb22e", sway: 0.32, scan: 0.6, size: 1.25 },
  { a: "#3be8ff", b: "#ffb22e", sway: 0.22, scan: 0.25 },
  { a: "#3be8ff", b: "#ffb22e", sway: 1.0, scan: 0.25 },
  { a: "#e9b949", b: "#4fd18b", sway: 0.8, scan: 0.2 },
  { a: "#f2ead8", b: "#ffb22e", sway: 0.45, scan: 0.25 },
  { a: "#ffb22e", b: "#fff1d6", sway: 0.45, scan: 0.2 },
  { a: "#3be8ff", b: "#e9fdff", sway: 0.3, scan: 0.5 },
  { a: "#e9fdff", b: "#3be8ff", sway: 0.35, scan: 0.2 },
  { a: "#3be8ff", b: "#ffb22e", sway: 0.5, scan: 0.6 },
  { a: "#3be8ff", b: "#ffb22e", sway: 0.6, scan: 0.25 },
  { a: "#3be8ff", b: "#ffb22e", sway: 0.6, scan: 0.2 },
];

const VERT = /* glsl */ `
  attribute float aRand;
  uniform float uSize, uPR, uTime, uCalm, uPush, uSizeK;
  uniform vec3 uPointer;
  varying float vRand, vFade;
  void main() {
    vec3 p = position;
    float w = uTime * 0.9 + aRand * 60.0;
    p += (1.0 - uCalm) * 0.025 * vec3(sin(w), cos(w * 1.3), sin(w * 0.7));
    // Particles part around the cursor.
    vec2 d = p.xy - uPointer.xy;
    float f = uPush * smoothstep(0.6, 0.0, length(d));
    p.xy += normalize(d + 0.0001) * f * 0.38;
    p.z += f * 0.45;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uSizeK * uPR * (0.55 + aRand * 0.9) * (6.0 / -mv.z) * (1.0 + f * 0.8);
    vRand = aRand;
    vFade = clamp((-mv.z - 1.5) / 3.0, 0.35, 1.0);
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uColA, uColB;
  uniform float uAlpha, uScan, uTime;
  varying float vRand, vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = vRand > 0.93 ? uColB : uColA;
    float scan = 1.0 - uScan * 0.45 * (0.5 + 0.5 * sin(gl_FragCoord.y * 0.6 - uTime * 7.0));
    gl_FragColor = vec4(col, a * uAlpha * vFade * scan);
  }`;

export async function createScene(canvas, { reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const N = small ? 9000 : 22000;
  const shapes = await buildShapes(N);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const rand = new Float32Array(N);
  const scatter = new Float32Array(N * 3);
  const start = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    rand[i] = R();
    scatter[i * 3] = gauss() * 1.4; scatter[i * 3 + 1] = gauss() * 1.4; scatter[i * 3 + 2] = gauss() * 1.4;
    start[i * 3] = gauss() * 9; start[i * 3 + 1] = gauss() * 6; start[i * 3 + 2] = gauss() * 4 - 1;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));

  const uniforms = {
    uSize: { value: small ? 2.4 : 2.1 }, uPR: { value: 1 }, uTime: { value: 0 },
    uCalm: { value: reducedMotion ? 1 : 0 }, uAlpha: { value: 0.9 }, uScan: { value: 1 },
    uPush: { value: 0 }, uSizeK: { value: 1 }, uPointer: { value: new THREE.Vector3(99, 99, 0) },
    uColA: { value: new THREE.Color(LOOKS[0].a) }, uColB: { value: new THREE.Color(LOOKS[0].b) },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const group = new THREE.Group();
  group.add(new THREE.Points(geo, mat));
  scene.add(group);

  // Faint dust behind everything for depth.
  const dustN = small ? 500 : 1100;
  const dustPos = new Float32Array(dustN * 3), dustRand = new Float32Array(dustN);
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = (R() - 0.5) * 22; dustPos[i * 3 + 1] = (R() - 0.5) * 14; dustPos[i * 3 + 2] = -2 - R() * 10;
    dustRand[i] = R() * 0.5;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("aRand", new THREE.BufferAttribute(dustRand, 1));
  const dustMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      ...uniforms, uAlpha: { value: 0.45 }, uScan: { value: 0 }, uPush: { value: 0 }, uSizeK: { value: 1 },
      uColA: { value: new THREE.Color("#5f8a9c") }, uColB: { value: new THREE.Color("#3be8ff") },
    },
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // Where each shape sits on screen, recomputed on resize.
  let layouts = [];
  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uPR.value = renderer.getPixelRatio();
    const viewH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    const viewW = viewH * camera.aspect;
    const wide = w >= 800;
    const obj = wide ? Math.min(1, viewH / 5.4) : Math.min(viewW / 4.9, 0.72);
    const side = wide ? { x: viewW * 0.24, y: 0, s: obj } : { x: 0, y: viewH * 0.24, s: obj };
    layouts = [
      wide ? { x: viewW * 0.22, y: -viewH * 0.02, s: Math.min(1.2, viewH / 4.2, (viewW * 0.4) / 3.8) }
           : { x: 0, y: viewH * 0.24, s: Math.min((viewW * 0.86) / 3.8, (viewH * 0.44) / 3.8) },
      wide ? { x: viewW * 0.24, y: 0, s: Math.min(1, (viewW * 0.42) / 4.4) } : { x: 0, y: viewH * 0.26, s: (viewW * 0.8) / 4.4 },
      side, side, side, side, side, side, side,
      wide && w >= 1100 ? { ...side, x: viewW * 0.36, s: side.s * 0.85 } : side,
      { x: 0, y: -viewH * (wide ? 0.34 : 0.3), s: wide ? 1.2 : obj * 1.2 },
    ];
  }

  // Cursor in normalised screen coords; projected onto the shape's plane each frame.
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, active: false };
  window.addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    mouse.active = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { mouse.active = false; });
  window.addEventListener("blur", () => { mouse.active = false; });
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3(), ndc = new THREE.Vector2();

  const colA = new THREE.Color(), colB = new THREE.Color();
  const tmpA = new THREE.Color(), tmpB = new THREE.Color();
  let morph = 0, lastBlend = -1, intro = reducedMotion ? 1 : 0;
  const smooth = (t) => t * t * (3 - 2 * t);

  function frame(target, dt, time) {
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    morph += (target - morph) * k;
    const m = Math.min(Math.max(morph, 0), shapes.length - 1);
    const i = Math.min(Math.floor(m), shapes.length - 2);
    // Hold each shape near its section, morph in the middle stretch between sections.
    const t = smooth(Math.min(Math.max((m - i - 0.2) / 0.6, 0), 1));
    const burst = Math.sin(Math.PI * t) * (reducedMotion ? 0.3 : 1);

    // On load the particles fly in from a wide cloud and assemble.
    const assembling = intro < 1;
    if (assembling) intro = Math.min(1, intro + dt / 2.6);
    const e = 1 - Math.pow(1 - intro, 3);

    const blendKey = i * 10 + t;
    if (blendKey !== lastBlend || assembling) {
      const A = shapes[i], B = shapes[i + 1];
      for (let j = 0; j < pos.length; j++) {
        const v = A[j] + (B[j] - A[j]) * t + scatter[j] * burst;
        pos[j] = assembling ? start[j] + (v - start[j]) * e : v;
      }
      geo.attributes.position.needsUpdate = true;
      lastBlend = blendKey;
    }

    const la = layouts[i], lb = layouts[i + 1];
    group.position.set(la.x + (lb.x - la.x) * t, la.y + (lb.y - la.y) * t, 0);
    group.scale.setScalar(la.s + (lb.s - la.s) * t);

    const a = LOOKS[i], b = LOOKS[i + 1];
    colA.copy(tmpA.set(a.a)).lerp(tmpB.set(b.a), t);
    colB.copy(tmpA.set(a.b)).lerp(tmpB.set(b.b), t);
    uniforms.uColA.value.copy(colA);
    uniforms.uColB.value.copy(colB);
    uniforms.uScan.value = reducedMotion ? 0 : a.scan + (b.scan - a.scan) * t;
    uniforms.uSizeK.value = (a.size || 1) + ((b.size || 1) - (a.size || 1)) * t;

    const sway = a.sway + (b.sway - a.sway) * t;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    const drift = reducedMotion ? 0 : Math.sin(time * 0.3) * 0.6 * sway;
    group.rotation.set(mouse.y * 0.18, drift + mouse.x * 0.3, 0);
    dust.rotation.y = reducedMotion ? 0 : time * 0.01;

    // Push particles away from the cursor (in the group's own space).
    group.updateMatrixWorld();
    ndc.set(mouse.tx, -mouse.ty);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) uniforms.uPointer.value.copy(group.worldToLocal(hit));
    const pushTarget = mouse.active && !reducedMotion ? 1 : 0;
    uniforms.uPush.value += (pushTarget - uniforms.uPush.value) * (1 - Math.exp(-dt * 6));

    uniforms.uTime.value = time;
    renderer.render(scene, camera);
    return Math.round(m);
  }

  layout();
  return { frame, resize: layout, count: shapes.length };
}
