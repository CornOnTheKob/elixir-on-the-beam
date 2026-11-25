/* =====================================================================
   core.js · shared helpers, smooth scroll driver, nav, reveals
   ===================================================================== */
(() => {
'use strict';

/* ---------------------------------------------------------------------
   EDIT HERE: each author's site. Both copies of this website use the
   same two links, so the files can stay identical on both sites.
   --------------------------------------------------------------------- */
const SITES = {
  jacob: 'https://drive.google.com/drive/folders/1pU3ZKCQqO8tShqRo3HI1u3eWAXswnoln?usp=sharing',   // the project files (Google Drive)
  michelle: 'https://mich-ca.github.io/GNN-interactive-tutorial/',
};

const params = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STATIC = reduce || params.has('static');
if (STATIC) document.documentElement.classList.add('static');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const seg = (p, a, b) => clamp((p - a) / (b - a));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- syntax colouring for Elixir and Erlang */
const EX_KW = 'def|defp|defmodule|defprotocol|defimpl|defmacro|defstruct|do|end|fn|receive|case|cond|when|if|else|for|quote|unquote|use|require|import|alias|try|catch|rescue|after';
const RE_EX = new RegExp(String.raw`(#.*$)|("(?:[^"\\]|\\.)*")|(:[a-zA-Z_][\w?!]*)|\b([a-z_][\w?!]*:)(?=\s)|(@[a-z_]\w*)|\b(${EX_KW})\b|\b([A-Z][\w]*(?:\.[A-Z]\w*)*)\b|(\|>|->|<-|=>|::|\^|=)|\b(\d[\d_]*)\b`, 'gm');
const RE_ERL = /(%.*$)|("(?:[^"\\]|\\.)*")|\b([A-Z_][\w]*)\b|\b(\d+)\b|(->|=|!)/gm;
function hl(code, lang = 'ex') {
  const re = lang === 'erl' ? RE_ERL : RE_EX;
  re.lastIndex = 0;
  let out = '', last = 0, m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    let c;
    if (lang === 'erl') c = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'm' : m[4] ? 'n' : 'o';
    else c = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'a' : m[4] ? 'a' : m[5] ? 'at' : m[6] ? 'k' : m[7] ? 'm' : m[8] ? 'o' : 'n';
    out += `<span class="t-${c}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(code.slice(last));
}
/* one terminal/inspector line -> html (prompt lines are highlighted) */
function termLine(line) {
  const p = line.match(/^(iex|erl)> (.*)$/);
  if (p) return `<span class="pr">${p[1]}&gt;</span> ${hl(p[2], p[1] === 'erl' ? 'erl' : 'ex')}`;
  if (/^\*\* |exception error/.test(line)) return `<span class="err">${esc(line)}</span>`;
  if (/\(stack trace trimmed\)/.test(line)) return `<span class="trim">${esc(line)}</span>`;
  if (/^warning:/.test(line) || /\[error\]/.test(line)) return `<span class="${/\[error\]/.test(line) ? 'err' : 'warn'}">${esc(line)}</span>`;
  return esc(line);
}

/* ---------- tween helper with cancellation */
function tween(ms, fn, ease = easeInOut) {
  return new Promise(res => {
    if (STATIC) { fn(1); return res(); }
    const t0 = performance.now();
    const f = now => { const t = clamp((now - t0) / ms); fn(ease(t)); t < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  });
}

/* ---------------------------------------------------------------------
   Smooth scroll driver. Each pinned scene registers its track; on every
   frame its progress eases toward the real scroll position, so scroll
   animations glide even with a notchy mouse wheel.
   ?solo=<section id>&p=<0..1> pins one scene at a fixed progress (used
   for screenshots and testing).
   --------------------------------------------------------------------- */
const scenes = [];
const solo = params.get('solo');
const forcedP = params.has('p') ? clamp(+params.get('p')) : null;
function addScene(track, onFrame, opts = {}) {
  const s = { track, onFrame, cur: null, target: 0, ease: opts.ease ?? .14, id: opts.id };
  scenes.push(s);
  return s;
}
function rawProgress(track) {
  const r = track.getBoundingClientRect();
  const span = track.offsetHeight - innerHeight;
  return span > 0 ? clamp(-r.top / span) : 0;
}
let running = false, lastT = 0;
function frame(now) {
  const dt = Math.min(64, now - (lastT || now)); lastT = now;
  let busy = false;
  for (const s of scenes) {
    s.target = (forcedP !== null && solo === s.id) ? forcedP : rawProgress(s.track);
    if (s.cur === null) s.cur = s.target;
    else {
      const k = 1 - Math.pow(1 - s.ease, dt / 16.67);
      s.cur += (s.target - s.cur) * k;
      if (Math.abs(s.target - s.cur) < 0.0004) s.cur = s.target; else busy = true;
    }
    s.onFrame(s.cur);
  }
  updateChrome();
  if (busy) requestAnimationFrame(frame); else { running = false; lastT = 0; }
}
function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
addEventListener('scroll', kick, { passive: true });
addEventListener('resize', () => { scenes.forEach(s => s.cur = null); kick(); });

/* ---------- nav: dark over the night scene, current chapter, progress */
const nav = $('#nav'), bar = $('#readProgress');
let darkWanted = false;
function setNavDark(v) { darkWanted = v; }
function updateChrome() {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max) : 0})`;
  const story = $('#roots');
  const r = story.getBoundingClientRect();
  nav.classList.toggle('dark', darkWanted && r.bottom > 64);
}
const chapterLinks = $$('.nav-chapters a');
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) chapterLinks.forEach(a => a.classList.toggle('on', a.dataset.ch === e.target.id)); });
}, { rootMargin: '-45% 0px -50% 0px' });
['roots', 'inside', 'demos'].forEach(id => io.observe(document.getElementById(id)));

/* ---------- reveal on scroll */
const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
$$('.reveal').forEach(el => STATIC ? el.classList.add('in') : rio.observe(el));

/* ---------- authors' sites */
$$('[data-site]').forEach(a => {
  const url = SITES[a.dataset.site];
  a.href = url;
  if (url && url !== '#') { a.target = '_blank'; a.rel = 'noopener'; }
  else a.title = 'Link to be added';
});

/* ---------- build stamp from the data file */
const D = window.ELIXIR_DATA;
if (D) {
  const v = D.version.match(/Elixir ([\d.]+).*OTP (\d+)/);
  if (v) $('#footBuild').textContent = `Every output was recorded on Elixir ${v[1]} with Erlang/OTP ${v[2]} (data built ${D.built}). Type set in Poppins and Open Sauce Sans (SIL Open Font License).`;
}

/* solo mode: show one section only (screenshots / testing) */
if (solo) {
  document.body.classList.add('solo');
  $$('main > section, .closing, .foot').forEach(s => { if (s.id !== solo) s.style.display = 'none'; });
}

if (params.has('bare')) $$('.ch-head').forEach(h => h.style.display = 'none');   // screenshots
const SHOT = params.has('shot');   // screenshots: no transitions, animations or typing delays
if (SHOT) document.head.insertAdjacentHTML('beforeend', '<style>*,*::before,*::after{transition:none!important;animation:none!important}</style>');

window.EX = { $, $$, clamp, lerp, smooth, easeInOut, easeOut, seg, esc, sleep, hl, termLine, tween, addScene, kick, setNavDark, STATIC, SHOT, params, D };
addEventListener('load', kick);
requestAnimationFrame(kick);
})();
