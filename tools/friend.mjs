import { chromium } from '/Users/sitinazmimiaisyahamran/Me/apps/belajar-ceria/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'url';
const dir = fileURLToPath(new URL('..', import.meta.url)), out = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 820, height: 1180 }, hasTouch: false });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + dir + 'index.html');
const f = { force: true };
await p.click('#playBtn', f); await p.click('[data-mode="friend"]', f); await p.click('[data-sea="big"]', f);
await p.click('#startBtn', f); await p.waitForTimeout(800);
// drag ship 0 one cell
const before = await p.evaluate(() => { const s = G.players[0].ships[0]; return { ...s }; });
const box = await p.locator('#setupBoard .cells').boundingBox(); const cs = box.width / 8;
const cx = c => box.x + (c + .5) * cs, cy = r => box.y + (r + .5) * cs;
// find a free spot by trying target cells
const target = await p.evaluate(() => { const p = G.players[0], s = p.ships[0];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const t = { ...s, r, c }; if ((r !== s.r || c !== s.c) && fits(t, p.ships.filter(o => o !== s), 8, false)) return [r, c]; } });
await p.mouse.move(cx(before.c), cy(before.r)); await p.mouse.down();
await p.mouse.move(cx(target[1]), cy(target[0]), { steps: 8 }); await p.mouse.up();
const after = await p.evaluate(() => { const s = G.players[0].ships[0]; return [s.r, s.c, s.dir]; });
console.log('drag', [before.r, before.c], '->', after, 'expected', target);
// tap to rotate
const d0 = after[2];
await p.mouse.click(cx(after[1]), cy(after[0]));
console.log('rotate', d0, '->', await p.evaluate(() => G.players[0].ships[0].dir));
await p.screenshot({ path: `${out}/f1-setup-big.png` });
await p.click('#readyBtn', f); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/f2-pass.png` });
await p.click('#passGo', f); await p.waitForTimeout(300); await p.click('#readyBtn', f); await p.click('#passGo', f); await p.waitForTimeout(500);
const miss = await p.evaluate(() => { for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (!shipAt(G.players[1], r, c)) return [r, c]; });
await p.click(`#bigBoard .cell[data-r="${miss[0]}"][data-c="${miss[1]}"]`, f); await p.waitForTimeout(2000);
await p.screenshot({ path: `${out}/f3-passbtn.png` });
await p.click('#passBtn', f); await p.waitForTimeout(300); await p.click('#passGo', f); await p.waitForTimeout(500);
console.log('turn now', await p.evaluate(() => G.turn), await p.textContent('#turnText'));
await p.screenshot({ path: `${out}/f4-red.png` });
console.log(errs.length ? errs : 'no errors'); await b.close();
