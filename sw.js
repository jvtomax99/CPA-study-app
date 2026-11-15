// The offline copy. Keeps one whole build of the app on the phone and serves
// it from there, so the app opens with no signal. Modelled on Mochi's worker.
//
// How a build gets here, and how the next one replaces it:
//   - "check": this worker reads version.json from the network (a few seconds
//     after the app opens, and when the page asks). A build it does not hold
//     is staged. `"sw": false` there removes the worker and its caches.
//   - "stage": every file in offline-files.json is fetched into a cache of its
//     own, named after the build, and each one is compared with the
//     fingerprint the list gives for it. One wrong or missing file and the
//     whole cache is thrown away; the next check tries again. Nothing is
//     served from a staged build yet.
//   - The first copy on a phone is put to use at once: the page on screen is
//     that same build.
//   - A later build is put to use only as the app opens: when the page is
//     asked for and no window of the app is open, or, in a tab that is being
//     loaded again, when the page asks ("launch") and it is the only window.
//     The page then loads itself once more. So a running app never gets a mix
//     of two builds and is never switched in the middle of a drill or an exam.
// The decisions are all made here, from what is in the caches: a reply that
// is lost between the page and this worker changes nothing.
// version.json, offline-files.json and this file are never served from the
// copy. Off switches: `?sw=off` on the page, or `"sw": false` in version.json.
// tools/build.py writes offline-files.json and version.json at every build.
const SCOPE = new URL(self.registration.scope).pathname;
const PREFIX = `atl:${SCOPE}:`;
const META = PREFIX + 'meta', META_URL = SCOPE + '__offline-state';
const cacheOf = build => PREFIX + 'build:' + build;
const NONE = {current: null, staged: null};

let state = null;                          // {current, staged} (build names)
async function readState() {
  if (state) return state;
  // (Looked up without opening, so a worker on its way out leaves no empty cache behind.)
  const r = await caches.match(META_URL, {cacheName: META});
  return state = r ? await r.json() : NONE;
}
async function writeState(s) {
  await (await caches.open(META)).put(META_URL, new Response(JSON.stringify(s), {headers: {'content-type': 'application/json'}}));
  state = s;                               // only once it is really saved
}
// Remove the caches of builds that are neither served nor being staged.
async function tidy() {
  const s = await readState(), keep = new Set([META, s.current && cacheOf(s.current), s.staged && cacheOf(s.staged), staging && cacheOf(staging.build)]);
  for (const k of await caches.keys()) if (k.startsWith(PREFIX) && !keep.has(k)) await caches.delete(k);
}
// (Top-level windows only: a figure opened inside the app is a frame, not another window.)
const windows = async () => (await self.clients.matchAll({type: 'window', includeUncontrolled: true})).filter(c => c.frameType !== 'nested' && new URL(c.url).pathname.startsWith(SCOPE));

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const held = async build => !!(await caches.match(SCOPE + 'index.html', {cacheName: cacheOf(build)}));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

// Fetch a whole build into its own cache. All or nothing.
let staging = null;                        // {build, done: Promise<boolean>}
function stage(build, kinds) {
  if (staging) return staging.build === build ? staging.done : Promise.resolve(false);   // one at a time
  const done = (async () => {
    const s = await readState();
    // (Held already? Only if its cache is really there: another app at this address, or the
    // browser, may have cleared it, and then it is fetched again.)
    if ((s.current === build || s.staged === build) && await held(build)) {
      if (s.current === build && s.staged) { await writeState({current: build, staged: null}); await tidy(); }   // a release that was taken back
      return true;
    }
    if (s.current === build || s.staged === build) await writeState({current: s.current === build ? null : s.current, staged: s.staged === build ? null : s.staged});
    const name = cacheOf(build);
    let failed = false;
    try {
      const list = await (await fetch(SCOPE + 'offline-files.json', {cache: 'no-store'})).json();
      // (The list and version.json can come from different moments: only a list made for this build will do.)
      if (list.build !== build || !list.sha1) throw new Error('list is for another build');
      const files = [...list.app, ...kinds.flatMap(k => list[k] || [])];
      await caches.delete(name);
      const cache = await caches.open(name);
      // (Six at a time. `no-cache` asks the server whether the phone's own
      // copy is still right, so a file already here is not sent twice.)
      let i = 0;
      const next = async () => {
        while (i < files.length && !failed) {
          const f = files[i++];
          try {
            const r = await fetch(SCOPE + f, {cache: 'no-cache'});
            if (!r.ok || r.status !== 200) throw new Error(f + ' ' + r.status);
            const body = await r.arrayBuffer();
            if (hex(await crypto.subtle.digest('SHA-1', body)) !== list.sha1[f]) throw new Error(f + ' is not this build\'s');
            const headers = {'content-type': r.headers.get('content-type') || 'application/octet-stream'};
            await cache.put(SCOPE + f, new Response(body, {status: 200, headers}));
          } catch (err) { failed = true; throw err; }
        }
      };
      await Promise.all(Array.from({length: 6}, next));
      if (gone) throw new Error('switched off');
      const now = await readState();
      // The first copy is the build already on screen, so it serves at once.
      // A later one waits until the app is next opened.
      await writeState(now.current ? {...now, staged: build} : {current: build, staged: null});
      await tidy();
      return true;
    } catch (err) {
      await caches.delete(name);
      return false;
    }
  })();
  const mine = staging = {build, done};
  done.finally(() => { if (staging === mine) staging = null; });
  return done;
}

// Remove the copy and this worker (the off switch).
let gone = false;
async function off() {
  gone = true;
  for (const k of await caches.keys()) if (k.startsWith(PREFIX)) await caches.delete(k);
  state = NONE;
  await self.registration.unregister();
}

// Read version.json from the network and act on it.
async function check(wait) {
  if (wait) await new Promise(r => setTimeout(r, wait));
  let v;
  try { v = await (await fetch(SCOPE + 'version.json', {cache: 'no-store'})).json(); } catch (err) { return; }   // no signal
  if (!v || typeof v !== 'object') return;
  if (v.sw === false) return off();
  if (typeof v.build !== 'string') return;
  const saver = self.navigator.connection && self.navigator.connection.saveData;
  await stage(v.build, saver ? [] : ['film']);
}

// A staged build becomes the one served, if `allowed` says the open windows permit it.
async function flip(allowed) {
  const s = await readState();
  if (!s.staged) return false;
  if (!allowed(await windows())) return false;
  await writeState({current: s.staged, staged: null});
  await tidy();
  return true;
}

self.addEventListener('message', e => {
  const m = e.data || {}, src = e.source, reply = x => e.ports[0] && e.ports[0].postMessage(x);
  // "launch": the page has just loaded in a tab that already had the app. If it is
  // the only window, switch and tell it to load again; it reloads whenever it hears.
  if (m.cmd === 'launch') e.waitUntil(flip(open => !!src && open.length > 0 && open.every(c => c.id === src.id)).then(ok => { if (ok && src) src.postMessage({type: 'atl-flipped'}); }).catch(() => {}));
  else if (m.cmd === 'check') e.waitUntil(check(0).catch(() => {}));
  else if (m.cmd === 'state') e.waitUntil(readState().catch(() => NONE).then(s => reply({current: s.current, staged: s.staged, busy: !!staging})));
});

// A piece of a kept file (films are asked for in pieces).
async function slice(res, range) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(range), buf = await res.arrayBuffer(), size = buf.byteLength;
  if (!m || (m[1] === '' && m[2] === '')) return new Response(buf, {status: 200, headers: res.headers});
  let from = m[1] === '' ? size - +m[2] : +m[1], to = m[1] === '' || m[2] === '' ? size - 1 : Math.min(+m[2], size - 1);
  from = Math.max(0, from);
  if (from > to || from >= size) return new Response(null, {status: 416, headers: {'content-range': `bytes */${size}`}});
  const headers = new Headers(res.headers);
  headers.set('content-range', `bytes ${from}-${to}/${size}`);
  headers.set('content-length', String(to - from + 1));
  headers.set('accept-ranges', 'bytes');
  return new Response(buf.slice(from, to + 1), {status: 206, headers});
}

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  let path = url.pathname.slice(SCOPE.length);
  const page = req.mode === 'navigate' && (path === '' || path === 'index.html');
  if (page) path = 'index.html';
  // Never from the copy: the build's fingerprint, this script and the file list.
  if (/^(version\.json|sw\.js|offline-files\.json)$/.test(path)) return;
  // Each time the app is opened, look for a newer build (or the off switch) once it has had time to start.
  if (page) e.waitUntil(check(8000).catch(() => {}));
  e.respondWith((async () => {
    try {
      // The app is being opened and no window of it is open: the moment to switch builds.
      if (page) await flip(open => open.length === 0).catch(() => {});
      const s = await readState();
      if (s.current) {
        // (Matched by path alone, so index.html?intro=0 and a figure's ?case=2 find their file.)
        const hit = await caches.match(SCOPE + path, {cacheName: cacheOf(s.current)});
        if (hit) return req.headers.has('range') ? await slice(hit, req.headers.get('range')) : hit;
      }
    } catch (err) {}
    return fetch(req);
  })());
});
