// Site check: run on every pull request (.github/workflows/site-check.yml).
// For a GitHub Pages site, merging is going live, so this catches a broken
// page before it ships. Two parts:
//  1. Files: every relative src/href in the pages points at a file that
//     exists, and no link starts with "/" (it would break under the Pages
//     subfolder).
//  2. Browser: each page opens at phone and desktop width with no script
//     error and no failed request to the site's own files. Outside hosts
//     (fonts, CDNs) are ignored: their outages are not this change's fault.
// Usage, from the repo root: node .github/site-check.cjs "<page>?<query>" ...
// e.g. node .github/site-check.cjs "index.html?start=0"
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const SUB = '/' + path.basename(ROOT) + '/';
const pages = process.argv.slice(2);
if (!pages.length) { console.error('usage: site-check.cjs <page?query> ...'); process.exit(2); }
const problems = [];

// ---------- 1. Files ----------
const SKIP = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\$\{|\{)/i; // http:, mailto:, data:, //cdn, #id, template bits
for (const entry of pages) {
  const file = entry.split('?')[0];
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const dir = path.dirname(path.join(ROOT, file));
  const re = /\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const ref = m[1].trim();
    if (!ref || SKIP.test(ref)) continue;
    // A link the page's code builds from pieces ("art/" + name, `${x}.webp`)
    // is not a file name; skip it rather than call it missing.
    if (ref.includes('${') || /^\s*\+/.test(html.slice(m.index + m[0].length, m.index + m[0].length + 4))) continue;
    if (ref.startsWith('/')) { problems.push(`${file}: link starts with "/" (breaks on Pages): ${ref}`); continue; }
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
    if (!clean) continue;
    const target = path.join(dir, clean);
    if (!fs.existsSync(target)) problems.push(`${file}: missing file ${ref}`);
  }
}

// ---------- 2. Browser ----------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.glb': 'model/gltf-binary',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.hdr': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (!p.startsWith(SUB)) { res.writeHead(404); return res.end(); }
  p = path.join(ROOT, p.slice(SUB.length));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  for (const entry of pages) {
    for (const vp of [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 900 }]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const tag = `${entry} (${vp.name})`;
      page.on('pageerror', e => problems.push(`${tag}: script error: ${String(e.message || e).split('\n')[0]}`));
      page.on('response', r => { if (r.url().startsWith(origin) && r.status() >= 400) problems.push(`${tag}: ${r.status()} ${r.url().slice(origin.length)}`); });
      page.on('requestfailed', r => {
        const err = (r.failure() || {}).errorText || '';
        // Media the page aborts on purpose (a video swapped or paused) is not a broken file.
        if (r.url().startsWith(origin) && !/ERR_ABORTED/.test(err)) problems.push(`${tag}: failed ${r.url().slice(origin.length)} ${err}`);
      });
      try {
        await page.goto(origin + SUB + entry, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(3000);
      } catch (e) { problems.push(`${tag}: did not load: ${e.message.split('\n')[0]}`); }
      await ctx.close();
    }
  }
  await browser.close();
  server.close();
  const unique = [...new Set(problems)];
  if (unique.length) {
    console.log(`Site check found ${unique.length} problem(s):`);
    unique.forEach(p => console.log('  - ' + p));
    process.exit(1);
  }
  console.log(`Site check passed: ${pages.length} page(s), phone and desktop, no missing files, no script errors.`);
})().catch(e => { console.error(e); process.exit(1); });
