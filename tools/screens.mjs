// Drives the game and saves screenshots: node tools/screens.mjs <outdir> [w h]
import { chromium } from '/Users/sitinazmimiaisyahamran/Me/apps/belajar-ceria/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'url';
const dir = fileURLToPath(new URL('..', import.meta.url));
const out = process.argv[2], W = +(process.argv[3] || 820), H = +(process.argv[4] || 1180);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('file://' + dir + 'index.html');
await p.waitForTimeout(800); await p.screenshot({ path: `${out}/1-title.png` });
await p.click('#playBtn', { force: true }); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/2-mode.png` });
await p.click('#startBtn', { force: true }); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/3-setup.png` });
await p.click('#readyBtn', { force: true }); await p.waitForTimeout(700);
// fire a few shots; aim at a ship cell for a hit
const shipCell = await p.evaluate(() => { const s = G.players[1].ships[2]; return [s.r, s.c]; });
const click = async (r, c) => { await p.click(`#bigBoard .cell[data-r="${r}"][data-c="${c}"]`, { force: true }); };
await click(...shipCell); await p.waitForTimeout(700); await p.screenshot({ path: `${out}/4-hit.png` });
await p.waitForTimeout(1500);
const sub = await p.evaluate(() => { const s = G.players[1].ships[2]; return s.dir === 'h' ? [s.r, s.c + 1] : [s.r + 1, s.c]; });
await click(...sub); await p.waitForTimeout(1900); await p.screenshot({ path: `${out}/5-sunk.png` });
await p.waitForTimeout(2600);
const miss = await p.evaluate(() => { for (let r = 0; r < G.n; r++) for (let c = 0; c < G.n; c++) if (!shipAt(G.players[1], r, c) && !G.players[1].board[r][c]) return [r, c]; });
await click(...miss); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/6-miss.png` });
await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/7-robot.png` });
// let the robot finish, then force a win
await p.waitForFunction(() => G && !G.busy, null, { timeout: 30000 });
await p.evaluate(() => { G.turn = 0; showWin(); });
await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/8-win.png` });
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
await b.close();
