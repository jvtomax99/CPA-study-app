/* Draws the app icon (a stack of three books on a blue gradient) and writes every size phones ask for into icons/.
   Run from the repo root: node tools/make_icons.js   (needs Playwright's Chromium) */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");

/* one book seen from above at an angle: cover on top, page block on the front and right, spine on the left */
function book({ cx, cy, w, d, t, rot, cover, dark }) {
  const tilt = 0.52, a = rot * Math.PI / 180;
  const P = (x, y, z = 0) => { const rx = x * Math.cos(a) - y * Math.sin(a), ry = x * Math.sin(a) + y * Math.cos(a); return [cx + rx, cy + ry * tilt + z]; };
  const pts = arr => arr.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ");
  const hw = w / 2, hd = d / 2, b = 6, pg = t - 2 * b;   /* b = board thickness */
  const out = [];
  /* bottom board, page block, top board, each extruded downward */
  const slab = (y0, h, fillTop, fillFront, fillSide, inset = 0) => {
    const tl = P(-hw + inset, -hd + inset, y0), tr = P(hw - inset, -hd + inset, y0), br = P(hw - inset, hd - inset, y0), bl = P(-hw + inset, hd - inset, y0);
    const dn = p => [p[0], p[1] + h];
    out.push(`<polygon points="${pts([bl, br, dn(br), dn(bl)])}" fill="${fillFront}"/>`);
    out.push(`<polygon points="${pts([br, tr, dn(tr), dn(br)])}" fill="${fillSide}"/>`);
    out.push(`<polygon points="${pts([tl, bl, dn(bl), dn(tl)])}" fill="${dark}"/>`);
    if (fillTop) out.push(`<polygon points="${pts([tl, tr, br, bl])}" fill="${fillTop}"/>`);
  };
  slab(b + pg, b, null, dark, dark);                           /* back board */
  slab(b, pg, null, "url(#pages)", "url(#pagesSide)", 7);      /* pages, set back from the cover edge */
  slab(0, b, cover, dark, dark);                               /* front cover */
  /* a soft sheen across the cover */
  const tl = P(-hw, -hd), tr = P(hw, -hd), br = P(hw, hd), bl = P(-hw, hd);
  out.push(`<polygon points="${pts([tl, tr, br, bl])}" fill="url(#sheen)"/>`);
  return out.join("");
}

function svg(size, scale) {
  const s = scale, c = 512;
  const books = [
    { cx: c - 22 * s, cy: c + 150 * s, w: 440 * s, d: 300 * s, t: 74 * s, rot: -3, cover: "#3b62d6", dark: "#23409a" },
    { cx: c + 14 * s, cy: c + 40 * s, w: 420 * s, d: 292 * s, t: 74 * s, rot: 6, cover: "#e2462f", dark: "#a82c1c" },
    { cx: c - 6 * s, cy: c - 78 * s, w: 410 * s, d: 288 * s, t: 74 * s, rot: -11, cover: "#3ea54a", dark: "#257a31" }
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#74c4fb"/><stop offset="1" stop-color="#3f86dd"/></linearGradient>
  <linearGradient id="pages" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfaf6"/><stop offset="1" stop-color="#ddd8cc"/></linearGradient>
  <linearGradient id="pagesSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ece8de"/><stop offset="1" stop-color="#c9c3b5"/></linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="${18 * s}" stdDeviation="${22 * s}" flood-color="#0b2a5c" flood-opacity="0.35"/></filter>
</defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<g filter="url(#shadow)">${books.map(book).join("")}</g>
</svg>`;
}

(async () => {
  const dir = path.join(process.cwd(), "icons"); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "icon.svg"), svg(1024, 1.22));
  const browser = await chromium.launch(), page = await browser.newPage();
  /* scale 1 = full art; maskable icons keep the books inside the middle 80% so round masks never clip them */
  for (const [name, size, scale] of [["icon-512.png", 512, 1.22], ["icon-192.png", 192, 1.22], ["apple-touch-icon.png", 180, 1.22], ["favicon-32.png", 32, 1.45], ["icon-maskable-512.png", 512, 0.95]]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0">${svg(size, scale)}</body></html>`);
    await page.screenshot({ path: path.join(dir, name), clip: { x: 0, y: 0, width: size, height: size } });
  }
  await browser.close();
  console.log("icons written to", dir);
})();
