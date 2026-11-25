/* =====================================================================
   inside.js · 02 Inside: who does what, and when
   An isometric map of four stations (your code, the Elixir compiler,
   OTP, the BEAM) on a floor split into compile time and run time.
   Each situation is a list of steps; every inspector line is a recorded
   output from data.js.
   ===================================================================== */
(() => {
'use strict';
const { $, $$, clamp, lerp, esc, hl, termLine, tween, sleep, easeInOut, easeOut, STATIC, params, D } = window.EX;
const NS = 'http://www.w3.org/2000/svg';
const svg = $('#iso'), tags = $('#isoTags'), wrap = $('#isoWrap'), counter = $('#isoCounter');

/* ---------------- isometric projection */
const C = Math.cos(Math.PI / 6), S = .5;
const P = (x, y, z = 0) => [(x - y) * C, (x + y) * S - z];
const pts = a => a.map(p => P(...p).map(v => v.toFixed(2)).join(',')).join(' ');
const mk = (t, a = {}, parent) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; };
/* a box: visible faces are top, "left" (the y+d side) and "right" (the x+w side) */
function box(g, x, y, z, w, d, h, c, cls = '') {
  const b = mk('g', { class: cls }, g);
  mk('polygon', { points: pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]), fill: c[2] }, b);
  mk('polygon', { points: pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]), fill: c[1] }, b);
  mk('polygon', { points: pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]), fill: c[0] }, b);
  mk('polyline', { points: pts([[x, y + d, z + h], [x + w, y + d, z + h], [x + w, y, z + h]]), class: 'edge-line' }, b);
  mk('polyline', { points: pts([[x + w, y + d, z], [x + w, y + d, z + h]]), class: 'edge-line' }, b);
  return b;
}
/* draw on a face: returns a group whose local (u, v) maps onto that face */
const onLeft = (g, x, y, z) => { const [ox, oy] = P(x, y, z); return mk('g', { transform: `matrix(${C} ${S} 0 1 ${ox} ${oy})` }, g); };   // u = +x, v = down
const onRight = (g, x, y, z) => { const [ox, oy] = P(x, y, z); return mk('g', { transform: `matrix(${C} ${-S} 0 1 ${ox} ${oy})` }, g); }; // u = -y, v = down
const onFloor = (g, x, y, z) => { const [ox, oy] = P(x, y, z); return mk('g', { transform: `matrix(${C} ${S} ${-C} ${S} ${ox} ${oy})` }, g); }; // u = +x, v = +y

/* ---------------- palette */
const COL = {
  floorC: ['#F4EEFD', '#E4DAF3', '#D6CAEA'], floorR: ['#EAF7F9', '#D3EAEE', '#C2DEE3'],
  lap: ['#EEF0F4', '#D6DAE1', '#C2C7D0'], lapScr: ['#C9CED7', '#1A2036', '#AEB4BF'],
  ex: ['#C7A2EE', '#9A62D3', '#7B45B8'], exTop: ['#DCC4F6', '#B386E2', '#9566CC'],
  otp: ['#9BE4EC', '#2DBCCB', '#1497A6'], otpT: ['#5FD2DE', '#17A5B5', '#0D8392'],
  beam: ['#3A4A70', '#253455', '#1A2642'],
  cube: ['#FFFFFF', '#E8E3F2', '#D4CCE4'], cubeIdle: ['#F3F0F9', '#DCD6E8', '#C9C1DB'],
  cubeNew: ['#C9F1F5', '#7FD9E3', '#4FC0CD'], cubeDead: ['#FFC9CB', '#F27C80', '#D9585D'],
  cubeShell: ['#FFE7C7', '#F6BE79', '#E09B4D'], cubeMod: ['#E3CCFA', '#B07BE6', '#8E57CB'],
};

/* ---------------- static scene */
const root = mk('g', {}, svg);
const defs = mk('defs', {}, svg);
const blur = mk('filter', { id: 'isoBlur', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
mk('feGaussianBlur', { stdDeviation: 6 }, blur);
const pg = mk('radialGradient', { id: 'pkG' }, defs);
mk('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 1 }, pg); mk('stop', { offset: .35, 'stop-color': '#fff', 'stop-opacity': .9 }, pg); mk('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, pg);

const FLOOR = { x: 0, y: 0, w: 610, d: 312, cut: 250 };
const gFloor = mk('g', {}, root);
// slab sides
mk('polygon', { points: pts([[0, FLOOR.d, 0], [FLOOR.w, FLOOR.d, 0], [FLOOR.w, FLOOR.d, -18], [0, FLOOR.d, -18]]), fill: '#DCD3EA' }, gFloor);
mk('polygon', { points: pts([[FLOOR.w, 0, 0], [FLOOR.w, FLOOR.d, 0], [FLOOR.w, FLOOR.d, -18], [FLOOR.w, 0, -18]]), fill: '#CBC1DD' }, gFloor);
const zoneC = mk('polygon', { class: 'zone', points: pts([[0, 0, 0], [FLOOR.cut, 0, 0], [FLOOR.cut, FLOOR.d, 0], [0, FLOOR.d, 0]]), fill: COL.floorC[0] }, gFloor);
const zoneR = mk('polygon', { class: 'zone', points: pts([[FLOOR.cut, 0, 0], [FLOOR.w, 0, 0], [FLOOR.w, FLOOR.d, 0], [FLOOR.cut, FLOOR.d, 0]]), fill: COL.floorR[0] }, gFloor);
// floor grid
const grid = onFloor(gFloor, 0, 0, 0);
for (let u = 30; u < FLOOR.w; u += 30) mk('line', { x1: u, y1: 0, x2: u, y2: FLOOR.d, stroke: 'rgba(20,35,59,.05)', 'stroke-width': 1 }, grid);
for (let v = 30; v < FLOOR.d; v += 30) mk('line', { x1: 0, y1: v, x2: FLOOR.w, y2: v, stroke: 'rgba(20,35,59,.05)', 'stroke-width': 1 }, grid);
mk('line', { x1: FLOOR.cut, y1: 0, x2: FLOOR.cut, y2: FLOOR.d, stroke: 'rgba(20,35,59,.28)', 'stroke-width': 1.6, 'stroke-dasharray': '6 7' }, grid);
// painted labels
const lab = onFloor(gFloor, 0, 0, 0);
const txC = mk('text', { x: 18, y: FLOOR.d - 16, class: 'floor-txt', fill: '#B9A2DA' }, lab); txC.textContent = 'COMPILE TIME';
const txR = mk('text', { x: FLOOR.cut + 18, y: FLOOR.d - 16, class: 'floor-txt', fill: '#86C9D2' }, lab); txR.textContent = 'RUN TIME';

// soft shadows
const gShadow = mk('g', { filter: 'url(#isoBlur)', opacity: .22 }, root);
const shadow = (x, y, w, d) => mk('polygon', { points: pts([[x + 8, y + 8, 0], [x + w + 10, y + 8, 0], [x + w + 10, y + d + 12, 0], [x + 8, y + d + 12, 0]]), fill: '#3A2560' }, gShadow);

const ST = {};   // stations
function station(id, glow) { const g = mk('g', { class: 'st', 'data-st': id }, root); g.style.setProperty('--glow', glow); const lift = mk('g', { class: 'lift' }, g); ST[id] = { g, lift }; return lift; }

// --- Elixir compiler (drawn first: it sits further back)
shadow(150, 40, 84, 76);
{
  const g = station('ex', 'rgba(143,85,196,.55)');
  box(g, 150, 40, 0, 84, 76, 50, COL.ex);
  box(g, 172, 58, 50, 42, 40, 9, COL.exTop);
  box(g, 182, 66, 59, 22, 24, 5, ['#EBDDFB', '#C9A7F0', '#AC86D9']);
  // label + vents
  const lf = onLeft(g, 150, 116, 50);
  mk('text', { x: 12, y: 30, fill: '#fff', 'font-family': 'Poppins', 'font-weight': 700, 'font-size': 13, 'letter-spacing': '.18em' }, lf).textContent = 'ELIXIR';
  for (let i = 0; i < 4; i++) mk('rect', { x: 12 + i * 14, y: 38, width: 8, height: 3, rx: 1.5, fill: 'rgba(255,255,255,.45)' }, lf);
  const rf = onRight(g, 234, 116, 50);
  mk('rect', { x: 16, y: 18, width: 44, height: 18, rx: 3, fill: 'rgba(40,10,80,.35)' }, rf);
  for (let i = 0; i < 3; i++) mk('rect', { x: 20 + i * 13, y: 23, width: 9, height: 8, rx: 2, fill: 'rgba(255,255,255,.18)' }, rf);
  // floating drop
  const [dx, dy] = P(192, 78, 96);
  const drop = mk('g', { transform: `translate(${dx} ${dy})` }, g);
  const bob = mk('g', { class: 'bob' }, drop);
  mk('ellipse', { cx: 0, cy: 34, rx: 13, ry: 4, fill: 'rgba(60,20,110,.18)' }, bob);
  mk('path', { d: 'M0 -20 C4 -13 12 -7 12 1 A12 12 0 0 1 -12 1 C-12 -7 -4 -13 0 -20Z', fill: 'url(#gDrop)' }, bob);
  const gd = mk('linearGradient', { id: 'gDrop', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  mk('stop', { offset: 0, 'stop-color': '#C9A2F5' }, gd); mk('stop', { offset: 1, 'stop-color': '#6C3AAE' }, gd);
  ST.ex.anchor = [192, 78, 128];
}
// --- your code: a laptop
shadow(56, 178, 84, 56);
{
  const g = station('code', 'rgba(243,164,78,.6)');
  box(g, 56, 178, 0, 84, 56, 5, COL.lap);
  const kb = onFloor(g, 56, 178, 5);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) mk('rect', { x: 8 + c * 7.6, y: 7 + r * 6.2, width: 5.6, height: 4.4, rx: 1, fill: '#BFC4CE' }, kb);
  mk('rect', { x: 28, y: 34, width: 28, height: 12, rx: 2, fill: '#D3D7DE' }, kb);
  box(g, 56, 174, 5, 84, 4, 56, COL.lapScr);
  const scr = onLeft(g, 56, 178, 61);
  mk('rect', { x: 5, y: 5, width: 74, height: 46, rx: 2, fill: '#1A2036' }, scr);
  const lines = [[8, 14, '#F3A44E'], [8, 22, '#CBA8FF'], [14, 30, '#7FE3EE'], [14, 18, '#E8E3F5'], [8, 26, '#CBA8FF'], [8, 12, '#F3A44E']];
  lines.forEach(([x, w, c], i) => mk('rect', { x, y: 11 + i * 6.4, width: w + (i % 2) * 14, height: 2.6, rx: 1.3, fill: c, opacity: .9 }, scr));
  ST.code.anchor = [98, 176, 74];
}
// --- OTP: a supervisor tower
shadow(318, 24, 80, 66);
{
  const g = station('otp', 'rgba(22,175,193,.6)');
  box(g, 318, 24, 0, 80, 66, 14, COL.otp);
  box(g, 342, 40, 14, 34, 34, 46, COL.otpT);
  box(g, 357, 55, 60, 4, 4, 18, ['#BFF0F5', '#7AD3DD', '#58BCC8']);
  const [lx, ly] = P(359, 57, 82);
  ST.otp.light = mk('circle', { cx: lx, cy: ly, r: 4.5, fill: '#4BE0EE', class: 'otp-light' }, g);
  const lf = onLeft(g, 342, 74, 60);
  mk('text', { x: 6, y: 22, fill: '#fff', 'font-family': 'Poppins', 'font-weight': 700, 'font-size': 11.5, 'letter-spacing': '.16em' }, lf).textContent = 'OTP';
  mk('rect', { x: 6, y: 30, width: 22, height: 3, rx: 1.5, fill: 'rgba(255,255,255,.5)' }, lf);
  ST.otp.anchor = [359, 57, 100];
  ST.otp.port = [359, 57, 84];
}
// --- BEAM: the big engine slab with process slots
const BEAM = { x: 318, y: 120, w: 270, d: 150, h: 20 };
shadow(BEAM.x, BEAM.y, BEAM.w, BEAM.d);
const LEDS = [];
{
  const g = station('beam', 'rgba(30,43,71,.5)');
  box(g, BEAM.x, BEAM.y, 0, BEAM.w, BEAM.d, BEAM.h, COL.beam);
  const top = onFloor(g, BEAM.x, BEAM.y, BEAM.h);
  mk('rect', { x: 8, y: 8, width: BEAM.w - 16, height: BEAM.d - 16, rx: 6, fill: 'none', stroke: 'rgba(255,255,255,.12)', 'stroke-width': 1.2 }, top);
  const lf = onLeft(g, BEAM.x, BEAM.y + BEAM.d, BEAM.h);
  mk('text', { x: 12, y: 14, fill: 'rgba(255,255,255,.85)', 'font-family': 'Poppins', 'font-weight': 700, 'font-size': 10, 'letter-spacing': '.2em' }, lf).textContent = 'BEAM';
  for (let i = 0; i < 8; i++) LEDS.push(mk('rect', { x: 120 + i * 17, y: 7, width: 11, height: 6, rx: 2, fill: '#3B5079' }, lf));
  ST.beam.anchor = [BEAM.x + BEAM.w / 2 + 20, BEAM.y + BEAM.d + 6, -26];
  ST.beam.below = true;
}
const gCubes = mk('g', {}, ST.beam.lift);
const gLinks = mk('g', {}, root);
const gFx = mk('g', {}, root);

/* process slots on the BEAM (col i along x, row j along y) */
const SLOT = (i, j) => [BEAM.x + 18 + i * 28, BEAM.y + 16 + j * 32];
const SLOTS = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) SLOTS.push(`${i},${j}`);
const IDLE = ['1,0', '3,3', '4,0', '6,3', '8,1', '0,1', '7,2'];
const CUBE_KIND = { idle: COL.cubeIdle, worker: COL.cube, new: COL.cubeNew, dead: COL.cubeDead, shell: COL.cubeShell, counter: COL.cube, module: COL.cubeMod, fill: COL.cubeIdle };
function cubeTop(key, kind) { const [i, j] = key.split(',').map(Number); const [x, y] = SLOT(i, j); const sz = kind === 'module' ? 16 : 12; return [x + sz / 2, y + sz / 2, BEAM.h + (kind === 'module' ? 15 : 12)]; }
function drawCube(key, kind, label) {
  const [i, j] = key.split(',').map(Number); const [x, y] = SLOT(i, j);
  const sz = kind === 'module' ? 16 : 12, h = kind === 'module' ? 15 : 12;
  const g = box(gCubes, x, y, BEAM.h, sz, sz, h, CUBE_KIND[kind] || COL.cube, 'cube');
  g.dataset.key = key; g.style.transformBox = 'fill-box'; g.style.transformOrigin = '50% 100%';
  if (label) {
    const [tx, ty] = P(x + sz / 2, y + sz / 2, BEAM.h + h + 10);
    const t = mk('text', { x: tx, y: ty, 'text-anchor': 'middle', 'font-family': 'Poppins', 'font-size': 9.5, 'font-weight': 600, fill: '#fff', 'paint-order': 'stroke', stroke: '#253455', 'stroke-width': 3 }, g);
    t.textContent = label;
  }
  return g;
}

/* ---------------- HTML tags over the stations */
const TAGS = {
  code: ['Your code', 'what you write', 'var(--you)'], ex: ['Elixir', 'the compiler', 'var(--ex)'],
  otp: ['OTP', 'the libraries', 'var(--otp)'], beam: ['BEAM', 'the virtual machine', 'var(--beam)'],
};
const tagEl = {};
for (const id in TAGS) {
  const t = document.createElement('div');
  t.className = 'tag' + (ST[id].below ? ' below' : '');
  t.style.setProperty('--c', TAGS[id][2]);
  t.innerHTML = `<b>${TAGS[id][0]}</b><span>${TAGS[id][1]}</span>`;
  tags.appendChild(t); tagEl[id] = t;
}
function placeTags() {
  const m = svg.getScreenCTM(); if (!m) return;
  const wr = wrap.getBoundingClientRect();
  for (const id in tagEl) {
    const [x, y] = P(...ST[id].anchor);
    const pt = new DOMPoint(x, y).matrixTransform(m);
    tagEl[id].style.left = (pt.x - wr.left) + 'px'; tagEl[id].style.top = (pt.y - wr.top) + 'px';
  }
}
// viewBox around everything
svg.setAttribute('viewBox', '-286 -84 834 584');

/* ---------------- packets and effects */
function routePts(route) { return route.map(p => P(...p)); }
function lenOf(a) { let s = 0; for (let i = 1; i < a.length; i++) s += Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]); return s; }
function at(a, d) {
  for (let i = 1; i < a.length; i++) {
    const l = Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]);
    if (d <= l || i === a.length - 1) { const t = l ? clamp(d / l) : 1; return [lerp(a[i - 1][0], a[i][0], t), lerp(a[i - 1][1], a[i][1], t)]; }
    d -= l;
  }
  return a[a.length - 1];
}
function arc(a, b, hz = 40, n = 24) { const r = []; for (let i = 0; i <= n; i++) { const t = i / n; r.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t) + Math.sin(Math.PI * t) * hz]); } return r; }
function packet(color) {
  const g = mk('g', { class: 'pk' }, gFx);
  mk('circle', { r: 13, fill: color, opacity: .18 }, g);
  mk('circle', { r: 6.5, fill: color }, g);
  mk('circle', { r: 2.6, fill: '#fff' }, g);
  return g;
}
async function send(route, color, ms, run) {
  if (STATIC || run !== runId) return;
  const a = routePts(route), L = lenOf(a);
  const pk = packet(color);
  const trail = mk('polyline', { fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: .35 }, gFx);
  gFx.insertBefore(trail, pk);
  ms = ms || clamp(L * 3.2, 520, 1300);
  const seen = [];
  await tween(ms, t => {
    if (run !== runId) return;
    const [x, y] = at(a, L * t);
    pk.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    seen.push(`${x.toFixed(1)},${y.toFixed(1)}`); if (seen.length > 14) seen.shift();
    trail.setAttribute('points', seen.join(' '));
  });
  await tween(220, t => { pk.style.opacity = 1 - t; trail.style.opacity = .35 * (1 - t); }, easeOut);
  pk.remove(); trail.remove();
}
async function pulse(id, run) {
  if (STATIC || run !== runId) return;
  const [x, y] = P(...ST[id].anchor);
  const ring = mk('ellipse', { cx: x, cy: y + 30, rx: 10, ry: 5, fill: 'none', stroke: getComputedStyle(ST[id].g).getPropertyValue('--glow'), 'stroke-width': 3 }, gFx);
  await tween(700, t => { ring.setAttribute('rx', 10 + t * 70); ring.setAttribute('ry', 5 + t * 35); ring.style.opacity = 1 - t; }, easeOut);
  ring.remove();
}
async function pop(key, run) {
  const g = gCubes.querySelector(`[data-key="${key}"]`); if (!g || STATIC || run !== runId) return;
  await tween(420, t => { g.style.transform = `scale(${.2 + .8 * t})`; g.style.opacity = t; }, t => 1 - Math.pow(1 - t, 3) * Math.cos(t * 6) * .2 - (1 - t) * .8);
  g.style.transform = '';
}
async function crash(key, run) {
  const g = gCubes.querySelector(`[data-key="${key}"]`); if (!g || STATIC) return;
  g.querySelectorAll('polygon').forEach((p, i) => p.setAttribute('fill', COL.cubeDead[[2, 1, 0][i]]));
  await tween(520, t => { g.style.transform = `translate(${Math.sin(t * 40) * 3 * (1 - t)}px,0)`; }, t => t);
  await tween(520, t => { g.style.transform = `translate(0,${t * 26}px)`; g.style.opacity = 1 - t; }, t => t * t);
}
async function fillAll(run) {
  const free = SLOTS.filter(k => !gCubes.querySelector(`[data-key="${k}"]`));
  for (const k of free) { if (run !== runId) return; drawCube(k, 'fill').style.opacity = 0; }
  const all = [...gCubes.querySelectorAll('.cube')];
  await tween(1300, t => all.forEach((g, i) => { const v = clamp(t * 1.6 - i / all.length * .6); g.style.opacity = v; g.style.transform = `scale(${.3 + .7 * v})`; }), t => t);
  all.forEach(g => g.style.transform = '');
}
let ledTimer = null;
function leds(on) {
  clearInterval(ledTimer); LEDS.forEach(l => l.setAttribute('fill', '#3B5079'));
  if (!on) return;
  let i = 0;
  const tick = () => { LEDS.forEach((l, j) => l.setAttribute('fill', (j === i % 8 || j === (i + 3) % 8 || j === (i + 6) % 8) ? '#4BE0EE' : '#3B5079')); i++; };
  tick(); if (!STATIC) ledTimer = setInterval(tick, 140);
}
function link(on) {
  gLinks.innerHTML = '';
  if (!on) return;
  const a = arc(ST.otp.port, cubeTop(on, 'worker'), 34).map(p => P(...p));
  mk('polyline', { points: a.map(p => p.join(',')).join(' '), fill: 'none', stroke: '#16AFC1', 'stroke-width': 1.8, 'stroke-dasharray': '4 5', opacity: .85 }, gLinks);
}

/* ---------------- routes (world coordinates) */
const R = {
  codeEx: [[142, 206, 1], [196, 206, 1], [196, 120, 1]],
  exBeam: [[236, 78, 1], [282, 78, 1], [282, 196, 1], [318, 196, 2], [324, 196, BEAM.h + 1]],
};
const toSlot = (key) => [[324, 196, BEAM.h + 1], cubeTop(key, 'worker')];

/* ---------------- data helpers */
const OUT = D.out, SRC = D.src, B = D.bench;
const lines = s => s.split('\n');
const rs = lines(OUT.restart);
const find = (arr, re) => arr.filter(l => re.test(l));
const tx = (s, a, b) => lines(s).slice(a, b);
const code = arr => arr.map(t => [t, 'code']);
const outl = arr => arr.map(t => [t, 'out']);
const iex = arr => arr.map(t => [t, 'iex']);
const note = t => [[t, 'note']];

/* ---------------- the six situations */
const SCEN = [
  { id: 'crash', name: 'A worker crashes', c: 'var(--otp)', src: 'Recorded run of the paper’s supervisor demo (d4) · ' ,
    steps: [
      { on: ['code'], z: 'c', text: 'You write a <code>Stack</code> worker and ask a supervisor to watch it.',
        insp: code(lines(SRC.restart).slice(0, 2)), cubes: {} },
      { on: ['ex'], z: 'c', text: 'The Elixir compiler turns it into BEAM bytecode. Its job ends before the program starts.',
        insp: note('(compiling prints nothing)'), cubes: {}, anim: async r => { await send(R.codeEx, '#F3A44E', 0, r); await pulse('ex', r); } },
      { on: ['beam', 'otp'], z: 'r', text: 'The program starts. The BEAM runs the worker as its own lightweight process, and the OTP supervisor links to it.',
        insp: outl(find(rs, /^(worker: #PID<0\.137|pop 1)/)), cubes: { '2,1': ['worker', 'Stack'] }, link: '2,1',
        anim: async r => { await send(R.exBeam, '#8F55C4', 0, r); setCubes({ '2,1': ['worker', 'Stack'] }); await pop('2,1', r); link('2,1'); } },
      { on: ['beam'], z: 'r', text: 'Popping an empty stack crashes the worker. The BEAM stops only that process and sends an exit signal to the supervisor.',
        insp: [...find(rs, /\[error\]|FunctionClauseError/).map(t => [t, 'err']), ...outl(find(rs, /^pop 2/))], cubes: {}, link: null,
        anim: async r => { await crash('2,1', r); link(null); await send(arc(cubeTop('2,1', 'worker'), ST.otp.port, 44), '#E5484D', 900, r); } },
      { on: ['otp', 'beam'], z: 'r', text: 'The supervisor, which is OTP library code, starts a fresh worker with a new PID. The next pop works again.',
        insp: outl(find(rs, /^(worker: #PID<0\.138|new process|pop 3)/)), cubes: { '2,1': ['new', 'Stack'] }, link: '2,1',
        anim: async r => { await pulse('otp', r); await send(arc(ST.otp.port, cubeTop('2,1', 'worker'), 44), '#16AFC1', 900, r); setCubes({ '2,1': ['new', 'Stack'] }); await pop('2,1', r); link('2,1'); } },
    ] },
  { id: 'pipe', name: 'Write a pipe', c: 'var(--ex)', src: 'Paper §5.3, compiler check (bench/zerocost.exs) · ',
    steps: [
      { on: ['code'], z: 'c', text: 'You write a pipeline. Each <code>|&gt;</code> passes a result into the next function.',
        insp: code(['def f(xs), do:', ...SRC.zc_pipe.split(' |> ').map((s, i) => (i ? '  |> ' : '  ') + s)]) },
      { on: ['ex'], z: 'c', text: 'The compiler rewrites the pipe into ordinary nested calls.',
        insp: code(['def f(xs), do:', '  ' + SRC.zc_nested]), anim: async r => { await send(R.codeEx, '#F3A44E', 0, r); await pulse('ex', r); } },
      { on: ['ex'], z: 'c', text: 'The paper checked the result: the pipe and the nested version compile to identical BEAM code.',
        insp: outl([OUT.zerocost[0]]), anim: async r => { await pulse('ex', r); } },
      { on: ['beam'], z: 'r', text: 'So at run time the BEAM just runs three ordinary function calls. It never sees a pipe.',
        insp: note('(nothing pipe-specific exists at run time)'), anim: async r => { await send(R.exBeam, '#8F55C4', 0, r); await pulse('beam', r); } },
    ] },
  { id: 'spawn', name: 'Spawn a process', c: 'var(--beam)', src: 'Paper §5.3: compiler check and benchmark E1 · ',
    steps: [
      { on: ['code'], z: 'c', text: 'You start a new process with <code>spawn</code>, here one that waits for a message.',
        insp: code([SRC.bench_spawn.replace(/^for _ <- 1\.\.n, do: /, '')]) },
      { on: ['ex'], z: 'c', text: 'Elixir’s <code>spawn</code> compiles to <code>erlang:spawn/1</code>, the very call Erlang’s own <code>spawn</code> becomes.',
        insp: outl(OUT.zerocost.slice(2, 4)), anim: async r => { await send(R.codeEx, '#F3A44E', 0, r); await pulse('ex', r); } },
      { on: ['beam'], z: 'r', text: 'The BEAM creates the process, with its own memory and its own mailbox. An idle one used 2,640 bytes in both languages.',
        insp: outl(['idle process memory, median of 10 trials', `  Elixir  ${B.resSpawnMemElixirK} bytes`, `  Erlang  ${B.resSpawnMemErlangK} bytes`]), cubes: { '4,2': ['new', 'new'] },
        anim: async r => { await send(R.exBeam, '#8F55C4', 0, r); setCubes({ '4,2': ['new', 'new'] }); await pop('4,2', r); } },
    ] },
  { id: 'send', name: 'Send a message', c: 'var(--you)', src: 'Recorded iex session of the paper’s messages demo (d5) · ',
    steps: [
      { on: ['code'], z: 'c', text: 'You write a <code>Counter</code>: a process that keeps a count inside a <code>receive</code> loop.',
        insp: code(lines(SRC.counter).slice(1, 9).map(l => l.replace(/^  /, ''))) },
      { on: ['ex'], z: 'c', text: 'Elixir’s <code>send</code> compiles to a call to <code>erlang:send/2</code>, the BEAM’s built-in send.',
        insp: outl([OUT.zerocost[4]]), anim: async r => { await send(R.codeEx, '#F3A44E', 0, r); await pulse('ex', r); } },
      { on: ['beam'], z: 'r', text: 'In iex, <code>Counter.start(0)</code> spawns the counter. Three sends put three <code>:increment</code> messages in its mailbox, each copied by the BEAM.',
        insp: iex(tx(OUT.messages_iex, 0, 4)), cubes: { '0,2': ['shell', 'iex'], '5,2': ['counter', 'Counter'] },
        anim: async r => { await send(R.exBeam, '#8F55C4', 0, r); setCubes({ '0,2': ['shell', 'iex'], '5,2': ['counter', 'Counter'] }); await pop('5,2', r);
          for (let i = 0; i < 3; i++) { if (r !== runId) return; await send(arc(cubeTop('0,2'), cubeTop('5,2'), 30), '#F3A44E', 620, r); } } },
      { on: ['beam'], z: 'r', text: 'To read the count, iex sends its own PID. The counter replies with a message of its own: <code>{:count, 3}</code>.',
        insp: iex(tx(OUT.messages_iex, 4, 8)), cubes: { '0,2': ['shell', 'iex'], '5,2': ['counter', 'Counter'] },
        anim: async r => { await send(arc(cubeTop('0,2'), cubeTop('5,2'), 30), '#F3A44E', 700, r); await send(arc(cubeTop('5,2'), cubeTop('0,2'), 30), '#16AFC1', 700, r); } },
    ] },
  { id: 'million', name: 'A million processes', c: 'var(--beam)', src: 'Paper benchmark E1 and the deck’s scheduling demo (fair.exs) · ',
    steps: [
      { on: ['code'], z: 'c', text: 'You spawn one million processes, each waiting for a message. This is the paper’s benchmark E1.',
        insp: code(['# n = 1_000_000', SRC.bench_spawn]) },
      { on: ['beam'], z: 'r', text: 'The BEAM creates all of them in under a second, at 2,640 bytes each while idle.',
        insp: outl(['n = 1,000,000 · median of 10 timed trials', `  Elixir  ${B.resSpawnTimeElixirM} ms   (IQR ${B.resSpawnTimeElixirMIQR})`, `  Erlang  ${B.resSpawnTimeErlangM} ms   (IQR ${B.resSpawnTimeErlangMIQR})`]),
        fill: true, counter: true,
        anim: async r => { await send(R.codeEx, '#F3A44E', 520, r); await send(R.exBeam, '#8F55C4', 620, r); showCounter(true); await fillAll(r); } },
      { on: ['beam'], z: 'r', text: 'The BEAM runs one scheduler per CPU core. Each process gets a small budget of work, then the scheduler moves on, so none can hog a core.',
        insp: outl([lines(OUT.fair)[0]]), fill: true, leds: true },
      { on: ['beam'], z: 'r', text: 'The test: 32 processes spin forever on 8 cores. A newcomer’s ping-pong still finished in microseconds.',
        insp: outl(lines(OUT.fair).slice(1)), fill: true, leds: true },
    ] },
  { id: 'protocols', name: 'Protocols', c: 'var(--ex)', src: 'Recorded iex session (demos/protocols_defs.exs) · ',
    steps: [
      { on: ['code'], z: 'c', text: 'You define a <code>Describe</code> protocol, with versions for lists, integers and a <code>User</code> struct.',
        insp: code([...lines(SRC.protocols).slice(0, 3), ...lines(SRC.protocols).slice(-3)]) },
      { on: ['ex'], z: 'c', text: 'Elixir compiles the protocol and each implementation into ordinary BEAM modules.',
        insp: note('(compiling prints nothing)'), anim: async r => { await send(R.codeEx, '#F3A44E', 0, r); await pulse('ex', r); } },
      { on: ['ex', 'beam'], z: 'r', text: 'At run time, <code>Describe.describe/1</code> picks the version that matches the value’s type. This is Elixir code still at work while the program runs.',
        insp: iex(lines(OUT.protocols_iex)), cubes: { '0,2': ['shell', 'iex'], '6,0': ['module', 'Describe'] },
        anim: async r => { await send(R.exBeam, '#8F55C4', 0, r); setCubes({ '0,2': ['shell', 'iex'], '6,0': ['module', 'Describe'] }); await pop('6,0', r);
          for (let i = 0; i < 3; i++) { if (r !== runId) return; await send(arc(cubeTop('0,2'), cubeTop('6,0', 'module'), 34), '#F3A44E', 560, r); await send(arc(cubeTop('6,0', 'module'), cubeTop('0,2'), 34), '#8F55C4', 560, r); } } },
    ] },
];

/* ---------------- state and rendering */
let scen = SCEN[0], step = 0, runId = 0, playing = null;
const version = (D.version.match(/Elixir [\d.]+/) || [''])[0] + ' / OTP ' + ((D.version.match(/OTP (\d+)/) || [])[1] || '');

function setCubes(extra = {}) {
  gCubes.innerHTML = '';
  const all = {}; IDLE.forEach(k => all[k] = ['idle']); Object.assign(all, extra);
  // draw back to front so nearer cubes overlap farther ones
  Object.keys(all).sort((a, b) => { const [ai, aj] = a.split(',').map(Number), [bi, bj] = b.split(',').map(Number); return (ai + aj) - (bi + bj) || ai - bi; })
    .forEach(k => drawCube(k, all[k][0], all[k][1]));
}
function showCounter(on) {
  counter.classList.toggle('on', !!on);
  counter.innerHTML = on ? `<b>1,000,000</b>processes · ${B.resSpawnTimeElixirM} ms (Elixir)` : '';
}
function renderState(s) {
  for (const id in ST) {
    const on = s.on.includes(id);
    ST[id].g.classList.toggle('on', on); ST[id].g.classList.toggle('off', !on);
    tagEl[id].classList.toggle('on', on); tagEl[id].classList.toggle('off', !on);
  }
  $$('.who .chip').forEach(c => c.classList.toggle('on', s.on.includes(c.dataset.layer)));
  $$('#when span').forEach(e => e.classList.toggle('on', e.dataset.zone === s.z));
  zoneC.setAttribute('fill', s.z === 'c' ? '#EDE2FC' : COL.floorC[0]);
  zoneR.setAttribute('fill', s.z === 'r' ? '#DDF3F6' : COL.floorR[0]);
  txC.setAttribute('fill', s.z === 'c' ? '#8F55C4' : '#C9B8E2');
  txR.setAttribute('fill', s.z === 'r' ? '#16AFC1' : '#A6D6DD');
}
function settle(i) {
  // the full state after step i, without animation
  const s = scen.steps[i];
  setCubes(s.cubes || {});
  if (s.fill) SLOTS.forEach(k => { if (!gCubes.querySelector(`[data-key="${k}"]`)) drawCube(k, 'fill'); });
  link(s.link || null);
  leds(!!s.leds);
  showCounter(!!(s.counter || s.fill));
}
function inspector(i) {
  const html = [];
  scen.steps.slice(0, i + 1).forEach((s, j) => (s.insp || []).forEach(([t, kind]) => {
    let inner = kind === 'code' ? hl(t) : kind === 'iex' ? termLine(t) : kind === 'note' ? `<span class="note">${esc(t)}</span>` : kind === 'err' ? `<span class="err">${esc(t)}</span>` : termLine(t);
    html.push(`<span class="ln${j < i ? ' old' : ''}">${inner || ' '}</span>`);
  }));
  $('#inspBody').innerHTML = html.join('');
  $('#inspSrc').textContent = scen.src + version;
}
function ui(i) {
  const s = scen.steps[i];
  $('#stepNo').textContent = `Step ${i + 1} of ${scen.steps.length}`;
  $('#stepText').innerHTML = s.text;
  $$('#rail li').forEach((li, j) => { li.classList.toggle('done', j < i); li.classList.toggle('cur', j === i); li.querySelector('button').setAttribute('aria-current', j === i ? 'step' : 'false'); });
  $('#bBack').disabled = i === 0;
  $('#bNext').disabled = i === scen.steps.length - 1;
  renderState(s); inspector(i);
}
async function go(i, animate = true) {
  i = clamp(i, 0, scen.steps.length - 1);
  const r = ++runId;
  const forward = i === step + 1;
  step = i; ui(i);
  if (animate && forward && scen.steps[i].anim && !STATIC) {
    await scen.steps[i].anim(r);
    if (r !== runId) return;
  }
  settle(i);
}
function selectScenario(id, autoplay = false) {
  const next = SCEN.find(s => s.id === id) || SCEN[0];
  stopPlay();
  scen = next; step = 0; runId++;
  $$('#scenTabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.id === scen.id)));
  $('#rail').innerHTML = scen.steps.map((_, j) => `<li><button type="button" aria-label="Step ${j + 1}">${j + 1}</button></li>`).join('');
  $$('#rail button').forEach((b, j) => b.onclick = () => { stopPlay(); go(j, j === step + 1); });
  gFx.innerHTML = '';
  ui(0); settle(0);
  if (autoplay) play();
}
function stopPlay() { playing = null; $('#bPlay').classList.remove('playing'); $('#bPlay span').textContent = 'Play'; }
async function play() {
  if (playing) return stopPlay();
  const me = playing = {};
  $('#bPlay').classList.add('playing'); $('#bPlay span').textContent = 'Pause';
  if (step === scen.steps.length - 1) { go(0, false); await sleep(700); }
  while (playing === me && step < scen.steps.length - 1) {
    await go(step + 1);
    await sleep(1500);
  }
  if (playing === me) stopPlay();
}

/* ---------------- wire up */
$('#scenTabs').innerHTML = SCEN.map(s => `<button role="tab" type="button" data-id="${s.id}" style="--c:${s.c}"><span class="ico" aria-hidden="true"></span>${s.name}</button>`).join('');
$$('#scenTabs button').forEach(b => b.onclick = () => selectScenario(b.dataset.id));
$('#bNext').onclick = () => { stopPlay(); go(step + 1); };
$('#bBack').onclick = () => { stopPlay(); go(step - 1, false); };
$('#bPlay').onclick = () => play();
addEventListener('resize', placeTags);
new ResizeObserver(placeTags).observe(wrap);
document.fonts && document.fonts.ready.then(placeTags);

// small idle animations
if (!STATIC) {
  const bob = svg.querySelector('.bob');
  let t0 = performance.now();
  const idle = now => { const t = (now - t0) / 1000; bob.setAttribute('transform', `translate(0 ${(Math.sin(t * 2) * 3).toFixed(2)})`);
    ST.otp.light.setAttribute('opacity', (.55 + .45 * Math.abs(Math.sin(t * 2.4))).toFixed(2)); requestAnimationFrame(idle); };
  requestAnimationFrame(idle);
}

const startId = params.get('scen') || 'crash';
selectScenario(startId);
if (params.has('step')) { const k = +params.get('step') - 1; for (let j = 1; j <= k; j++) { step = j; } ui(clamp(k, 0, scen.steps.length - 1)); settle(clamp(k, 0, scen.steps.length - 1)); }
placeTags();
// play the first situation once when the lab first comes into view
if (!STATIC && !params.has('step')) {
  const once = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { once.disconnect(); setTimeout(() => { if (step === 0 && !playing) play(); }, 600); } }, { threshold: .45 });
  once.observe(wrap);
}
window.EX.selectScenario = (id) => selectScenario(id);
})();
