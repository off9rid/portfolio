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

function buildShapes(N) {
  const name = fromCanvas(N, 1600, 300, (g, w, h) => {
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `800 ${h * 0.78}px Archivo, "Arial Black", sans-serif`;
    if ("fontStretch" in g) g.fontStretch = "expanded";
    g.fillText("AMIRALI", w / 2, h / 2);
  }, { size: 6, fitWidth: true, depth: 0.18 });

  const hand = fromCanvas(N, 520, 520, (g, w, h) => {
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `${h * 0.86}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    g.fillText("✋", w / 2, h / 2 + h * 0.04);
  }, { size: 3.7, depth: 0.22 });

  return [
    name || sphere(N),
    sphere(N),
    voiceRing(N),
    hand || sphere(N, 1.5),
    clapWave(N),
    coin(N),
    hudRings(N),
    galaxy(N),
  ];
}

// Per-shape look: two colours (body, sparkle) and how much it sways.
const LOOKS = [
  { a: "#3be8ff", b: "#ffb22e", sway: 0.12 },
  { a: "#3be8ff", b: "#ffb22e", sway: 1.0 },
  { a: "#ffb22e", b: "#fff1d6", sway: 0.45 },
  { a: "#3be8ff", b: "#e9fdff", sway: 0.3 },
  { a: "#e9fdff", b: "#3be8ff", sway: 0.35 },
  { a: "#e9b949", b: "#4fd18b", sway: 0.8 },
  { a: "#3be8ff", b: "#ffb22e", sway: 0.5 },
  { a: "#3be8ff", b: "#ffb22e", sway: 0.6 },
];

const VERT = /* glsl */ `
  attribute float aRand;
  uniform float uSize, uPR, uTime, uCalm;
  varying float vRand, vFade;
  void main() {
    vec3 p = position;
    float w = uTime * 0.9 + aRand * 60.0;
    p += (1.0 - uCalm) * 0.025 * vec3(sin(w), cos(w * 1.3), sin(w * 0.7));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPR * (0.55 + aRand * 0.9) * (6.0 / -mv.z);
    vRand = aRand;
    vFade = clamp((-mv.z - 1.5) / 3.0, 0.35, 1.0);
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uColA, uColB;
  uniform float uAlpha;
  varying float vRand, vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = vRand > 0.93 ? uColB : uColA;
    gl_FragColor = vec4(col, a * uAlpha * vFade);
  }`;

export function createScene(canvas, { reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const N = small ? 7000 : 14000;
  const shapes = buildShapes(N);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(shapes[0]);
  const rand = new Float32Array(N);
  const scatter = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    rand[i] = R();
    scatter[i * 3] = gauss() * 1.4; scatter[i * 3 + 1] = gauss() * 1.4; scatter[i * 3 + 2] = gauss() * 1.4;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));

  const uniforms = {
    uSize: { value: small ? 2.6 : 2.3 }, uPR: { value: 1 }, uTime: { value: 0 },
    uCalm: { value: reducedMotion ? 1 : 0 }, uAlpha: { value: 0.9 },
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
    uniforms: { ...uniforms, uAlpha: { value: 0.45 }, uColA: { value: new THREE.Color("#5f8a9c") }, uColB: { value: new THREE.Color("#3be8ff") } },
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
      // Short laptop screens: the headline fills more of the height, so lift and shrink the name.
      wide
        ? (h < 780 ? { x: 0, y: viewH * 0.3, s: Math.min(0.8, (viewW * 0.56) / 6) } : { x: 0, y: viewH * 0.17, s: Math.min(1, (viewW * 0.72) / 6) })
        : { x: 0, y: viewH * 0.22, s: (viewW * 0.86) / 6 },
      side, side, side, side, side, side,
      { x: 0, y: -viewH * (wide ? 0.34 : 0.3), s: wide ? 1.2 : obj * 1.2 },
    ];
  }

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const colA = new THREE.Color(), colB = new THREE.Color();
  const tmpA = new THREE.Color(), tmpB = new THREE.Color();
  let morph = 0, shown = -1, lastBlend = -1;
  const smooth = (t) => t * t * (3 - 2 * t);

  function frame(target, dt, time) {
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    morph += (target - morph) * k;
    const m = Math.min(Math.max(morph, 0), shapes.length - 1);
    const i = Math.min(Math.floor(m), shapes.length - 2);
    // Hold each shape near its section, morph in the middle stretch between sections.
    const t = smooth(Math.min(Math.max((m - i - 0.2) / 0.6, 0), 1));
    const burst = Math.sin(Math.PI * t) * (reducedMotion ? 0.3 : 1);

    const blendKey = i * 10 + t;
    if (blendKey !== lastBlend) {
      const A = shapes[i], B = shapes[i + 1];
      for (let j = 0; j < pos.length; j++) pos[j] = A[j] + (B[j] - A[j]) * t + scatter[j] * burst;
      geo.attributes.position.needsUpdate = true;
      lastBlend = blendKey;
    }

    const la = layouts[i], lb = layouts[i + 1];
    group.position.set(la.x + (lb.x - la.x) * t, la.y + (lb.y - la.y) * t, 0);
    group.scale.setScalar(la.s + (lb.s - la.s) * t);

    const look = { a: LOOKS[i], b: LOOKS[i + 1] };
    colA.copy(tmpA.set(look.a.a)).lerp(tmpB.set(look.b.a), t);
    colB.copy(tmpA.set(look.a.b)).lerp(tmpB.set(look.b.b), t);
    uniforms.uColA.value.copy(colA);
    uniforms.uColB.value.copy(colB);

    const sway = look.a.sway + (look.b.sway - look.a.sway) * t;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    const drift = reducedMotion ? 0 : Math.sin(time * 0.3) * 0.6 * sway;
    group.rotation.set(mouse.y * 0.18, drift + mouse.x * 0.3, 0);
    dust.rotation.y = reducedMotion ? 0 : time * 0.01;

    uniforms.uTime.value = time;
    renderer.render(scene, camera);

    const nearest = Math.round(m);
    if (nearest !== shown) shown = nearest;
    return nearest;
  }

  layout();
  return { frame, resize: layout, count: shapes.length };
}
