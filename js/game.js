'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = n => Math.floor(Math.random() * n);
const pick = a => a[rand(a.length)];

const SHIPS = {
  carrier:    { name: 'Aircraft Carrier', len: 4 },
  battleship: { name: 'Battleship', len: 3 },
  destroyer:  { name: 'Destroyer', len: 3 },
  submarine:  { name: 'Submarine', len: 2 },
  speedboat:  { name: 'Speedboat', len: 2 },
};
const SEAS = {
  small: { n: 6, fleet: ['carrier', 'battleship', 'submarine'] },
  big:   { n: 8, fleet: ['carrier', 'battleship', 'destroyer', 'submarine', 'speedboat'] },
};
const CREATURES = ['🐟', '🐠', '🐡', '🐙', '🦀', '🐢', '🐳', '🦑', '🐬', '🪼', '🦞', '🐚', '🦭', '🐋'];
const TEAMS = [{ key: 'blue', avatar: '🦈' }, { key: 'red', avatar: '🐙' }];

const DEFAULTS = { mode: 'robot', sea: 'small', extra: true, names: ['Shark', 'Octopus'], sound: true };
let settings = loadSettings();
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('sb-settings') || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
function saveSettings() { localStorage.setItem('sb-settings', JSON.stringify(settings)); }

let G = null; // current game

/* ---------------- screens ---------------- */
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
}

/* ---------------- fleet logic ---------------- */
function cellsOf(s) {
  const a = [];
  for (let i = 0; i < s.len; i++) a.push(s.dir === 'h' ? [s.r, s.c + i] : [s.r + i, s.c]);
  return a;
}
// spaced=true: ships may not touch (used for random placement)
function fits(s, others, n, spaced) {
  const d = spaced ? 1 : 0;
  for (const [r, c] of cellsOf(s)) {
    if (r < 0 || c < 0 || r >= n || c >= n) return false;
    for (const o of others) {
      if (o === s) continue;
      for (const [r2, c2] of cellsOf(o)) if (Math.abs(r - r2) <= d && Math.abs(c - c2) <= d) return false;
    }
  }
  return true;
}
function randomFleet(n, fleet) {
  for (let tries = 0; tries < 500; tries++) {
    const ships = [];
    for (const type of fleet) {
      const len = SHIPS[type].len;
      for (let k = 0; k < 200; k++) {
        const dir = Math.random() < 0.5 ? 'h' : 'v';
        const s = { type, len, dir, hits: 0, sunk: false,
          r: rand(dir === 'v' ? n - len + 1 : n), c: rand(dir === 'h' ? n - len + 1 : n) };
        if (fits(s, ships, n, true)) { ships.push(s); break; }
      }
    }
    if (ships.length === fleet.length) return ships;
  }
}
const shipAt = (p, r, c) => p.ships.find(s => cellsOf(s).some(([a, b]) => a === r && b === c));
const emptyGrid = n => Array.from({ length: n }, () => Array(n).fill(null));

function fire(D, r, c) {
  const ship = shipAt(D, r, c);
  if (!ship) {
    const e = pick(CREATURES);
    D.board[r][c] = { t: 'miss', e };
    return { kind: 'miss', e };
  }
  D.board[r][c] = { t: 'hit' };
  ship.hits++;
  if (ship.hits === ship.len) { ship.sunk = true; return { kind: 'sunk', ship }; }
  return { kind: 'hit', ship };
}

/* ---------------- board rendering ---------------- */
function shipEl(s, i, n, cls = '') {
  const w = s.dir === 'h' ? s.len : 1, h = s.dir === 'v' ? s.len : 1;
  return `<div class="ship ${s.sunk ? 'sunk' : ''} ${cls}" data-i="${i}" style="left:${s.c / n * 100}%;top:${s.r / n * 100}%;width:${w / n * 100}%;height:${h / n * 100}%">${topShip(s.type, s.len, s.dir)}</div>`;
}

// view: 'own' (all ships), 'target' (only sunk ships), 'setup'
function renderBoard(el, p, view, opts = {}) {
  const n = G.n;
  el.className = `board ${view}`;
  el.style.setProperty('--n', n);
  let cells = '', marks = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const m = p.board[r][c];
    cells += `<button class="cell${m ? ' shot' : ''}" data-r="${r}" data-c="${c}" aria-label="${String.fromCharCode(65 + r)}${c + 1}"></button>`;
    let inner = '';
    if (m) inner = m.t === 'miss' ? `<span class="miss">${m.e}</span>` : `<span class="hit">🔥</span>`;
    const isNew = opts.newCell && opts.newCell[0] === r && opts.newCell[1] === c;
    marks += `<div class="mark${isNew ? ' new' : ''}">${inner}</div>`;
  }
  const ships = p.ships.map((s, i) => (view !== 'target' || s.sunk)
    ? shipEl(s, i, n, (s === opts.reveal ? 'reveal ' : '') + (opts.pop ? 'pop' : '')) : '').join('');
  el.innerHTML = `<div class="layer cells">${cells}</div><div class="layer ships">${ships}</div><div class="layer marks">${marks}</div><div class="layer fx"></div>`;
  if (opts.pop) $$('.ship', el).forEach((s, i) => s.style.animationDelay = `${i * 90}ms`);
}

function renderTracker(D) {
  $('#tracker').innerHTML = D.ships.map(s =>
    `<div class="track ${s.sunk ? 'sunk' : ''}" style="--len:${s.len}">${topShip(s.type, s.len, 'h')}${s.sunk ? '<b>✖</b>' : ''}</div>`).join('');
}

/* ---------------- effects ---------------- */
function fxAt(board, r, c, cls, html = '') {
  const n = G.n, d = document.createElement('div');
  d.className = 'fx-item ' + cls;
  d.style.left = (c + 0.5) / n * 100 + '%';
  d.style.top = (r + 0.5) / n * 100 + '%';
  d.innerHTML = html;
  $('.fx', board).appendChild(d);
  return d;
}
function moveFx(d, r, c) {
  d.style.left = (c + 0.5) / G.n * 100 + '%';
  d.style.top = (r + 0.5) / G.n * 100 + '%';
}
function burst(k, cls, min, max) {
  let h = '';
  for (let i = 0; i < k; i++) {
    const a = Math.PI * 2 * i / k + Math.random() * 0.5, dist = min + Math.random() * (max - min);
    h += `<i class="${cls}" style="--dx:${(Math.cos(a) * dist).toFixed(2)}em;--dy:${(Math.sin(a) * dist).toFixed(2)}em;--d:${(Math.random() * 0.12).toFixed(2)}s"></i>`;
  }
  return h;
}
async function fxBall(board, r, c) {
  const d = fxAt(board, r, c, 'ball', '<i></i>');
  Sound.whistle();
  await wait(520);
  d.remove();
}
function fxBoom(board, r, c) {
  const d = fxAt(board, r, c, 'boom', '<span class="flash"></span>' + burst(14, 'spark', 0.9, 1.8) + burst(6, 'smoke-p', 0.4, 0.9));
  setTimeout(() => d.remove(), 1200);
  const wrap = board.parentElement;
  wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
}
function fxSplash(board, r, c) {
  const d = fxAt(board, r, c, 'splash', '<span class="ring"></span><span class="ring r2"></span>' + burst(10, 'drop', 0.5, 1.1));
  setTimeout(() => d.remove(), 1100);
}
let calloutTimer = 0;
function callout(text, cls = '') {
  const el = $('#callout');
  el.className = 'callout'; void el.offsetWidth;
  el.innerHTML = text;
  el.className = 'callout show ' + cls;
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(() => el.className = 'callout', 1300);
}

/* ---------------- game flow ---------------- */
function newPlayer(i, robot) {
  return {
    name: robot ? 'Robot' : (settings.names[i] || TEAMS[i].key).trim() || `Player ${i + 1}`,
    team: TEAMS[i].key, avatar: robot ? '🤖' : TEAMS[i].avatar, robot,
    ships: [], board: null, shots: 0, hits: 0,
  };
}
const cur = () => G.players[G.turn];
const opp = () => G.players[1 - G.turn];

function startGame() {
  const sea = SEAS[settings.sea];
  G = { n: sea.n, fleet: sea.fleet, mode: settings.mode, extra: settings.extra, turn: 0, busy: false,
        players: [newPlayer(0, false), newPlayer(1, settings.mode === 'robot')] };
  for (const p of G.players) { p.board = emptyGrid(G.n); p.ships = randomFleet(G.n, G.fleet); }
  showSetup(0);
}

function showSetup(i) {
  G.setupIdx = i;
  const p = G.players[i];
  document.body.dataset.team = p.team;
  $('#setupTitle').innerHTML = `<span class="av">${p.avatar}</span> ${esc(p.name)}, hide your ships!`;
  renderBoard($('#setupBoard'), p, 'setup', { pop: true });
  show('setup');
}

function showPass(i, then) {
  const p = G.players[i];
  document.body.dataset.team = p.team;
  $('#passAvatar').textContent = p.avatar;
  $('#passName').textContent = p.name;
  G.afterPass = then;
  show('pass');
}

function beginBattle() {
  G.turn = 0; G.busy = false;
  renderBattle();
  show('battle');
  setTimeout(() => callout('Ready... FIRE! 🎯'), 300);
}

function renderBattle() {
  const A = cur(), D = opp();
  document.body.dataset.team = A.team;
  $('#passBtn').classList.add('hidden');
  if (A.robot) {
    $('#turnText').innerHTML = `<span class="av">🤖</span> Robot's turn`;
    $('#bigLabel').textContent = `🛡️ Your ships`;
    renderBoard($('#bigBoard'), D, 'own');
    $('#miniLabel').textContent = `Robot's sea`;
    renderBoard($('#miniBoard'), A, 'target');
    renderTracker(A);
  } else {
    $('#turnText').innerHTML = `<span class="av">${A.avatar}</span> ${esc(A.name)}'s turn`;
    $('#bigLabel').textContent = `🎯 Tap ${D.robot ? "Robot's" : esc(D.name) + "'s"} sea to fire!`;
    renderBoard($('#bigBoard'), D, 'target');
    $('#miniLabel').textContent = `Your ships`;
    renderBoard($('#miniBoard'), A, 'own');
    renderTracker(D);
  }
  const wrap = $('#bigWrap');
  wrap.classList.remove('swap'); void wrap.offsetWidth; wrap.classList.add('swap');
}

async function shoot(r, c) {
  const g = G, A = cur(), D = opp(), big = $('#bigBoard');
  const view = A.robot ? 'own' : 'target';
  await fxBall(big, r, c);
  if (G !== g) return null;
  const res = fire(D, r, c);
  A.shots++;
  renderBoard(big, D, view, { newCell: [r, c], reveal: res.kind === 'sunk' ? res.ship : null });
  if (res.kind === 'miss') {
    fxSplash(big, r, c);
    Sound.splash();
    callout(A.robot ? 'Splash! Robot missed!' : `Splash! <span class="em">${res.e}</span>`, 'miss');
    await wait(1100);
  } else {
    A.hits++;
    fxBoom(big, r, c);
    Sound.boom();
    navigator.vibrate?.(120);
    callout(res.kind === 'sunk' ? 'SUNK! 💥' : 'HIT! 💥', 'hit');
    if (!A.robot) renderTracker(D);
    await wait(res.kind === 'sunk' ? 900 : 1100);
    if (res.kind === 'sunk') await sunkBanner(res.ship, A);
  }
  return G === g ? res : null;
}

async function afterShot(res) {
  if (!res || !G) return;
  const A = cur(), D = opp();
  if (D.ships.every(s => s.sunk)) { await wait(300); return showWin(); }
  if (res.kind !== 'miss' && G.extra) {
    if (A.robot) { await wait(300); return robotShot(); }
    callout('Shoot again! 🎯', 'again');
    G.busy = false;
    return;
  }
  endTurn();
}

async function endTurn() {
  if (G.mode === 'robot') {
    const g = G;
    await wait(200);
    if (G !== g) return;
    G.turn = 1 - G.turn;
    renderBattle();
    if (cur().robot) robotShot();
    else { G.busy = false; setTimeout(() => callout('Your turn! 🎯'), 250); }
    return;
  }
  const next = opp();
  const btn = $('#passBtn');
  btn.innerHTML = `Pass to ${next.avatar} ${esc(next.name)} ➜`;
  btn.classList.remove('hidden');
}

async function robotShot() {
  const g = G;
  G.busy = true;
  $('#turnText').innerHTML = `<span class="av">🤖</span> Robot is aiming…`;
  await wait(600);
  if (G !== g) return;
  const D = opp(), big = $('#bigBoard'), n = G.n;
  const [r, c] = robotPick(D);
  const cross = fxAt(big, rand(n), rand(n), 'cross', '<span></span>');
  for (let i = 0; i < 2; i++) { await wait(380); moveFx(cross, rand(n), rand(n)); Sound.tick(); }
  await wait(380); moveFx(cross, r, c); Sound.tick();
  await wait(550);
  cross.remove();
  if (G !== g) return;
  const res = await shoot(r, c);
  afterShot(res);
}

// Friendly robot: follows up on hits most of the time, otherwise guesses.
function robotPick(D) {
  const n = G.n, B = D.board;
  const free = (r, c) => r >= 0 && c >= 0 && r < n && c < n && !B[r][c];
  const open = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (B[r][c]?.t === 'hit' && !shipAt(D, r, c).sunk) open.push([r, c]);
  let cand = [];
  if (open.length && Math.random() < 0.7) {
    if (open.length > 1) {
      if (open.every(([r]) => r === open[0][0])) {
        const cs = open.map(x => x[1]), r = open[0][0];
        cand = [[r, Math.min(...cs) - 1], [r, Math.max(...cs) + 1]];
      } else if (open.every(([, c]) => c === open[0][1])) {
        const rs = open.map(x => x[0]), c = open[0][1];
        cand = [[Math.min(...rs) - 1, c], [Math.max(...rs) + 1, c]];
      }
      cand = cand.filter(([a, b]) => free(a, b));
    }
    if (!cand.length) for (const [r, c] of open)
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (free(r + dr, c + dc)) cand.push([r + dr, c + dc]);
  }
  if (!cand.length) for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (free(r, c)) cand.push([r, c]);
  return pick(cand);
}

function sunkBanner(ship, A) {
  const name = SHIPS[ship.type].name;
  const text = A.robot ? `Robot sank your ${name}!`
    : G.mode === 'robot' ? `You sank the ${name}!` : `${esc(A.name)} sank the ${name}!`;
  const el = $('#banner');
  $('.banner-inner', el).innerHTML = `
    <div class="banner-sea"><div class="banner-ship" style="--len:${ship.len}">${topShip(ship.type, ship.len, 'h')}</div>${burst(8, 'bub', 0.6, 1.4)}</div>
    <h2>${text}</h2>`;
  el.classList.add('show');
  Sound.sunk();
  return new Promise(res => {
    const done = () => { el.classList.remove('show'); el.onclick = null; clearTimeout(t); res(); };
    const t = setTimeout(done, 2300);
    setTimeout(() => el.onclick = done, 600);
  });
}

function showWin() {
  const W = cur();
  const robotWon = W.robot;
  $('#winIcon').textContent = robotWon ? '🤖' : '🏆';
  $('#winText').textContent = robotWon ? 'Robot wins this time!' : `${W.name} wins!`;
  $('#winStats').textContent = robotWon ? 'So close! Try again, Captain!' : `🎯 ${W.shots} shots   💥 ${W.hits} hits`;
  $('#winShip').innerHTML = heroShip();
  document.body.dataset.team = W.team;
  show('win');
  if (robotWon) Sound.sad();
  else { Sound.fanfare(); confetti(); }
}

function confetti() {
  const box = $('#confetti');
  const colors = ['#ff4d6d', '#ffd23f', '#3bceac', '#4d9bff', '#ff8c42', '#b56cff', '#fff'];
  box.innerHTML = Array.from({ length: 90 }, () => {
    const s = 6 + Math.random() * 10;
    return `<i style="left:${Math.random() * 100}%;width:${s}px;height:${s * 1.6}px;background:${pick(colors)};animation-delay:${(Math.random() * 1.2).toFixed(2)}s;animation-duration:${(2.4 + Math.random() * 2).toFixed(2)}s;--rot:${rand(720) - 360}deg;--sway:${rand(120) - 60}px"></i>`;
  }).join('');
  setTimeout(() => box.innerHTML = '', 5000);
}

function esc(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }

/* ---------------- setup: drag & rotate ---------------- */
let drag = null;
function cellFromPoint(board, e) {
  const rect = $('.cells', board).getBoundingClientRect();
  const n = G.n;
  const c = Math.floor((e.clientX - rect.left) / rect.width * n);
  const r = Math.floor((e.clientY - rect.top) / rect.height * n);
  return { r: Math.max(0, Math.min(n - 1, r)), c: Math.max(0, Math.min(n - 1, c)), inside: r >= 0 && c >= 0 && r < n && c < n };
}
function setupDown(e) {
  if (!G || G.setupIdx == null) return;
  const board = $('#setupBoard'), p = G.players[G.setupIdx];
  const { r, c, inside } = cellFromPoint(board, e);
  if (!inside) return;
  const s = shipAt(p, r, c);
  if (!s) return;
  e.preventDefault();
  board.setPointerCapture?.(e.pointerId);
  const el = $(`.ship[data-i="${p.ships.indexOf(s)}"]`, board);
  el.classList.remove('pop');
  el.classList.add('lifted');
  drag = { s, p, el, idx: s.dir === 'h' ? c - s.c : r - s.r, r0: r, c0: c, moved: false, nr: s.r, nc: s.c, ok: true };
  Sound.tap();
}
function setupMove(e) {
  if (!drag) return;
  const { s, p, el, idx } = drag, n = G.n;
  const { r, c } = cellFromPoint($('#setupBoard'), e);
  if (r !== drag.r0 || c !== drag.c0) drag.moved = true;
  if (!drag.moved) return;
  let nr = s.dir === 'h' ? r : r - idx, nc = s.dir === 'h' ? c - idx : c;
  nr = Math.max(0, Math.min(n - (s.dir === 'v' ? s.len : 1), nr));
  nc = Math.max(0, Math.min(n - (s.dir === 'h' ? s.len : 1), nc));
  if (nr !== drag.nr || nc !== drag.nc) Sound.tick();
  drag.nr = nr; drag.nc = nc;
  drag.ok = fits({ ...s, r: nr, c: nc }, p.ships.filter(o => o !== s), n, false);
  el.style.left = nc / n * 100 + '%';
  el.style.top = nr / n * 100 + '%';
  el.classList.toggle('bad', !drag.ok);
}
function setupUp() {
  if (!drag) return;
  const { s, p, moved, ok, nr, nc } = drag, n = G.n;
  drag = null;
  let wiggle = false;
  if (!moved) {
    const nd = s.dir === 'h' ? 'v' : 'h';
    if (fits({ ...s, dir: nd }, p.ships.filter(o => o !== s), n, false)) { s.dir = nd; Sound.rotate(); }
    else { Sound.wrong(); wiggle = true; }
  } else if (ok) { s.r = nr; s.c = nc; Sound.place(); }
  else { Sound.wrong(); wiggle = true; }
  renderBoard($('#setupBoard'), p, 'setup');
  if (wiggle) $(`.ship[data-i="${p.ships.indexOf(s)}"]`, $('#setupBoard')).classList.add('wiggle');
}

/* ---------------- mode screen ---------------- */
function renderMode() {
  $$('.card').forEach(b => b.classList.toggle('on', b.dataset.mode === settings.mode));
  $$('#seaSeg button').forEach(b => b.classList.toggle('on', b.dataset.sea === settings.sea));
  $('#extraToggle').classList.toggle('on', settings.extra);
  $('#name0').value = settings.names[0];
  $('#name1').value = settings.names[1];
  $('#name1wrap').classList.toggle('hidden', settings.mode !== 'friend');
}

function updateSoundBtns() { $$('.sound-btn').forEach(b => b.textContent = settings.sound ? '🔊' : '🔇'); }

/* ---------------- background bubbles ---------------- */
function makeBubbles() {
  $('#bubbles').innerHTML = Array.from({ length: 18 }, () => {
    const s = 6 + Math.random() * 22;
    return `<i style="left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${(7 + Math.random() * 9).toFixed(1)}s;animation-delay:-${(Math.random() * 12).toFixed(1)}s"></i>`;
  }).join('');
}

/* ---------------- wiring ---------------- */
function init() {
  Sound.on = settings.sound;
  updateSoundBtns();
  makeBubbles();
  $('#heroShip').innerHTML = heroShip();

  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
  document.addEventListener('click', e => {
    if (e.target.closest('button') && !e.target.closest('.board')) Sound.tap();
  });

  $$('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
  $('#playBtn').addEventListener('click', () => { renderMode(); show('mode'); });
  $$('.sound-btn').forEach(b => b.addEventListener('click', () => {
    settings.sound = !settings.sound; Sound.on = settings.sound; saveSettings(); updateSoundBtns();
  }));

  $$('.card').forEach(b => b.addEventListener('click', () => { settings.mode = b.dataset.mode; saveSettings(); renderMode(); }));
  $$('#seaSeg button').forEach(b => b.addEventListener('click', () => { settings.sea = b.dataset.sea; saveSettings(); renderMode(); }));
  $('#extraToggle').addEventListener('click', () => { settings.extra = !settings.extra; saveSettings(); renderMode(); });
  [0, 1].forEach(i => $('#name' + i).addEventListener('input', e => { settings.names[i] = e.target.value; saveSettings(); }));
  $('#startBtn').addEventListener('click', startGame);

  const sb = $('#setupBoard');
  sb.addEventListener('pointerdown', setupDown);
  sb.addEventListener('pointermove', setupMove);
  sb.addEventListener('pointerup', setupUp);
  sb.addEventListener('pointercancel', setupUp);
  $('#shuffleBtn').addEventListener('click', () => {
    const p = G.players[G.setupIdx];
    p.ships = randomFleet(G.n, G.fleet);
    renderBoard(sb, p, 'setup', { pop: true });
    Sound.shuffle();
  });
  $('#readyBtn').addEventListener('click', () => {
    const i = G.setupIdx;
    G.setupIdx = null;
    if (G.mode === 'robot') return beginBattle();
    if (i === 0) showPass(1, () => showSetup(1));
    else showPass(0, beginBattle);
  });
  $('#passGo').addEventListener('click', () => G.afterPass && G.afterPass());

  $('#bigBoard').addEventListener('click', async e => {
    const cell = e.target.closest('.cell');
    if (!cell || !G || G.busy || cur().robot) return;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (opp().board[r][c]) { Sound.wrong(); return; }
    G.busy = true;
    const res = await shoot(r, c);
    afterShot(res);
  });
  $('#passBtn').addEventListener('click', () => {
    $('#passBtn').classList.add('hidden');
    const next = 1 - G.turn;
    showPass(next, () => { G.turn = next; renderBattle(); show('battle'); G.busy = false; });
  });

  $('#againBtn').addEventListener('click', startGame);
  $$('.quit-btn').forEach(b => b.addEventListener('click', () => $('#quitModal').classList.add('show')));
  $('#quitNo').addEventListener('click', () => $('#quitModal').classList.remove('show'));
  $('#quitYes').addEventListener('click', () => {
    $('#quitModal').classList.remove('show');
    if (G) { G.busy = true; G.setupIdx = null; }
    G = null;
    document.body.dataset.team = 'blue';
    show('title');
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
}
init();
