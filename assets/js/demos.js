/* =====================================================================
   demos.js · 03 Demos (and exercises)
   A laptop opens as you scroll; each further scroll runs the next item on
   its screen: eight demos, then nine exercises, each shown with its worked
   solution and real output, just like the demos. On phones the screen pops out into a
   full-width card. Every code sample and output comes from data.js (real
   recordings); the exercises' words are in exercises.js.
   ===================================================================== */
(() => {
'use strict';
const { $, $$, clamp, lerp, seg, smooth, easeInOut, esc, hl, termLine, addScene, STATIC, SHOT, params, D } = window.EX;
const sleep = ms => (STATIC || SHOT) ? Promise.resolve() : window.EX.sleep(ms);
const SRC = D.src, OUT = D.out;
const stage = $('#ltStage'), track = $('#ltTrack'), world = $('#ltWorld'), laptop = $('#laptop'), lid = $('#lid');
const screen = $('#screen'), slot = $('#screenSlot'), boot = $('#screenBoot'), popSlot = $('#popSlot'), hint = $('#ltHint'), shadowEl = $('#ltShadow');

/* ---------------- keyboard */
const ROWS = [[...Array(14)].map(() => 1), [...Array(14)].map(() => 1), [2, ...Array(12).fill(1)], [2, ...Array(10).fill(1), 2], [1, 1, 1, 2, 6, 1, 1, 1]];
$('#keys').innerHTML = ROWS.map(r => r.map(w => `<i class="${w === 2 ? 'w2' : w === 6 ? 'w6' : ''}"></i>`).join('')).join('');

/* ---------------- the eight demos */
const inputs = t => t.split('\n').filter(l => /^(iex|erl)> /.test(l)).map(l => l.replace(/^(iex|erl)> /, '')).join('\n');
const CH = { ex: '#8F55C4', otp: '#16AFC1', beam: '#4A5F8E', you: '#F3A44E' };
const DEMOS = [
  { file: 'matching.exs', title: 'Pattern matching', c: 'you',
    lives: [['Kept from Erlang', 'keep']],
    text: '<code>=</code> checks a shape. If the value on the right fits the pattern on the left, the names inside get values. If it does not fit, the program stops right there with a <b>MatchError</b>, on purpose.',
    tabs: [{ name: 'matching_fits.exs', code: SRC.matching_fits, cmd: 'elixir matching_fits.exs', out: OUT.matching_fits },
           { name: 'matching_nofit.exs', code: SRC.matching_nofit, cmd: 'elixir matching_nofit.exs', out: OUT.matching_nofit }] },
  { file: 'rebinding.iex', title: 'Rebinding a name', c: 'ex',
    lives: [['Elixir', 'ex'], ['compile time', 'keep']],
    text: 'In Elixir, <code>x = 2</code> points the name <code>x</code> at a new value; the value 1 never changes. Erlang refuses the same line. Write <code>^x</code> to match the current value instead. The compiler turns rebinding into fresh names, so the BEAM never sees it.',
    tabs: [{ name: 'Elixir · iex', code: inputs(OUT.rebinding_iex), cmd: 'iex', transcript: OUT.rebinding_iex },
           { name: 'Erlang · erl', lang: 'erl', code: inputs(OUT.rebinding_erl), cmd: 'erl', transcript: OUT.rebinding_erl }] },
  { file: 'pipeline.exs', title: 'The pipe', c: 'ex', scen: 'pipe',
    lives: [['Elixir', 'ex'], ['compile time', 'keep']],
    text: 'Each <code>|&gt;</code> passes the result of one step into the next function, so the code reads in the order it runs. Both tabs print the same answer, and the paper found that a pipe and its nested version compile to identical BEAM code.',
    tabs: [{ name: 'pipeline.exs', code: SRC.pipe, cmd: 'elixir pipeline.exs', out: OUT.pipe },
           { name: 'pipe_nested.exs', code: SRC.pipe_nested, cmd: 'elixir pipe_nested.exs', out: OUT.pipe_nested }] },
  { file: 'counter.ex', title: 'Processes and messages', c: 'beam', scen: 'send',
    lives: [['BEAM', 'beam'], ['run time', 'keep']],
    text: '<code>Counter.start</code> spawns a process that keeps its count inside a loop. Nothing outside can touch that count: other processes can only send it messages, and it answers with a message of its own.',
    tabs: [{ name: 'counter.ex', code: SRC.counter, cmd: 'iex lib.exs', transcript: OUT.messages_iex }] },
  { file: 'restart.exs', title: 'Let it crash', c: 'otp', scen: 'crash',
    lives: [['OTP', 'otp'], ['BEAM', 'beam'], ['run time', 'keep']],
    text: 'Popping an empty stack crashes the worker. The supervisor notices and starts a fresh one with a new PID, and the third pop works again. The worker itself has no error handling at all.',
    tabs: [{ name: 'restart.exs', code: SRC.restart, cmd: 'elixir -r lib.exs restart.exs', out: OUT.restart },
           { name: 'stack.ex', code: SRC.stack, cmd: 'elixir -r lib.exs restart.exs', out: OUT.restart }] },
  { file: 'my.ex', title: 'Macros', c: 'ex',
    lives: [['Elixir', 'ex'], ['compile time', 'keep']],
    text: '<code>quote</code> turns code into data the program can inspect. A macro receives code as that data and returns new code before the program runs. <code>My.unless</code> is built this way, and so is Elixir’s own <code>if</code>.',
    tabs: [{ name: 'my.ex', code: SRC.my_macro, cmd: 'iex lib.exs', transcript: OUT.macros_iex }] },
  { file: 'describe.ex', title: 'Protocols', c: 'ex', scen: 'protocols',
    lives: [['Elixir', 'ex'], ['compile + run time', 'keep'], ['idea from Clojure', 'keep']],
    text: 'A protocol is one function with a version per type, and Elixir picks the right one at run time. The <code>User</code> version was added later without touching the rest. José Valim took the idea from Clojure.',
    tabs: [{ name: 'protocols_defs.exs', code: SRC.protocols, cmd: 'iex protocols_defs.exs', transcript: OUT.protocols_iex }] },
  { file: 'shop.ex', title: 'Gradual types', c: 'ex',
    lives: [['Elixir 1.20', 'ex'], ['compile time', 'keep']],
    text: 'Elixir 1.20 checks the types of every program, with no annotations. Compiling this file gives two warnings: a number is joined to a string, and <code>:oops</code> matches no clause of <code>label/1</code>. They are warnings: the file still compiles.',
    tabs: [{ name: 'shop.ex', code: SRC.shop, cmd: 'elixirc shop.ex', out: OUT.types + '\n    … (output abridged in the paper)' }] },
];
/* ---------------- the nine exercises (words: exercises.js; code and output: data.js) */
const EXS = (window.EX.EXERCISES || []).map(e => ({ ...e, kind: 'ex',
  tabs: [{ name: e.file, code: SRC[e.key], cmd: `elixir ${e.file}`, out: OUT[e.key] }] }));
const ITEMS = [...DEMOS, ...EXS];
const ND = DEMOS.length, NE = EXS.length, N = ITEMS.length;
const LV = { Starter: '#16AFC1', Easy: '#2FB37A', Medium: '#F3A44E' };
const pad = n => String(n).padStart(2, '0');

/* ---------------- editor */
const ed = $('#editorTpl').content.firstElementChild.cloneNode(true);
const edFiles = $('#edFiles', ed), edTabs = $('#edTabs', ed), edCode = $('#edCode', ed), edOut = $('#edOut', ed), edNotes = $('#edNotes', ed);
const edRun = $('#edRun', ed);
const ver = D.version.match(/Elixir ([\d.]+).*OTP (\d+)/) || [];
$('#edBadge', ed).textContent = `Elixir ${ver[1]} · OTP ${ver[2]}`;
// short one-line labels for the sidebar (the full title is on the notes panel and in the tooltip)
const SHORT = ['Pattern matching', 'Rebinding', 'The pipe', 'Processes', 'Let it crash', 'Macros', 'Protocols', 'Gradual types',
               'Hello, Elixir', 'Basic math', 'First function', 'Greeter', 'Sum a list', 'FizzBuzz', 'Shopping cart', 'Safe division', 'Ping-pong'];
const fileBtn = (d, i, num, color) => `<button type="button" data-i="${i}" title="${esc(d.title)}" style="--c:${color}"><span class="n">${num}</span><span class="dot"></span><span class="t">${SHORT[i] || d.title}</span></button>`;
edFiles.innerHTML = '<p class="hd">DEMOS</p>' + DEMOS.map((d, i) => fileBtn(d, i, pad(i + 1), CH[d.c])).join('')
  + '<p class="hd ex-hd">EXERCISES</p>' + EXS.map((e, j) => fileBtn(e, ND + j, pad(j + 1), LV[e.level])).join('');
$$('button', edFiles).forEach(b => b.onclick = () => jump(+b.dataset.i));
edRun.onclick = () => runOutput();

let cur = -1, tab = 0, tok = 0;
function renderTabs() {
  const d = ITEMS[cur];
  edTabs.innerHTML = d.tabs.map((t, j) => `<button role="tab" type="button" aria-selected="${j === tab}" data-j="${j}">${esc(t.name)}</button>`).join('');
  $$('button', edTabs).forEach(b => b.onclick = () => { tab = +b.dataset.j; renderTabs(); renderCode(); runOutput(); });
}
function renderCode() {
  const t = ITEMS[cur].tabs[tab];
  edCode.innerHTML = hl(t.code, t.lang).split('\n').map((l, i) => `<span class="l in" style="animation-delay:${Math.min(i, 30) * 16}ms">${l || ' '}</span>`).join('');
  edCode.scrollTop = 0;
}
async function runOutput() {
  const me = ++tok;
  const t = ITEMS[cur].tabs[tab];
  edOut.innerHTML = '';
  const add = html => { edOut.insertAdjacentHTML('beforeend', `<span class="ln">${html || ' '}</span>`); edOut.scrollTop = edOut.scrollHeight; };
  add(`<span class="cmd"><b>$</b> ${esc(t.cmd)}</span>`);
  const lines = (t.transcript || t.out).split('\n');
  await sleep(STATIC ? 0 : 360);
  for (const l of lines) {
    if (me !== tok) return;
    add(termLine(l));
    if (!STATIC) await sleep(/^(iex|erl)> /.test(l) ? 300 : 55);
  }
  if (me === tok) edOut.insertAdjacentHTML('beforeend', '<span class="cursor"></span>');
}
function renderNotes() {
  const d = ITEMS[cur];
  const bar = `<div class="bar" aria-hidden="true"><i style="width:${(cur + 1) / N * 100}%"></i></div>`;
  if (d.kind === 'ex') {
    edNotes.innerHTML = `<div class="swap"><p class="nn">Exercise ${pad(cur - ND + 1)} / ${pad(NE)}<span class="lv ${d.level.toLowerCase()}">${d.level}</span></p></div>
      <h3 class="swap">${d.title}</h3><p class="swap">${d.task}</p>
      <div class="prac swap"><em>YOU'LL PRACTISE</em>${d.practise.map(p => `<span>${esc(p)}</span>`).join('')}</div>
      <div class="how swap"><em>HOW IT WORKS</em><ul>${d.how.map(h => `<li>${h}</li>`).join('')}</ul></div>
      ${d.scen ? `<a class="see" href="#inside" data-scen="${d.scen}">See it in chapter 02 →</a>` : '<span class="see" aria-hidden="true"></span>'}
      ${bar}`;
  } else {
    edNotes.innerHTML = `<div class="swap"><p class="nn">Demo ${pad(cur + 1)} / ${pad(ND)}</p></div>
      <h3 class="swap">${d.title}</h3><p class="swap">${d.text}</p>
      <div class="lives swap"><em>LIVES IN</em>${d.lives.map(([n, k]) => `<span class="${k === 'keep' ? 'keep' : ''}" style="--c:${CH[k] || 'transparent'}">${n}</span>`).join('')}</div>
      ${d.scen ? `<a class="see" href="#inside" data-scen="${d.scen}">See who does this in chapter 02 →</a>` : '<span class="see" aria-hidden="true"></span>'}
      ${bar}`;
  }
  edNotes.scrollTop = 0;
  const see = $('a.see', edNotes);
  if (see) see.onclick = () => window.EX.selectScenario && window.EX.selectScenario(see.dataset.scen);
}
function show(i) {
  i = clamp(i, 0, N - 1);
  if (i === cur) return;
  cur = i; tab = 0;
  $('#edTitle', ed).textContent = `${ITEMS[i].tabs[0].name} — elixir-on-the-beam`;
  // keep the current item visible in the sidebar (scrolls the list only, never the page)
  const fb = $$('button', edFiles)[i];
  if (fb && (fb.offsetTop < edFiles.scrollTop || fb.offsetTop + fb.offsetHeight > edFiles.scrollTop + edFiles.clientHeight))
    edFiles.scrollTop = fb.offsetTop - 40;
  $$('button', edFiles).forEach((b, j) => b.classList.toggle('on', j === i));
  $$('.pop-dots button').forEach((b, j) => b.classList.toggle('on', j === i));
  renderTabs(); renderCode(); renderNotes(); runOutput();
}

/* ---------------- layout + scroll timeline */
const VH = { open: 130, pop: 70, demo: 52, tail: 30 };   // demo = scroll length of each of the 17 items
let M = {};   // measurements
function layout() {
  const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight, mobile = w < 760;
  const top = 64 + 22;
  const s = mobile ? Math.min((w - 28) / 1160, (h * .42) / 870) : Math.min((h - top - 56) / 700, (w - 48) / 1160, 1);
  const pop = mobile ? VH.pop : 0;
  const spanVh = VH.open + pop + N * VH.demo + VH.tail;
  if (!STATIC) track.style.height = (spanVh + 100) + 'vh';
  M = { w, h, mobile, s, top, spanVh, pOpen: VH.open / spanVh, pPop: (VH.open + pop) / spanVh, pDemoLen: VH.demo / spanVh };
  // where the editor lives
  if (mobile) {
    if (ed.parentNode !== popSlot) { popSlot.appendChild(ed); }
    const card = { x: 12, y: 64 + 12, w: w - 24, h: h - 64 - 12 - 46 };
    Object.assign(ed.style, { left: card.x + 'px', top: card.y + 'px', width: card.w + 'px', height: card.h + 'px' });
    M.card = card;
    let dots = $('.pop-dots', stage);
    if (!dots) {
      dots = document.createElement('div'); dots.className = 'pop-dots';
      dots.innerHTML = ITEMS.map((d, i) => `<button type="button" class="${i === ND ? 'gap' : ''}" aria-label="${i < ND ? `Demo ${i + 1}` : `Exercise ${i - ND + 1}`}: ${esc(d.title)}"></button>`).join('');
      popSlot.appendChild(dots);
      $$('button', dots).forEach((b, i) => b.onclick = () => jump(i));
    }
    dots.style.top = (card.y + card.h + 18) + 'px';
  } else {
    if (ed.parentNode !== slot) { slot.appendChild(ed); Object.assign(ed.style, { left: '', top: '', width: '', height: '', transform: '' }); }
    const dots = $('.pop-dots', stage); if (dots) dots.remove();
  }
}
function pose(t) {
  // t: 0 = closed, 1 = open and facing the viewer
  const { w, h, s, top } = M;
  const tilt = lerp(-62, -15, t), ang = lerp(-90, 15, t), yaw = lerp(-24, 0, smooth(t));
  const scale = s * lerp(.5, 1, t);
  const depth = 700 * Math.sin(-tilt * Math.PI / 180) * scale;   // how far the base reaches down the screen
  const hingeOpen = top + 700 * s;
  const hingeClosed = h * .45 - depth / 2;
  const hinge = lerp(hingeClosed, hingeOpen, smooth(t));
  world.style.transform = `translate(${(w / 2 - 580).toFixed(1)}px, ${(hinge - 700).toFixed(1)}px) scale(${scale.toFixed(4)})`;
  laptop.style.transform = `rotateX(${tilt.toFixed(2)}deg) rotateY(${yaw.toFixed(2)}deg)`;
  lid.style.transform = `rotateX(${ang.toFixed(2)}deg)`;
  shadowEl.style.transform = `translateY(${(700 * Math.sin(-tilt * Math.PI / 180) * .55).toFixed(1)}px) scaleY(${lerp(1.6, .8, t).toFixed(3)})`;
  shadowEl.style.opacity = lerp(.55, 1, t).toFixed(3);
}
function render(p) {
  const t = smooth(seg(p, 0, M.pOpen));
  pose(t);
  hint.style.opacity = 1 - seg(p, 0, M.pOpen * .25);
  boot.style.setProperty('--bootLogo', seg(t, .7, .92).toFixed(3));
  const on = t >= .995;
  boot.classList.toggle('off', on && !M.mobile);
  if (M.mobile) {
    const z = smooth(seg(p, M.pOpen, M.pPop));
    const sr = screen.getBoundingClientRect(), st = stage.getBoundingClientRect(), c = M.card;
    const k = Math.min(sr.width / c.w, sr.height / c.h);
    const fx = sr.left - st.left + (sr.width - c.w * k) / 2, fy = sr.top - st.top + (sr.height - c.h * k) / 2;
    const kk = lerp(k, 1, z);
    ed.style.transform = `translate(${lerp(fx - c.x, 0, z).toFixed(1)}px, ${lerp(fy - c.y, 0, z).toFixed(1)}px) scale(${kk.toFixed(4)})`;
    ed.classList.toggle('ready', on);
    world.style.opacity = (1 - seg(z, .55, 1)).toFixed(3);
    const dots = $('.pop-dots', stage); if (dots) dots.style.opacity = seg(z, .8, 1).toFixed(3);
  } else {
    ed.classList.toggle('ready', on);
    world.style.opacity = '';
  }
  const q = (p - M.pPop) / (M.pDemoLen * N);
  show(Math.min(N - 1, Math.max(0, Math.floor(q * N))));
}
function jump(i) {
  if (STATIC) return show(i);
  const r = track.getBoundingClientRect();
  const span = track.offsetHeight - innerHeight;
  const p = M.pPop + M.pDemoLen * (i + .5);
  scrollTo({ top: scrollY + r.top + span * p, behavior: 'smooth' });
}

/* ---------------- start */
if (STATIC) stage.style.height = innerWidth < 760 ? 'auto' : '100vh';
layout();
if (STATIC) {
  if (M.mobile) { world.style.display = 'none'; hint.style.display = 'none'; Object.assign(ed.style, { position: 'relative', left: 'auto', top: 'auto', width: 'auto', height: '640px', margin: '0 12px', transform: 'none' }); popSlot.style.position = 'relative'; }
  else { pose(1); hint.style.display = 'none'; boot.classList.add('off'); }
  ed.classList.add('ready');
  show(params.has('demo') ? +params.get('demo') - 1 : 0);
  $$('button', edFiles).forEach(b => b.onclick = () => show(+b.dataset.i));
} else {
  addEventListener('resize', () => { layout(); });
  addScene(track, render, { id: 'demos', ease: .13 });
}
})();
