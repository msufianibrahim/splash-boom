'use strict';
// "2 Phones" mode: two devices connected peer-to-peer (WebRTC via the free PeerJS broker).
// Each phone only knows its own fleet; shots and results are sent as messages.

const PEER_PREFIX = 'splashboom-';

const Net = {
  peer: null, conn: null, host: false, closing: false,
  queue: [], waiters: [],
  oppName: '', sea: 'small', extra: true,
  send(m) { try { if (this.conn && this.conn.open) this.conn.send(m); } catch { /* ignore */ } },
  // Resolve with the next message of type t (buffered if it already arrived).
  next(t) {
    const i = this.queue.findIndex(m => m.t === t);
    if (i >= 0) return Promise.resolve(this.queue.splice(i, 1)[0]);
    return new Promise((res, rej) => this.waiters.push({ t, res, rej }));
  },
  deliver(m) {
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    if (m.t === 'bye') return onPeerLost();
    const i = this.waiters.findIndex(w => w.t === m.t);
    if (i >= 0) this.waiters.splice(i, 1)[0].res(m);
    else this.queue.push(m);
  },
  close() {
    this.closing = true;
    try { this.conn && this.conn.close(); } catch { /* ignore */ }
    try { this.peer && this.peer.destroy(); } catch { /* ignore */ }
    this.peer = this.conn = null;
    this.queue = [];
    this.waiters.forEach(w => w.rej(new Error('closed')));
    this.waiters = [];
  },
};

const myName = () => (settings.names[0] || '').trim() || (Net.host ? 'Shark' : 'Octopus');
const okCell = m => Number.isInteger(m.r) && Number.isInteger(m.c) && m.r >= 0 && m.c >= 0 && m.r < G.n && m.c < G.n;

/* ---------- message popup ---------- */
function showMsg(text, btn, onBtn) {
  $('#msgText').innerHTML = text;
  const b = $('#msgBtn');
  b.classList.toggle('hidden', !btn);
  b.textContent = btn || '';
  b.onclick = () => { hideMsg(); onBtn && onBtn(); };
  $('#msgModal').classList.add('show');
}
function hideMsg() { $('#msgModal').classList.remove('show'); }

/* ---------- lobby ---------- */
function lobbyStep(id) {
  $$('.lobby-step').forEach(s => s.classList.toggle('hidden', s.id !== id));
}
function openLobby() {
  leaveOnline();
  lobbyStep('lobbyChoose');
  show('online');
}
function setCode(el, digits) {
  const spans = el.children.length === 4 ? [...el.children] : null;
  if (!spans) el.innerHTML = '<span></span>'.repeat(4);
  [...el.children].forEach((s, i) => {
    const d = digits[i] || '';
    if (s.textContent !== d) { s.textContent = d; s.className = d ? 'on' : ''; }
  });
}

function hostGame(attempt = 0) {
  Net.close(); Net.closing = false; Net.host = true;
  lobbyStep('lobbyHost');
  setCode($('#hostCode'), '');
  $('#hostStatus').textContent = 'Getting a code…';
  $('#hostStatus').classList.remove('err');
  const code = String(1000 + rand(9000));
  const peer = new Peer(PEER_PREFIX + code);
  Net.peer = peer;
  peer.on('open', () => {
    setCode($('#hostCode'), code);
    $('#hostStatus').textContent = 'Waiting for friend';
    $('#hostStatus').classList.add('waiting');
  });
  peer.on('connection', conn => {
    if (Net.conn) { conn.close(); return; }
    wireConn(conn);
    conn.on('open', async () => {
      try {
        const m = await Net.next('hello');
        Net.oppName = String(m.name || 'Friend').slice(0, 14);
        Net.sea = settings.sea; Net.extra = settings.extra;
        Net.send({ t: 'welcome', name: myName(), sea: Net.sea, extra: Net.extra });
        Sound.fanfare();
        startOnlineRound();
      } catch { /* closed */ }
    });
  });
  peer.on('error', err => {
    if (Net.conn && Net.conn.open) return;
    if (err.type === 'unavailable-id' && attempt < 5) return hostGame(attempt + 1);
    $('#hostStatus').classList.remove('waiting');
    $('#hostStatus').classList.add('err');
    $('#hostStatus').textContent = 'No internet? Try again.';
  });
}

let joinDigits = '';
function startJoin() {
  Net.close();
  joinDigits = '';
  lobbyStep('lobbyJoin');
  setCode($('#joinCode'), '');
  $('#joinStatus').textContent = '';
  $('#pad').classList.remove('busy');
}
function padPress(k) {
  if ($('#pad').classList.contains('busy')) return;
  if (k === '⌫') joinDigits = joinDigits.slice(0, -1);
  else if (joinDigits.length < 4) joinDigits += k;
  setCode($('#joinCode'), joinDigits);
  $('#joinStatus').textContent = '';
  if (joinDigits.length === 4) joinGame(joinDigits);
}
function joinFail(text) {
  Net.close();
  $('#pad').classList.remove('busy');
  $('#joinStatus').textContent = text;
  $('#joinStatus').classList.add('err');
  $('#joinStatus').classList.remove('waiting');
  const code = $('#joinCode');
  code.classList.remove('shake'); void code.offsetWidth; code.classList.add('shake');
  Sound.wrong();
  joinDigits = '';
  setTimeout(() => setCode(code, ''), 500);
}
function joinGame(code) {
  Net.close(); Net.closing = false; Net.host = false;
  $('#pad').classList.add('busy');
  $('#joinStatus').textContent = 'Connecting';
  $('#joinStatus').classList.remove('err');
  $('#joinStatus').classList.add('waiting');
  const peer = new Peer();
  Net.peer = peer;
  const timer = setTimeout(() => { if (!(Net.conn && Net.conn.open) && Net.peer === peer) joinFail("Can't connect. Try again."); }, 15000);
  peer.on('open', () => {
    const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
    wireConn(conn);
    conn.on('open', async () => {
      clearTimeout(timer);
      Net.send({ t: 'hello', name: myName() });
      try {
        const m = await Net.next('welcome');
        Net.oppName = String(m.name || 'Friend').slice(0, 14);
        Net.sea = SEAS[m.sea] ? m.sea : 'small';
        Net.extra = !!m.extra;
        Sound.fanfare();
        startOnlineRound();
      } catch { /* closed */ }
    });
  });
  peer.on('error', err => {
    if (Net.conn && Net.conn.open) return;
    clearTimeout(timer);
    joinFail(err.type === 'peer-unavailable' ? 'No game with that code' : "Can't connect. Try again.");
  });
}

function wireConn(conn) {
  Net.conn = conn;
  conn.on('data', m => Net.deliver(m));
  conn.on('close', () => { if (Net.conn === conn) onPeerLost(); });
}

function onPeerLost() {
  if (Net.closing) return;
  const name = Net.oppName || 'Your friend';
  Net.close();
  if (G) G.busy = true;
  G = null;
  showMsg(`${esc(name)} left the game 👋`, 'OK', () => { document.body.dataset.team = 'blue'; show('title'); });
}

function leaveOnline() {
  hideMsg();
  if (!Net.peer && !Net.conn) return;
  Net.send({ t: 'bye' });
  const { peer, conn } = Net;
  Net.peer = Net.conn = null;
  Net.closing = true;
  Net.queue = [];
  Net.waiters.forEach(w => w.rej(new Error('closed')));
  Net.waiters = [];
  // give the goodbye message a moment to go out
  setTimeout(() => {
    try { conn && conn.close(); } catch { /* ignore */ }
    try { peer && peer.destroy(); } catch { /* ignore */ }
  }, 150);
}

/* ---------- online rounds ---------- */
function startOnlineRound() {
  const sea = SEAS[Net.sea];
  const base = { shots: 0, hits: 0, robot: false };
  const me = { ...base, name: myName(), team: Net.host ? 'blue' : 'red', avatar: Net.host ? '🦈' : '🐙', remote: false };
  const them = { ...base, name: Net.oppName, team: Net.host ? 'red' : 'blue', avatar: Net.host ? '🐙' : '🦈', remote: true };
  G = { n: sea.n, fleet: sea.fleet, mode: 'online', extra: Net.extra, turn: 0, busy: false,
        first: Net.host ? 0 : 1, players: [me, them] };
  me.board = emptyGrid(G.n); me.ships = randomFleet(G.n, G.fleet);
  them.board = emptyGrid(G.n);
  them.ships = G.fleet.map(type => ({ type, len: SHIPS[type].len, r: -1, c: -1, dir: 'h', hits: 0, sunk: false }));
  hideMsg();
  showSetup(0);
}

async function onlineReady() {
  const g = G;
  Net.send({ t: 'ready' });
  showMsg(`Waiting for ${esc(Net.oppName)} to hide ships… ⏳`, 'Stop', () => {
    G = null; leaveOnline(); document.body.dataset.team = 'blue'; show('title');
  });
  try { await Net.next('ready'); } catch { return; }
  if (G !== g) return;
  hideMsg();
  beginBattle();
}

// Our shot at the other phone: send it, wait for their answer.
async function remoteFire(r, c) {
  Net.send({ t: 'shot', r, c });
  const m = await Net.next('result');
  const D = opp();
  if (m.kind === 'miss') {
    const e = CREATURES.includes(m.e) ? m.e : '🐟';
    D.board[r][c] = { t: 'miss', e };
    return { kind: 'miss', e };
  }
  D.board[r][c] = { t: 'hit' };
  if (m.kind === 'sunk' && m.ship) {
    const s = D.ships.find(x => x.type === m.ship.type && !x.sunk) || D.ships.find(x => !x.sunk);
    Object.assign(s, { r: m.ship.r, c: m.ship.c, dir: m.ship.dir === 'v' ? 'v' : 'h', sunk: true, hits: s.len });
    return { kind: 'sunk', ship: s };
  }
  return { kind: 'hit' };
}

// The other phone's turn: wait for their shot, then play it out on our fleet.
async function remoteTurn() {
  const g = G;
  G.busy = true;
  const A = cur();
  $('#turnText').innerHTML = `<span class="av">${A.avatar}</span> ${esc(A.name)} is aiming…`;
  let m;
  do {
    try { m = await Net.next('shot'); } catch { return; }
  } while (G === g && (!okCell(m) || opp().board[m.r][m.c]));
  if (G !== g) return;
  const cross = fxAt($('#bigBoard'), m.r, m.c, 'cross', '<span></span>');
  Sound.tick();
  await wait(450);
  cross.remove();
  const res = await shoot(m.r, m.c);
  afterShot(res);
}

function initOnline() {
  $('#pad').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
    .map(k => k ? `<button data-k="${k}">${k}</button>` : '<span></span>').join('');
  $('#pad').addEventListener('click', e => { const b = e.target.closest('button'); if (b) padPress(b.dataset.k); });
  $('#hostBtn').addEventListener('click', () => hostGame());
  $('#joinBtn').addEventListener('click', startJoin);
  $('#onlineBack').addEventListener('click', () => {
    if (!$('#lobbyChoose').classList.contains('hidden')) { leaveOnline(); show('mode'); }
    else { leaveOnline(); lobbyStep('lobbyChoose'); }
  });
}

init();
