/* Draws the app icon (the station sign: "Above" over an Amber line, "the Line" under it) and writes every size phones ask for into icons/.
   Colors are DESIGN.md tokens: Sign Black, Sign Rule, Amber. Text is Inter 800 and 700, so run it on a machine with Inter installed.
   Run from the repo root: node tools/make_icons.js   (needs Playwright's Chromium) */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");

const SIGN = "#111", RULE = "#ffffff", AMBER = "#f5b84a";

/* scale shrinks the sign's contents around the center (maskable icons keep them inside the middle 80%); the black field and top rule stay full-bleed */
function svg(size, scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
<rect width="1024" height="1024" fill="${SIGN}"/>
<rect y="118" width="1024" height="22" fill="${RULE}"/>
<g transform="translate(512 512) scale(${scale}) translate(-512 -512)" font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" fill="${RULE}">
  <text x="512" y="548" text-anchor="middle" font-weight="800" font-size="276" letter-spacing="-9">Above</text>
  <rect x="92" y="600" width="840" height="48" rx="24" fill="${AMBER}"/>
  <text x="512" y="820" text-anchor="middle" font-weight="700" font-size="150" letter-spacing="-3">the Line</text>
</g>
</svg>`;
}

(async () => {
  const dir = path.join(process.cwd(), "icons"); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "icon.svg"), svg(1024, 1));
  const browser = await chromium.launch(), page = await browser.newPage();
  for (const [name, size, scale] of [["icon-512.png", 512, 1], ["icon-192.png", 192, 1], ["apple-touch-icon.png", 180, 1], ["favicon-32.png", 32, 1.12], ["icon-maskable-512.png", 512, 0.78]]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0">${svg(size, scale)}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(dir, name), clip: { x: 0, y: 0, width: size, height: size } });
  }
  await browser.close();
  console.log("icons written to", dir);
})();
