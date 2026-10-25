import Lenis from "lenis";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sections = [...document.querySelectorAll("main > section")];
const hudIndex = document.querySelector(".hud-index");
const hudName = document.querySelector(".hud-name");
const hudFill = document.querySelector(".hud-fill");

// Smooth scrolling (desktop wheel only; touch keeps native scrolling).
let lenis = null;
if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    });
  });
}

// Scroll position where each section sits centred on screen. The scene morphs between these.
let anchors = [];
function measure() {
  const vh = window.innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  // On phones the shape sits in the top of each section, so line up section tops instead of middles.
  const narrow = window.innerWidth < 800;
  anchors = sections.map((s, i) => {
    if (i === 0) return 0;
    const a = narrow && i < sections.length - 1 ? s.offsetTop : s.offsetTop + s.offsetHeight / 2 - vh / 2;
    return i === sections.length - 1 ? Math.min(a, max) : Math.min(a, max - 1);
  });
}
function morphTarget(y) {
  if (y <= anchors[0]) return 0;
  for (let i = 1; i < anchors.length; i++) {
    if (y < anchors[i]) return i - 1 + (y - anchors[i - 1]) / (anchors[i] - anchors[i - 1] || 1);
  }
  return anchors.length - 1;
}

function setHud(i) {
  hudIndex.textContent = String(i).padStart(2, "0");
  hudName.textContent = sections[i].dataset.name;
}

// Videos play only while on screen.
const videos = document.querySelectorAll(".media video");
if (reducedMotion) {
  videos.forEach((v) => { v.controls = true; });
} else if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) { target.preload = "auto"; target.play().catch(() => {}); }
      else target.pause();
    });
  }, { rootMargin: "120px 0px" });
  videos.forEach((v) => io.observe(v));
}

async function start() {
  measure();
  let scene = null;
  try {
    const test = document.createElement("canvas");
    if (!(test.getContext("webgl2") || test.getContext("webgl"))) throw new Error("no webgl");
    // The name is drawn from the display font, so wait for it before sampling.
    await Promise.race([
      document.fonts.load('800 100px "Archivo"').then(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    const { createScene } = await import("./scene.js");
    scene = createScene(document.getElementById("scene"), { reducedMotion });
  } catch (err) {
    document.documentElement.classList.add("no-webgl");
  }

  let shown = -1, last = performance.now();
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (lenis) lenis.raf(now);
    const y = window.scrollY;
    const target = morphTarget(y);
    const nearest = scene ? scene.frame(target, dt, now / 1000) : Math.round(target);
    if (nearest !== shown) { shown = nearest; setHud(nearest); }
    hudFill.style.transform = `scaleX(${Math.min(target / (sections.length - 1), 1)})`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { measure(); scene && scene.resize(); }, 120);
  });
  window.addEventListener("load", measure);
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(document.body);
}

start();
