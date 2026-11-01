// usage: node tools/shoot.mjs  -> regenerates icons
import { chromium } from '/Users/sitinazmimiaisyahamran/Me/apps/belajar-ceria/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'url';
const dir = fileURLToPath(new URL('..', import.meta.url));
const b = await chromium.launch();
for (const s of [512, 192, 180]) {
  const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: s / 512 });
  await p.goto('file://' + dir + 'tools/icon.html');
  await p.screenshot({ path: `${dir}icons/icon-${s}.png` });
}
await b.close();
