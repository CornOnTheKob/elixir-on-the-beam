/* =====================================================================
   story.js · 01 Roots
   A white page with a drop-shaped window. Scrolling grows the drop until
   the night scene behind it fills the screen (a mask reveal); then the
   camera moves across Elixir's family tree in four beats.
   Tree data is copied from the paper's Figure 1 (figures/lineage.tex).
   ===================================================================== */
(() => {
'use strict';
const { $, $$, clamp, lerp, smooth, easeInOut, seg, addScene, setNavDark, STATIC } = window.EX;
const NS = 'http://www.w3.org/2000/svg';
const stage = $('#storyStage'), track = $('#storyTrack');
const tree = $('#tree'), hero = $('#hero'), note = $('#dropNote'), cue = $('#scrollCue');
const beats = $$('.beat'), beatsBox = $('#beats'), dots = $$('#beatDots li');
const veil = $('#veil'), vRect = $('#veilRect'), vFill = $('#veilFill'), vHole = $('#veilHole'), vRing = $('#veilRing');

/* ---------------- the tree (units: the paper figure, 1000 x 430) */
const X = [130, 500, 870], Y = [80, 175, 270, 365], W = 192, H = 60;
// id, name, year, col, row, kind, stage (0 Elixir, 1 direct influences, 2 Erlang story, 3 the rest)
const NODES = [
  ['lambda', 'λ-calculus', '1936 · Church', 0, 0, 'idea', 3],
  ['smalltalk', 'Smalltalk', '1972 · Kay', 0, 1, 'idea', 3],
  ['prolog', 'Prolog', '1972 · Colmerauer', 0, 2, 'idea', 3],
  ['actors', 'Actor model', '1973 · Hewitt', 0, 3, 'idea', 3],
  ['lisp', 'Lisp', '1958 · McCarthy', 1, 0, 'lang', 3],
  ['ruby', 'Ruby', '1995 · Matsumoto', 1, 1, 'lang', 1],
  ['erlang', 'Erlang', '1986 · Ericsson', 1, 2, 'lang', 1],
  ['clojure', 'Clojure', '2007 · JVM', 2, 0, 'lang', 1],
  ['elixir', 'Elixir', '2011 · Valim', 2, 2, 'star', 0],
  ['gleam', 'Gleam', 'v1.0 2024 · Pilfold', 2, 3, 'lang', 2],
];
// key, path, kind, label, lx, ly, anchor, stage
const EDGES = [
  ['e-lambda', 'M226 80 L398 80', 'inf', 'functions as values', 312, 70, 'middle', 3],
  ['e-lisp', 'M596 80 L768 80', 'inf', 'a Lisp dialect', 682, 70, 'middle', 3],
  ['e-small', 'M226 175 L398 175', 'inf', 'objects & messages', 312, 165, 'middle', 3],
  ['e-prolog', 'M226 270 L398 270', 'inf', 'first built in Prolog', 312, 260, 'middle', 3],
  ['e-actors', 'M226 356 L402 298', 'par', 'similar idea, not a source', 336, 366, 'middle', 3],
  ['e-erlang', 'M596 270 L766 270', 'direct', 'BEAM, OTP, “let it crash”', 681, 257, 'middle', 1],
  ['e-ruby', 'M596 186 L768 249', 'direct', 'syntax, naming', 628, 186, 'start', 1],
  ['e-clojure', 'M870 110 L870 234', 'direct', 'protocols', 882, 178, 'start', 1],
  ['e-gleam', 'M560 300 L768 353', 'inf', 'compiles to the BEAM', 636, 352, 'middle', 2],
];
const DIM_IN_C = ['ruby', 'clojure', 'e-ruby', 'e-clojure'];
const el = (t, a, p = tree) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };

const defs = el('defs', {});
const g1 = el('linearGradient', { id: 'gEx', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
el('stop', { offset: 0, 'stop-color': '#A86FE6' }, g1); el('stop', { offset: 1, 'stop-color': '#6C3AAE' }, g1);
const fg = el('filter', { id: 'fGlow', x: '-60%', y: '-120%', width: '220%', height: '340%' }, defs);
el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 14, result: 'b' }, fg);
el('feColorMatrix', { in: 'b', type: 'matrix', values: '0 0 0 0 0.62  0 0 0 0 0.38  0 0 0 0 1  0 0 0 .85 0', result: 'c' }, fg);
const fm = el('feMerge', {}, fg); el('feMergeNode', { in: 'c' }, fm); el('feMergeNode', { in: 'SourceGraphic' }, fm);
[['ah', 'ah-ink', 7], ['ahx', 'ah-ex', 4]].forEach(([id, cls, sz]) => {
  const m = el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: sz, markerHeight: sz, orient: 'auto-start-reverse' }, defs);
  el('path', { d: 'M0 0 L10 5 L0 10 Z', class: cls }, m);
});
const world = el('g', {});
const band = el('g', { 'data-stage': 2 }, world);
el('rect', { x: 760, y: 228, width: 220, height: 192, rx: 14, class: 'band' }, band);
el('text', { x: 870, y: 412, 'text-anchor': 'middle', class: 'band-l' }, band).textContent = 'THE BEAM';
const cols = el('g', { 'data-stage': 3 }, world);
[['CONCEPTUAL ANTECEDENTS', 130], ['EARLIER LANGUAGES', 500], ['TODAY', 870]].forEach(([t, x]) =>
  el('text', { x, y: 30, 'text-anchor': 'middle', class: 'col' }, cols).textContent = t);
const byKey = {};
EDGES.forEach(([key, d, kind, lbl, lx, ly, anchor, st]) => {
  const g = el('g', { 'data-stage': st, 'data-key': key }, world);
  el('path', { d, class: `edge e-${kind}`, 'marker-end': `url(#${kind === 'direct' ? 'ahx' : 'ah'})` }, g);
  if (kind === 'direct') el('path', { d, class: 'e-flow' }, g);
  el('text', { x: lx, y: ly, 'text-anchor': anchor, class: 'lbl' + (kind === 'direct' ? ' dir' : '') }, g).textContent = lbl;
  byKey[key] = g;
});
NODES.forEach(([id, name, yr, cx, cy, kind, st]) => {
  const g = el('g', { class: `node n-${kind}`, 'data-stage': st, 'data-key': id }, world);
  el('rect', { x: X[cx] - W / 2, y: Y[cy] - H / 2, width: W, height: H, rx: 14 }, g);
  el('text', { x: X[cx], y: Y[cy] - 1, 'text-anchor': 'middle', class: 'nm' }, g).textContent = name;
  el('text', { x: X[cx], y: Y[cy] + 19, 'text-anchor': 'middle', class: 'yr' }, g).textContent = yr;
  byKey[id] = g;
});
const staged = $$('[data-stage]', tree);
const EL = { x: X[2], y: Y[2] };              // Elixir node centre
const BOX = {                                  // camera targets (tree units)
  A: [EL.x - 190, EL.y - 120, 380, 240],
  B: [405, 40, 600, 300],
  C: [400, 225, 590, 205],
  D: [0, 0, 1000, 430],
};

/* ---------------- the drop */
const DROP = 'M0,-1.64 C0.34,-1.08 1,-0.64 1,0 A1,1 0 0 1 -1,0 C-1,-0.64 -0.34,-1.08 0,-1.64 Z';
vHole.setAttribute('d', DROP); vRing.setAttribute('d', DROP);
vRing.setAttribute('vector-effect', 'non-scaling-stroke');

let L = {};   // layout in px
function layout() {
  const w = stage.clientWidth, h = stage.clientHeight, mobile = w < 860;
  const nav = 64;
  const hr = hero.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  const heroRight = hr.right - sr.left, heroBottom = hr.bottom - sr.top;
  let r, cx, cy;
  if (mobile) {
    r = clamp(Math.min(w * .2, (h - heroBottom) * .24), 46, 110);
    cx = w / 2; cy = heroBottom + (h - heroBottom) * .52 + r * .25;
  } else {
    r = clamp(Math.min(h * .17, w * .11), 72, 160);
    cx = clamp(Math.max(w * .73, heroRight + r + 70), 0, w - r - 60);
    cy = h * .54;
  }
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
  // area the tree may use once the beat card is showing
  const bb = beatsBox.getBoundingClientRect();
  const area = mobile
    ? { x: 14, y: nav + 48, w: w - 28, h: Math.max(160, (bb.top - sr.top) - nav - 64) }
    : { x: (bb.right - sr.left) + 36, y: nav + 30, w: w - (bb.right - sr.left) - 36 - 52, h: h - nav - 70 };
  L = { w, h, r, cx, cy, sMax: far / r * 1.04, area, mobile };
  for (const e of [vRect, vFill]) { e.setAttribute('width', w); e.setAttribute('height', h); }
  veil.setAttribute('viewBox', `0 0 ${w} ${h}`);
  tree.setAttribute('viewBox', `0 0 ${w} ${h}`);
  if (!mobile) { note.style.left = (cx + r * 1.15) + 'px'; note.style.top = (cy + r * .55) + 'px'; }
}

/* camera: maps tree units to stage px. A camera is {k, ux, uy, px, py}:
   tree point (ux,uy) is drawn at stage pixel (px,py) with zoom k. */
function fitCam(box, area, pad = .9) {
  const [x, y, bw, bh] = box;
  const k = Math.min(area.w / bw, area.h / bh) * pad;
  return { k, ux: x + bw / 2, uy: y + bh / 2, px: area.x + area.w / 2, py: area.y + area.h / 2 };
}
function mixCam(a, b, t) {
  // zoom interpolates geometrically, which feels like a real camera move
  const k = a.k * Math.pow(b.k / a.k, t);
  return { k, ux: lerp(a.ux, b.ux, t), uy: lerp(a.uy, b.uy, t), px: lerp(a.px, b.px, t), py: lerp(a.py, b.py, t) };
}
function applyCam(c) {
  world.setAttribute('transform', `translate(${c.px.toFixed(2)} ${c.py.toFixed(2)}) scale(${c.k.toFixed(4)}) translate(${(-c.ux).toFixed(2)} ${(-c.uy).toFixed(2)})`);
}

/* ---------------- frame */
const BEAT_AT = [.2, .4, .6, .8];      // where each beat starts
let lastBeat = -1;
function render(p) {
  const { r, cx, cy, sMax, area, mobile } = L;
  // 1. the mask reveal (p 0 -> .2)
  const t = seg(p, 0, .2);
  const grow = Math.pow(t, 2.4);
  const s = 1 + (sMax - 1) * grow;
  const hole = `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${(r * s).toFixed(3)})`;
  vHole.setAttribute('transform', hole); vRing.setAttribute('transform', hole);
  veil.style.display = t >= 1 ? 'none' : '';
  vRing.style.opacity = 1 - seg(t, 0, .25);
  const fade = 1 - seg(t, .12, .6);
  hero.style.opacity = fade; hero.style.transform = mobile ? `translateY(${-30 * t}px)` : `translateY(calc(-46% - ${50 * t}px))`;
  hero.style.visibility = fade <= 0 ? 'hidden' : '';
  note.style.opacity = 1 - seg(t, 0, .2);
  cue.style.opacity = 1 - seg(p, 0, .04);
  cue.style.pointerEvents = p > .04 ? 'none' : '';
  setNavDark(t > .55);

  // 2. camera: Elixir inside the drop, then the four beats
  const k0 = (r * 1.62) / W;
  const c0 = { k: k0, ux: EL.x, uy: EL.y, px: cx, py: cy };
  const cA = fitCam(BOX.A, area, .78), cB = fitCam(BOX.B, area), cC = fitCam(BOX.C, area), cD = fitCam(BOX.D, area, .96);
  const tr = (a) => smooth(seg(p, a, a + .09));   // camera moves in the first part of each beat
  let cam;
  if (p < BEAT_AT[0]) cam = mixCam(c0, { ...c0, k: k0 * 1.18 }, grow);
  else if (p < BEAT_AT[1]) cam = mixCam({ ...c0, k: k0 * 1.18 }, cA, tr(BEAT_AT[0]));
  else if (p < BEAT_AT[2]) cam = mixCam(cA, cB, tr(BEAT_AT[1]));
  else if (p < BEAT_AT[3]) cam = mixCam(cB, cC, tr(BEAT_AT[2]));
  else cam = mixCam(cC, cD, tr(BEAT_AT[3]));
  applyCam(cam);

  // 3. what is visible
  const vis = { 0: 1, 1: seg(p, BEAT_AT[1] - .01, BEAT_AT[1] + .05), 2: seg(p, BEAT_AT[2] - .01, BEAT_AT[2] + .05), 3: seg(p, BEAT_AT[3] - .01, BEAT_AT[3] + .06) };
  // in beat C (Erlang's story) Ruby and Clojure step back
  const dimC = 1 - .72 * smooth(seg(p, BEAT_AT[2], BEAT_AT[2] + .05)) * (1 - smooth(seg(p, BEAT_AT[3], BEAT_AT[3] + .05)));
  staged.forEach(g => { g.style.opacity = (vis[g.dataset.stage] * (DIM_IN_C.includes(g.dataset.key) ? dimC : 1)).toFixed(3); });

  // 4. beat cards
  const b = p < BEAT_AT[0] + .03 ? -1 : p < BEAT_AT[1] ? 0 : p < BEAT_AT[2] ? 1 : p < BEAT_AT[3] ? 2 : 3;
  if (b !== lastBeat) {
    beats.forEach((e, i) => e.classList.toggle('on', i === b));
    dots.forEach((e, i) => e.classList.toggle('on', i === b));
    beatsBox.classList.toggle('live', b >= 0); $('#beatDots').classList.toggle('live', b >= 0);
    lastBeat = b;
  }
  stage.style.setProperty('--gy', (-p * 140).toFixed(1) + 'px');
}

function renderStatic() {
  // no scroll scene: the whole tree, every beat card, no veil
  const w = tree.clientWidth, h = tree.clientHeight;
  tree.setAttribute('viewBox', `0 0 ${w} ${h}`);
  applyCam(fitCam(BOX.D, { x: 16, y: 10, w: w - 32, h: h - 20 }, .98));
  staged.forEach(g => g.style.opacity = 1);
  beats.forEach(e => e.classList.add('on'));
  setNavDark(true);
  window.EX.kick();
}

if (STATIC) {
  addEventListener('resize', renderStatic);
  requestAnimationFrame(renderStatic);
} else {
  layout();
  addEventListener('resize', layout);
  document.fonts && document.fonts.ready.then(() => { layout(); window.EX.kick(); });
  addScene(track, render, { id: 'roots', ease: .12 });
}
})();
