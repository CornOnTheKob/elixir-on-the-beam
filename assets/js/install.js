/* =====================================================================
   install.js · "How to install Elixir"
   Four terminals with Copy buttons. Install commands are the ones on
   elixir-lang.org/install; the other outputs are real runs from data.js.
   The Copy button copies the commands only, never the output.
   ===================================================================== */
(() => {
'use strict';
const { $, $$, esc, termLine, D } = window.EX;
const OUT = D.out;

const OS = {
  mac: { label: 'macOS', shell: 'zsh', prompt: '$', cmds: ['brew install elixir'],
    note: 'Uses Homebrew. With MacPorts instead: <code>sudo port install elixir</code>.' },
  win: { label: 'Windows', shell: 'PowerShell', prompt: 'PS>', cmds: ['choco install elixir'],
    note: 'Uses Chocolatey, which installs Erlang as well. With Scoop: <code>scoop install erlang</code>, then <code>scoop install elixir</code>. Prefer a click-through installer? The official page links one for Erlang and a matching one for Elixir.' },
  linux: { label: 'Linux (Ubuntu)', shell: 'bash', prompt: '$',
    cmds: ['sudo add-apt-repository ppa:rabbitmq/rabbitmq-erlang', 'sudo apt update', 'sudo apt install git elixir erlang'],
    note: 'Ubuntu’s own <code>apt</code> packages lag several versions behind, so the official page suggests these newer ones. Arch: <code>pacman -S elixir</code>. Fedora: <code>sudo dnf install elixir erlang</code>.' },
};

const COPY_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 3.5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* blocks: [{ cmd, out }]; out lines go through the shared terminal colouring */
function term(el, { title, prompt = '$', blocks }) {
  const lines = [];
  blocks.forEach(({ cmd, out }, i) => {
    if (cmd && i > 0 && blocks[i - 1].out) lines.push('');   // breathing room after an output
    if (cmd) lines.push(`<span class="ps" aria-hidden="true">${esc(prompt)}</span> <span class="c">${esc(cmd).replace(/--/g, '-<span class="hy">-</span>')}</span>`);   // keep -- readable as two hyphens
    if (out) out.split('\n').forEach(l => lines.push(`<span class="o">${termLine(l) || ' '}</span>`));
  });
  el.innerHTML = `<div class="iterm-bar"><span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="iterm-title">${esc(title)}</span>
    <button class="copy" type="button" aria-label="Copy the commands">${COPY_ICON}<span>Copy</span></button></div>
    <pre class="iterm-out">${lines.join('\n')}</pre>`;
  el.dataset.copy = blocks.map(b => b.cmd).filter(Boolean).join('\n');
  $('.copy', el).onclick = e => copy(el.dataset.copy, e.currentTarget);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    // fallback for pages opened from the disk or older browsers
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove();
    return ok;
  }
}
async function copy(text, btn) {
  const ok = await copyText(text);
  btn.classList.toggle('done', ok);
  btn.innerHTML = ok ? `${CHECK_ICON}<span>Copied</span>` : `${COPY_ICON}<span>Select and copy</span>`;
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = `${COPY_ICON}<span>Copy</span>`; }, 1800);
}

/* step 1: one terminal, three systems */
const tabs = $('#osTabs');
tabs.innerHTML = Object.entries(OS).map(([k, o]) => `<button role="tab" type="button" data-os="${k}">${o.label}</button>`).join('');
function showOS(k) {
  const o = OS[k];
  $$('button', tabs).forEach(b => b.setAttribute('aria-selected', String(b.dataset.os === k)));
  term($('#termInstall'), { title: `${o.shell} — ${o.label}`, prompt: o.prompt, blocks: o.cmds.map(cmd => ({ cmd })) });
  $('#osNote').innerHTML = o.note;
}
$$('button', tabs).forEach(b => b.onclick = () => showOS(b.dataset.os));
const guess = /Win/i.test(navigator.platform || navigator.userAgent) ? 'win' : /Linux/i.test(navigator.platform || '') && !/Android/i.test(navigator.userAgent) ? 'linux' : 'mac';
showOS(guess);

/* steps 2-4: real outputs */
term($('#termVersion'), { title: 'zsh', blocks: [{ cmd: 'elixir --version', out: OUT.inst_version }] });
const iexLines = OUT.inst_iex.split('\n');
term($('#termIex'), { title: 'zsh — iex', blocks: [{ cmd: 'iex' }] });
{ // iex prompts come from the transcript; Copy gets "iex" plus each expression
  const el = $('#termIex');
  $('.iterm-out', el).insertAdjacentHTML('beforeend', '\n' + iexLines.map(l => `<span class="o">${termLine(l)}</span>`).join('\n'));
  el.dataset.copy = ['iex', ...iexLines.filter(l => l.startsWith('iex> ')).map(l => l.slice(5))].join('\n');
}
term($('#termMix'), { title: 'zsh', blocks: [
  { cmd: 'mix new hello', out: OUT.inst_new },
  { cmd: 'cd hello' },
  { cmd: 'mix test', out: OUT.inst_test },
] });
})();
