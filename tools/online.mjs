// Two browser pages play a full 2-phone game over the real PeerJS broker: node tools/online.mjs <outdir>
import { chromium } from '/Users/sitinazmimiaisyahamran/Me/apps/belajar-ceria/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
const dir = fileURLToPath(new URL('..', import.meta.url)), out = process.argv[2];
const srv = spawn('python3', ['-m', 'http.server', '4180'], { cwd: dir, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch();
const errs = [];
const mk = async (name) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
  await p.goto('http://localhost:4180/');
  await p.click('#playBtn', { force: true });
  await p.click('[data-mode="online"]', { force: true });
  await p.fill('#name0', name);
  await p.click('#startBtn', { force: true });
  return p;
};
const host = await mk('Ayah'), guest = await mk('Adik');
const f = { force: true };
await host.click('#hostBtn', f);
await host.waitForFunction(() => document.querySelectorAll('#hostCode span.on').length === 4, null, { timeout: 20000 });
const code = await host.evaluate(() => [...document.querySelectorAll('#hostCode span')].map(s => s.textContent).join(''));
console.log('code', code); await host.waitForTimeout(500);
await host.screenshot({ path: `${out}/o1-host-code.png` });
await guest.click('#joinBtn', f);
for (const d of code.slice(0, 3)) await guest.click(`#pad button[data-k="${d}"]`, f);
await guest.waitForTimeout(500); await guest.screenshot({ path: `${out}/o2-join-pad.png` });
await guest.click(`#pad button[data-k="${code[3]}"]`, f);
await host.waitForSelector('#setup.active', { timeout: 20000 });
await guest.waitForSelector('#setup.active', { timeout: 20000 });
console.log('both in setup');
await host.click('#readyBtn', f);
await host.waitForTimeout(400); await host.screenshot({ path: `${out}/o3-waiting.png` });
await guest.click('#readyBtn', f);
await host.waitForSelector('#battle.active'); await guest.waitForSelector('#battle.active');
await host.waitForTimeout(500);
console.log('host turn text:', await host.textContent('#turnText'), '| guest:', await guest.textContent('#turnText'));
// host misses once, so guest gets a turn
const gShips = await guest.evaluate(() => G.players[0].ships.map(s => cellsOf(s)));
const occupied = new Set(gShips.flat().map(([r, c]) => r + ',' + c));
let miss; for (let r = 0; r < 6 && !miss; r++) for (let c = 0; c < 6; c++) if (!occupied.has(r + ',' + c)) { miss = [r, c]; break; }
const shot = async (p, [r, c]) => { await p.waitForFunction(() => G && !G.busy && !cur().remote, null, { timeout: 20000 }); await p.click(`#bigBoard .cell[data-r="${r}"][data-c="${c}"]`, f); };
await shot(host, miss);
await guest.waitForTimeout(900); await guest.screenshot({ path: `${out}/o4-guest-sees-miss.png` });
// guest takes one shot (a miss on host if possible)
const hShips = await host.evaluate(() => G.players[0].ships.map(s => cellsOf(s)));
const hOcc = new Set(hShips.flat().map(([r, c]) => r + ',' + c));
let gm; for (let r = 5; r >= 0 && !gm; r--) for (let c = 5; c >= 0; c--) if (!hOcc.has(r + ',' + c)) { gm = [r, c]; break; }
await shot(guest, gm);
await host.waitForTimeout(900); await host.screenshot({ path: `${out}/o5-host-sees-guest-shot.png` });
// host sinks everything (extra shot on)
for (const cell of gShips.flat()) await shot(host, cell);
await host.waitForSelector('#win.active', { timeout: 30000 });
await guest.waitForSelector('#win.active', { timeout: 30000 });
await host.waitForTimeout(800);
console.log('host win:', await host.textContent('#winText'), '| guest win:', await guest.textContent('#winText'));
console.log('guest sees host fleet sunk:', await guest.evaluate(() => G.players[1].ships.every(s => s.sunk)), 'host knows guest fleet:', await host.evaluate(() => G.players[1].ships.map(s => [s.type, s.r, s.c, s.dir].join(':')).join(' ')));
await host.screenshot({ path: `${out}/o6-host-win.png` }); await guest.screenshot({ path: `${out}/o7-guest-lose.png` });
// rematch then guest quits
await host.click('#againBtn', f); await guest.click('#againBtn', f);
await host.waitForSelector('#setup.active'); await guest.waitForSelector('#setup.active');
await guest.click('#setup .quit-btn', f); await guest.click('#quitYes', f);
await host.waitForSelector('#msgModal.show', { timeout: 10000 });
console.log('host told:', await host.textContent('#msgText'));
await host.screenshot({ path: `${out}/o8-left.png` });
console.log(errs.length ? errs : 'no page errors');
await b.close(); srv.kill();
