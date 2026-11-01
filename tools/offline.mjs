// Checks the service worker: page still loads offline after one online visit.
import { chromium } from '/Users/sitinazmimiaisyahamran/Me/apps/belajar-ceria/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
const dir = fileURLToPath(new URL('..', import.meta.url));
const srv = spawn('python3', ['-m', 'http.server', '4181'], { cwd: dir, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
await p.goto('http://localhost:4181/');
await p.evaluate(() => navigator.serviceWorker.ready);
await p.waitForTimeout(1000);
await ctx.setOffline(true);
await p.reload();
console.log('offline load ok:', await p.isVisible('#playBtn'), '| hero ship:', await p.evaluate(() => !!document.querySelector('#heroShip svg')));
await b.close(); srv.kill();
