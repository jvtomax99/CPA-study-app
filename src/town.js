(async () => {
  /* ---------- load three.js and the bloom passes (resolved through the importmap in the page head) ---------- */
  let THREE, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass;
  /* hand-modeled study towers, one per facade style (made in Blender by tools/blender/towers.py), fetched while three.js loads */
  const MODEL_FILES = ["glass", "deco", "brick", "dark"].map(n => fetch(`art/tower-${n}.glb`).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null));
  try {
    const mods = await Promise.race([
      Promise.all([import("three"), import("three/addons/postprocessing/EffectComposer.js"), import("three/addons/postprocessing/RenderPass.js"), import("three/addons/postprocessing/UnrealBloomPass.js"), import("three/addons/postprocessing/OutputPass.js"), import("three/addons/postprocessing/ShaderPass.js")]),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 20000))
    ]);
    [THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }] = mods;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2")) throw new Error("no webgl2");
  } catch (e) { window.__townFail && window.__townFail(); return; }

  /* a style whose model didn't load (opened from a local file, or offline) keeps its boxes */
  const MODELS = {};
  try {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"), gl = new GLTFLoader();
    await Promise.all(MODEL_FILES.map((f, st) => f.then(buf => buf && gl.parseAsync(buf, "")).then(g => { if (g) MODELS[st] = g.scene; }, () => {})));
  } catch (e) { /* no models: boxes everywhere */ }
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* graphics level: ?gfx=low or ?gfx=high forces it; otherwise a slow device drops to low on its own and remembers for 7 days */
  const GFXKEY = "eaTaxTown.gfx", QS = new URLSearchParams(location.search), gfxForced = QS.get("gfx");
  const gfxSaved = (() => { try { const v = JSON.parse(localStorage.getItem(GFXKEY) || "null"); return v && Date.now() - v.at < 7 * 864e5 ? v.level : null; } catch (e) { return null; } })();
  if (gfxForced === "high") { try { localStorage.removeItem(GFXKEY); } catch (e) {} }
  let low = gfxForced ? gfxForced === "low" : gfxSaved === "low";
  const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  const dprFor = () => low ? 1 : Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  const renderer = new THREE.WebGLRenderer({ antialias: low, powerPreference: "high-performance" });
  renderer.setPixelRatio(dprFor());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  renderer.info.autoReset = false;
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 2, 12000);
  const U = { night: { value: 1 }, time: { value: 0 } };

  /* ---------- random (seeded, so the city is the same on every visit) ---------- */
  const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rnd = mulberry32(20261102);
  const pick = a => a[Math.floor(rnd() * a.length)];

  /* ---------- facade shader: every window is drawn per pixel from world position, so thousands of towers cost one draw ---------- */
  const HASH = "float fh21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }";
  const FACADE = `
{
  vec3 N = normalize(vFNrm);
  float isRoof = step(0.5, N.y);
  vec2 tg = normalize(vec2(-N.z, N.x) + 1e-5);
  float u = dot(vFPos.xz - vFOrg.xz, tg);
  float v = vFPos.y;
  float st = vStyle;
  float fh = 3.7, cw = 1.6, wx = 0.8, wy = 0.6, glass = 0.0;
  if (st < 0.5) { cw = 1.5; wx = 0.88; wy = 0.72; glass = 1.0; }
  else if (st < 1.5) { cw = 2.4; wx = 0.5; wy = 0.56; }
  else if (st < 2.5) { cw = 1.9; fh = 3.3; wx = 0.42; wy = 0.52; }
  else if (st < 3.5) { cw = 3.0; wx = 0.94; wy = 0.86; glass = 1.0; }
  else { cw = 7.5; fh = 4.0; }
  vec2 g = vec2(u / cw, v / fh);
  vec2 cell = floor(g), f = fract(g);
  vec2 fw = max(fwidth(g), vec2(1e-4));
  float farK = smoothstep(0.3, 0.8, max(fw.x, fw.y));
  vec3 baseCol = diffuseColor.rgb;
  vec3 em = vec3(0.0);
  float ao = mix(0.45, 1.0, smoothstep(0.0, 24.0, v));
  vec3 warm = vec3(1.0, 0.68, 0.38), cool = vec3(0.7, 0.83, 1.0);
  if (st < 3.5) {
    vec2 d = abs(f - 0.5);
    float win = (1.0 - smoothstep(wx * 0.5 - fw.x, wx * 0.5 + fw.x, d.x)) * (1.0 - smoothstep(wy * 0.5 - fw.y, wy * 0.5 + fw.y, d.y));
    win = mix(win, wx * wy, farK);
    float busy = fh21(vec2(cell.y, vSeed * 7.13));
    float lit = step(fh21(cell + vSeed * 31.7), mix(0.04, 0.62, busy * busy * busy) * mix(1.0, 0.5, smoothstep(30.0, 150.0, v)));
    vec3 lc = mix(warm, cool, step(0.62, fh21(cell.yx * 1.31 + vSeed))) * (0.25 + 0.55 * fh21(cell * 1.7 + 3.1));
    em = mix(lit * lc, mix(warm, cool, 0.38) * 0.1, farK) * win;
    if (v < 5.0) { /* storefronts */
      float pane = 1.0 - smoothstep(0.44, 0.47, abs(fract(u / 5.0) - 0.5));
      float sh = pane * step(0.6, v) * (1.0 - step(4.4, v));
      win = sh; em = vec3(1.0, 0.8, 0.55) * 0.9 * sh * step(0.25, fh21(vec2(floor(u / 5.0), vSeed)));
    }
    vec3 glassCol = mix(vec3(0.025, 0.03, 0.045), vec3(0.06, 0.085, 0.12), glass);
    vec3 wallCol = baseCol;
    if (st > 1.5 && st < 2.5 && v > 5.0) { /* brownstone trim: stone lintels and sills, quoins up the corners */
      float lint = step(abs(f.x - 0.5), wx * 0.5 + 0.07) * step(0.5 + wy * 0.5, f.y) * step(f.y, 0.5 + wy * 0.5 + 0.1);
      float sill = step(abs(f.x - 0.5), wx * 0.5 + 0.05) * step(0.5 - wy * 0.5 - 0.05, f.y) * step(f.y, 0.5 - wy * 0.5);
      float hw = abs(N.x) > 0.5 ? vHalf.y : vHalf.x;
      float quoin = step(hw - 0.5 - 0.25 * mod(floor(v / 0.7), 2.0), abs(u));
      wallCol = mix(baseCol, vec3(0.56, 0.5, 0.42), max(max(lint, sill) * (1.0 - farK), quoin * (1.0 - farK * 0.6)));
    }
    diffuseColor.rgb = mix(wallCol, glassCol, win);
    roughnessFactor = mix(0.85, 0.07, win);
    metalnessFactor = mix(0.0, 0.9, win * (0.35 + 0.65 * glass));
  } else { /* bare concrete frame: slab edges, columns, dark open floors, work lights */
    float slab = 1.0 - smoothstep(0.1, 0.1 + fw.y, f.y);
    float colm = 1.0 - smoothstep(0.05, 0.05 + fw.x, min(f.x, 1.0 - f.x));
    float conc = mix(max(slab, colm), 0.3, farK);
    float wl = step(fh21(cell + vSeed * 3.3), 0.2) * (1.0 - smoothstep(0.0, 0.42, length((f - vec2(0.5, 0.55)) * vec2(1.0, 1.5))));
    em = mix((1.0 - conc) * wl * vec3(0.95, 0.97, 1.0) * 2.0, vec3(0.1), farK);
    diffuseColor.rgb = mix(vec3(0.018), vec3(0.52, 0.51, 0.49), conc);
    roughnessFactor = 0.92; metalnessFactor = 0.0;
  }
  float tH = vTop - v;
  if (st > 0.5 && st < 2.5 && vTop - vFOrg.y > 6.0 && vTop < 75.0 && tH < 1.9 && isRoof < 0.5) { /* pressed-metal cornice on the walk-ups */
    diffuseColor.rgb = tH < 0.95 ? vec3(0.24, 0.22, 0.2) : vec3(0.5, 0.45, 0.38); em = vec3(0.0); roughnessFactor = 0.75; metalnessFactor = 0.0;
  }
  if (isRoof > 0.5) { diffuseColor.rgb = vec3(0.11, 0.11, 0.12); em = vec3(0.0); roughnessFactor = 0.9; metalnessFactor = 0.0; ao = 1.0; }
  diffuseColor.rgb *= ao;
  float up = exp(-v / 30.0); /* at night walls are lit from the street: bright low down, dark higher up */
  diffuseColor.rgb *= mix(1.0, 0.22 + 0.78 * up, uNight);
  /* in the Times Square canyon the street light is the screens: magenta and cyan washing up the walls */
  float inCy = step(-215.0, vFPos.z) * step(vFPos.z, 250.0) * (1.0 - smoothstep(22.0, 75.0, abs(vFPos.x)));
  vec3 spill = mix(vec3(1.0, 0.1, 0.48), vec3(0.06, 0.7, 1.0), 0.5 + 0.5 * sin(vFPos.z * 0.043 + vFPos.x * 0.05)) * exp(-v / 24.0) * inCy;
  em += (1.0 - isRoof) * (baseCol * up * vec3(0.5, 0.32, 0.45) * 0.3 * (1.0 - inCy) + (baseCol + 0.12) * spill * 0.75);
  fEnvK = mix(1.0, 0.3, smoothstep(14.0, 90.0, v) * uNight);
  totalEmissiveRadiance += em * uNight;
}`;
  function facadeMat(opts = {}) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 0.8, metalness: 0 }, opts));
    m.onBeforeCompile = sh => {
      sh.uniforms.uNight = U.night;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
attribute float aSeed; attribute float aStyle;
varying vec3 vFPos; varying vec3 vFNrm; varying vec3 vFOrg; varying float vSeed; varying float vStyle; varying float vTop; varying vec2 vHalf;`).replace("#include <begin_vertex>", `#include <begin_vertex>
{ mat4 fm = modelMatrix;
#ifdef USE_INSTANCING
  fm = modelMatrix * instanceMatrix;
#endif
  vFPos = (fm * vec4(transformed, 1.0)).xyz; vFOrg = (fm * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vFNrm = mat3(fm) * objectNormal; vSeed = aSeed; vStyle = aStyle;
  vTop = (fm * vec4(0.0, 1.0, 0.0, 1.0)).y; vHalf = vec2(length(fm[0].xyz), length(fm[2].xyz)) * 0.5; }`);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform float uNight; float fEnvK = 1.0;
varying vec3 vFPos; varying vec3 vFNrm; varying vec3 vFOrg; varying float vSeed; varying float vStyle; varying float vTop; varying vec2 vHalf;
${HASH}`).replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + FACADE).replace("#include <lights_fragment_maps>", "#include <lights_fragment_maps>\n#ifdef USE_ENVMAP\nradiance *= fEnvK;\n#endif");
    };
    m.customProgramCacheKey = () => "facade";
    return m;
  }

  /* ---------- city layout (meters; north is -z; the Times Square canyon runs along x = 0) ---------- */
  const AVE = 260, ST = 80, SH = 9, avHalf = i => (i === 0 ? 18 : 15);
  const CANYON = { z0: -205, z1: 245 }, PARK = { x0: -260, x1: 520, z1: -1100 };
  const RANGE = low ? 1500 : 2500, TDEPTH = 44;
  const PAL = { 0: [0x2b3542, 0x3a4553, 0x1f2731, 0x56606c, 0x2f3d4a, 0x44525e], 1: [0xb9ae99, 0x9d9485, 0xd0c6b1, 0x8b8579, 0xa79a86], 2: [0x8b4b37, 0x6f3c2d, 0xa1654b, 0x7b5b49, 0x5e4a3e], 3: [0x14181e, 0x20262e, 0x1a1f26] };
  const AWN = [0x1f4d2b, 0x1d2a44, 0x5a1a1f, 0x262629, 0x3d5a3a, 0x6b2d1a, 0x2f4058];
  const CROWN_COLS = [0xffc861, 0xf4f1ea, 0x6fb6ff, 0xff4f8b, 0x8cffb0, 0xb48cff];
  const towers = [], crowns = [], tanks = [], roofBoxes = [], avPts = [], walls = [], escapes = [], rails = [], awnings = [];
  const addT = (x, y, z, w, h, d, style, seed, tint) => towers.push([x, y, z, w, h, d, style, seed, tint]);
  const density = (x, z) => Math.max(Math.exp(-((x - 300) ** 2) / 1000 ** 2 - ((z + 150) ** 2) / 1250 ** 2), 0.9 * Math.exp(-((x + 650) ** 2) / 320 ** 2 - ((z - 700) ** 2) / 260 ** 2));
  function building(x0, x1, z0, z1, o = {}) {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, dn = density(cx, cz);
    let h = 10 + 26 * rnd() + dn * (0.15 + 0.85 * Math.pow(rnd(), 1.4)) * 260;
    if (o.minH) h = Math.max(h, o.minH + rnd() * (o.maxH - o.minH));
    if (o.maxCap) h = Math.min(h, o.maxCap);
    if (o.hk) h = 14 + rnd() * 11 + (rnd() < 0.07 ? 22 : 0);   /* Hell's Kitchen: five- and six-storey walk-ups */
    const style = o.hk ? (rnd() < 0.8 ? 2 : 1) : h > 130 ? pick([0, 0, 3, 1]) : h > 45 ? pick([1, 0, 1, 3, 2]) : pick([2, 2, 1]);
    const tint = pick(PAL[style]), seed = rnd() * 1000;
    let top, wallH = h;
    if (h > 70 && w > 26 && d > 26 && rnd() < 0.75) {
      const ph = 12 + rnd() * 24, pst = style === 3 ? 1 : style; wallH = ph;
      addT(cx, 0, cz, w, ph, d, pst, seed, pst === style ? tint : pick(PAL[pst]));
      const ix = 3 + rnd() * Math.min(10, w * 0.18), iz = 3 + rnd() * Math.min(10, d * 0.18);
      let tw = w - 2 * ix, td = d - 2 * iz;
      if (h > 110 && rnd() < 0.55) {
        const h1 = h * (0.6 + rnd() * 0.15); addT(cx, ph, cz, tw, h1 - ph, td, style, seed, tint);
        tw -= 6 + rnd() * 6; td -= 6 + rnd() * 6; addT(cx, h1, cz, tw, h - h1, td, style, seed, tint);
      } else addT(cx, ph, cz, tw, h - ph, td, style, seed, tint);
      top = [cx, h, cz, tw, td];
    } else { addT(cx, 0, cz, w - 0.6, h, d - 0.6, style, seed, tint); top = [cx, h, cz, w - 0.6, d - 0.6]; }
    if (style === 2 && h < 80 && rnd() < 0.55) tanks.push([top[0] + (rnd() - 0.5) * top[3] * 0.5, h, top[2] + (rnd() - 0.5) * top[4] * 0.5, 0.8 + rnd() * 0.5]);
    for (let i = 0, n = 1 + Math.floor(rnd() * 2); i < n; i++) { const bw = 3 + rnd() * Math.min(9, top[3] * 0.3), bd = 3 + rnd() * Math.min(9, top[4] * 0.3); roofBoxes.push([top[0] + (rnd() - 0.5) * (top[3] - bw), h, top[2] + (rnd() - 0.5) * (top[4] - bd), bw, 1.5 + rnd() * 3, bd]); }
    if (h > 125 && rnd() < 0.3) crowns.push([top[0], h, top[2], top[3] * 0.9, 6 + rnd() * 14, top[4] * 0.9, pick(CROWN_COLS), rnd() < 0.5 ? 0 : 1]);
    if (h > 240 && rnd() < 0.5) { const sp = 25 + rnd() * 45; addT(top[0], h, top[2], 1.4, sp, 1.4, 3, seed, 0x9aa3ad); avPts.push([top[0], h + sp + 0.5, top[2]]); }
    else if (h > 150) avPts.push([top[0], h + 0.8, top[2]]);
    /* street fronts of the walk-ups: fire escapes up the brick, awnings over the shops */
    if (h < 65 && !o.minH && Math.hypot(cx - 150, cz) < 950) for (const [is, nz] of [[o.nf, -1], [o.sf, 1]]) {
      if (!is) continue; const face = nz < 0 ? z0 + 0.3 : z1 - 0.3, top = Math.min(wallH, h) - 2.5;
      if (style === 2 && w > 7 && rnd() < (o.hk ? 0.75 : 0.6)) {
        const fw = Math.min(w - 3, 4.5 + rnd() * 3), fx = x0 + 1.5 + fw / 2 + rnd() * Math.max(0, w - 3 - fw);
        for (let y = 5.4; y < top; y += 3.3) {
          escapes.push([fx, y, face + nz * 0.55, fw, 0.1, 1.1, 0]);
          rails.push([fx, y + 0.5, face + nz * 1.08, fw, 1.0, 0.04, 0]);
          if (y + 3.3 < top) { const len = Math.hypot(fw * 0.7, 3.3); escapes.push([fx, y + 1.65, face + nz * 0.3, len, 0.06, 0.4, Math.atan2(3.3, fw * 0.7) * (rnd() < 0.5 ? 1 : -1)]); }
        }
      }
      if (style !== 3 && rnd() < 0.55) { let ax = x0 + 1.5 + rnd() * 3;
        while (ax < x1 - 5) { const aw = Math.min(x1 - 1.5 - ax, 3.5 + rnd() * 4); if (rnd() < 0.7) awnings.push([ax + aw / 2, 3.75, face + nz * 0.75, aw, 0.09, 1.5, nz, pick(AWN)]); ax += aw + 1 + rnd() * 4; }
      }
    }
    return { h, wallH };
  }
  /* study tower slots: the first 44 m of each canyon block, two lots per block; Part 1 north, Part 2 middle, Part 3 south */
  const SLOT_BLOCKS = { "-2": 1, "-1": 1, "0": 2, "1": 3 };
  const slots = { 1: [], 2: [], 3: [] };
  for (let k = -6; k <= 8; k++) {
    const x0 = k * AVE + avHalf(k), x1 = (k + 1) * AVE - avHalf(k + 1);
    if (x1 < -1300 || x0 > 2100) continue;
    for (let j = -55; j <= 40; j++) {
      const z0 = j * ST + SH, z1 = (j + 1) * ST - SH, cz = (z0 + z1) / 2;
      if (Math.hypot((x0 + x1) / 2 - 150, cz) > RANGE) continue;
      if (x0 >= PARK.x0 && x1 <= PARK.x1 && z1 <= PARK.z1 + 1) continue;
      const canyon = (k === 0 || k === -1) && z1 > CANYON.z0 && z0 < CANYON.z1;
      const part = canyon ? SLOT_BLOCKS[j] : 0;
      let xa = x0, xb = x1;
      if (part) {
        const nx = k === 0 ? -1 : 1, sx0 = k === 0 ? x0 : x1 - TDEPTH, sx1 = k === 0 ? x0 + TDEPTH : x1;
        for (const [a, b, side] of [[z0, cz, -1], [cz, z1, 1]]) slots[part].push({ x0: sx0, x1: sx1, z0: a, z1: b, nx, side, wallX: k === 0 ? x0 : x1 });
        if (k === 0) xa = x0 + TDEPTH; else xb = x1 - TDEPTH;
      }
      const hk = (k === -2 || k === -3) && z0 > -520 && z1 < 470;   /* the walk-up blocks west of the canyon */
      let x = xa;
      while (x < xb - 8) {
        let lw = hk ? 7.5 + rnd() * 8 : 18 + rnd() * 40; if (xb - (x + lw) < (hk ? 7 : 16)) lw = xb - x;
        const lx0 = x, lx1 = x + lw; x += lw;
        const faces = canyon && !part && ((k === 0 && lx0 === x0) || (k === -1 && Math.abs(lx1 - x1) < 0.01));
        const rows = hk || (!faces && rnd() < 0.45) ? [[z0, cz - 1], [cz + 1, z1]] : faces && rnd() < 0.5 ? [[z0, cz], [cz, z1]] : [[z0, z1]];
        for (const [a, b] of rows) {
          const info = building(lx0, lx1, a, b, Object.assign(faces ? { minH: 50, maxH: 105, maxCap: 110 } : part ? { maxCap: 115 } : {}, { nf: a === z0, sf: b === z1, hk }));
          if (faces) walls.push({ x: k === 0 ? lx0 : lx1, nx: k === 0 ? -1 : 1, z0: a, z1: b, h: info.wallH, n: a === z0, s: b === z1, depth: lw });
        }
      }
    }
  }
  /* skyline anchors in the distance (generic shapes) */
  for (const [x, z, w, d, h, st] of [[300, -805, 22, 22, 440, 0], [140, -790, 24, 24, 465, 3], [430, -820, 18, 52, 415, 1], [610, -780, 27, 27, 420, 1], [-640, 620, 40, 40, 390, 0], [-700, 760, 36, 36, 340, 3], [-560, 700, 30, 46, 300, 0]]) { addT(x, 0, z, w, h, d, st, rnd() * 1000, pick(PAL[st])); avPts.push([x, h + 1, z]); }
  { const x = 650, z = 860, s = rnd() * 1000; let y = 0;
    for (const [w, hh] of [[58, 26], [44, 150], [36, 60], [28, 50], [20, 40], [12, 22]]) { addT(x, y, z, w, hh, w * 0.7, 1, s, 0xc9bea8); y += hh; }
    crowns.push([x, y, z, 10, 16, 8, 0xffc861, 1]); addT(x, y + 16, z, 2.4, 60, 2.4, 1, s, 0xc9bea8); avPts.push([x, y + 77, z]); }
  for (let i = 0; i < (low ? 120 : 360); i++) {
    const west = i % 3 !== 0, x = west ? -2350 - rnd() * 3000 : 2950 + rnd() * 2400, z = -3000 + rnd() * 6000;
    const tall = (!west && z > -900 && z < 300 && rnd() < 0.35) || (west && z > 1200 && rnd() < 0.25);
    const h = tall ? 60 + rnd() * 160 : 8 + rnd() * 30, st = h > 60 ? pick([0, 3, 1]) : pick([2, 1, 2]);
    addT(x, 0, z, 14 + rnd() * 30, h, 14 + rnd() * 30, st, rnd() * 1000, pick(PAL[st]));
  }
  /* the screen tower that closes the south end of the canyon */
  const OTS = { x0: -11, x1: 11, z0: 212, z1: 232, h: 112 };
  addT(0, 0, 222, 22, OTS.h, 20, 3, 5.5, 0x14181e); addT(0, OTS.h, 222, 14, 8, 12, 3, 5.5, 0x14181e); addT(0, OTS.h + 8, 222, 1.2, 26, 1.2, 3, 5.5, 0x9aa3ad);

  /* ---------- the 13 study towers: finished cladding below the cut; bare frame, netting and a crane above ---------- */
  const TDEF = {
    "P1-1": { style: 2, tint: 0x8b4b37 }, "P1-2": { style: 1, tint: 0xbfb39c }, "P1-3": { style: 0, tint: 0x33414f }, "P1-4": { style: 3, tint: 0x1a1f26 }, "P1-5": { style: 0, tint: 0x56606c }, "P1-6": { style: 1, tint: 0xa79a86 },
    "P2-1": { style: 0, tint: 0x2f3d4a }, "P2-2": { style: 1, tint: 0xd0c6b1 }, "P2-3": { style: 3, tint: 0x20262e },
    "P3-1": { style: 1, tint: 0xb9ae99 }, "P3-2": { style: 0, tint: 0x3a4553 }, "P3-3": { style: 2, tint: 0x6f3c2d }, "P3-4": { style: 3, tint: 0x14181e }
  };
  const WEIGHT = { "P1-1": 14, "P1-2": 17, "P1-3": 17, "P1-4": 15, "P1-5": 11, "P1-6": 11, "P2-1": 30, "P2-2": 37, "P2-3": 18, "P3-1": 26, "P3-2": 25, "P3-3": 20, "P3-4": 14 };
  /* slot order: alternate sides, nearest the part's camera first */
  const ORDER = { 1: [6, 7, 4, 5, 2, 3, 0, 1], 2: [2, 3, 0, 1], 3: [2, 3, 0, 1] };
  for (const p of [1, 2, 3]) { const s = slots[p]; slots[p] = ORDER[p].map(i => s[i]).filter(Boolean); }
  const unitBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  function soloBox(w, h, d, style, seed) {
    const g = unitBox.clone(), n = g.attributes.position.count; g.scale(w, h, d);
    g.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(n).fill(seed), 1));
    g.setAttribute("aStyle", new THREE.BufferAttribute(new Float32Array(n).fill(style), 1)); return g;
  }
  const netTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"); x.fillStyle = "#2a2a2a"; x.fillRect(0, 0, 32, 32); x.fillStyle = "#fff"; x.fillRect(0, 0, 32, 4); x.fillRect(0, 0, 4, 32); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 6); return t; })();
  const yellowM = new THREE.MeshStandardMaterial({ color: 0xf2b200, roughness: 0.55, metalness: 0.2 });
  const concM = new THREE.MeshStandardMaterial({ color: 0x8c8a86, roughness: 0.9 });
  const redLightM = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.2) });
  const netM = new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff4a00, emissiveIntensity: 0.25, alphaMap: netTex, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const B = {}, pickables = [];
  for (const p of [1, 2, 3]) {
    const ids = Object.keys(TDEF).filter(d => d.startsWith("P" + p));
    ids.forEach((d, i) => {
      const lot = slots[p][i]; if (!lot) return;
      const def = TDEF[d], w = lot.x1 - lot.x0, dd = lot.z1 - lot.z0, H = Math.round(100 + WEIGHT[d] * 3.2), seed = 13.7 * (i + 1) + p * 101;
      const g = new THREE.Group(); g.position.set((lot.x0 + lot.x1) / 2, 0, (lot.z0 + lot.z1) / 2); scene.add(g);
      const below = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), above = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const clad = facadeMat({ color: def.tint, clippingPlanes: [below] }), frame = facadeMat({ clippingPlanes: [above] });
      const mdl = MODELS[def.style];
      let topW = w - 10, topD = dd - 8; /* footprint of the top floors, where the netting goes */
      if (mdl) {
        const geoOf = (name, style) => { const geo = mdl.getObjectByName(name).geometry.clone().scale(1, H, 1), n = geo.attributes.position.count; /* tiers come at unit height */
          geo.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(n).fill(seed), 1));
          geo.setAttribute("aStyle", new THREE.BufferAttribute(new Float32Array(n).fill(style), 1)); return geo; };
        const bg = geoOf("Body", def.style), pa = bg.attributes.position; topW = topD = 0;
        for (let k = 0; k < pa.count; k++) if (pa.getY(k) > H - 1) { topW = Math.max(topW, 2 * Math.abs(pa.getX(k))); topD = Math.max(topD, 2 * Math.abs(pa.getZ(k))); }
        const mc = new THREE.Mesh(bg, clad); mc.userData.d = d; g.add(mc); pickables.push(mc);
        const mf = new THREE.Mesh(geoOf("Frame", 4), frame); mf.userData.d = d; g.add(mf); pickables.push(mf);
      } else for (const [pw, ph, pd, y0] of [[w, H * 0.7, dd, 0], [w - 10, H * 0.3, dd - 8, H * 0.7]]) {
        const mc = new THREE.Mesh(soloBox(pw, ph, pd, def.style, seed), clad); mc.position.y = y0; mc.userData.d = d; g.add(mc); pickables.push(mc);
        const mf = new THREE.Mesh(soloBox(pw - 0.5, ph, pd - 0.5, 4, seed), frame); mf.position.y = y0; mf.userData.d = d; g.add(mf); pickables.push(mf);
      }
      const nm = netM.clone(); nm.clippingPlanes = [above];
      const net = new THREE.Mesh(new THREE.BoxGeometry(topW + 1, 15, topD + 1).translate(0, H - 7, 0), nm); g.add(net);
      const hoist = new THREE.Mesh(new THREE.BoxGeometry(2.2, H, 2.4).translate(0, H / 2, 0), yellowM); hoist.position.set(0, 0, ((mdl ? topD : dd) / 2 + 1.3) * lot.side); g.add(hoist);
      const crane = new THREE.Group(); crane.position.set(lot.nx * -4, H, 0); g.add(crane);
      crane.add(new THREE.Mesh(new THREE.BoxGeometry(2, 26, 2).translate(0, 13, 0), yellowM));
      const jib = new THREE.Group(); jib.position.y = 26; crane.add(jib);
      jib.add(new THREE.Mesh(new THREE.BoxGeometry(44, 1.5, 1.5).translate(16, 0.75, 0), yellowM));
      jib.add(new THREE.Mesh(new THREE.BoxGeometry(5, 3.5, 3).translate(-10, -0.5, 0), concM));
      jib.add(new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3).translate(1.5, -1.5, 1.7), yellowM));
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), redLightM); tip.position.set(38, 2, 0); jib.add(tip);
      jib.rotation.y = rnd() * 6.28;
      const crownM = new THREE.MeshStandardMaterial({ color: 0x8a6a2a, emissive: 0xffc04a, emissiveIntensity: 0.5 });
      let crown;
      if (mdl) { /* the modeled crown: baked metal, lamps that glow like the old gold box in the model's color, a red mast light */
        crown = new THREE.Group(); crown.position.y = H; crown.rotation.y = lot.nx > 0 ? Math.PI : 0; /* a sloped top faces the canyon */
        const shell = mdl.getObjectByName("Crown"), glow = mdl.getObjectByName("Glow");
        crown.add(new THREE.Mesh(shell.geometry, shell.material));
        crownM.emissive.copy(glow.material.emissive).multiplyScalar(glow.material.emissiveIntensity / 4); crown.add(new THREE.Mesh(glow.geometry, crownM));
        crown.add(new THREE.Mesh(mdl.getObjectByName("Beacon").geometry, redLightM));
      } else crown = new THREE.Mesh(new THREE.BoxGeometry(w - 16, 9, dd - 13).translate(0, H + 4.5, 0), crownM);
      g.add(crown);
      const top = mdl ? new THREE.Box3().setFromObject(crown).max.y : H + 8; /* highest point when finished: labels and fireworks clear it */
      B[d] = { id: d, part: p, g, H, top, x: g.position.x, z: g.position.z, below, above, clad, net, hoist, crane, jib, crown, crownM, m: 0, target: 0, from: 0, hl: false };
      walls.push({ x: lot.wallX, nx: lot.nx, z0: lot.z0, z1: lot.z1, h: 22, n: false, s: false, depth: TDEPTH });
    });
    for (let i = ids.length; i < slots[p].length; i++) { const l = slots[p][i]; building(l.x0, l.x1, l.z0, l.z1, { maxCap: 140 }); }
  }
  let viewTS = false, currentPart = "1";
  function applyCut(b) {
    const done = b.m >= 0.999, cut = done ? b.H + 200 : Math.max(0.3, Math.round(b.H * b.m / 4) * 4);
    b.below.constant = cut; b.above.constant = -cut;
    b.net.visible = b.hoist.visible = !done; b.crown.visible = done;
    b.crane.visible = !done && ((String(b.part) === currentPart && !viewTS) || !!fs);
  }

  /* rooftop spectaculars: big signs on the low roofs along the canyon, at its edge and on the block corners facing up the canyon */
  const roofSigns = [];
  for (const wl of walls) {
    if (wl.h <= 22 || wl.h > 75 || rnd() > 0.6) continue;
    const corner = wl.n && rnd() < 0.6, h = 8 + rnd() * 9;
    if (corner) { const w = Math.min(wl.depth - 4, 14 + rnd() * 12), x = wl.x - wl.nx * (w / 2 + 1.5), z = wl.z0 + 1.6;
      addT(x, wl.h, z + 0.5, w, h + 2, 0.8, 3, rnd() * 1000, 0x14181e); roofSigns.push([x, wl.h + 2 + h / 2, z - 0.05, w - 0.4, h - 0.4, 0, -1]); }
    else { const w = Math.min(wl.z1 - wl.z0 - 4, 16 + rnd() * 16), x = wl.x - wl.nx * 1.4, z = (wl.z0 + wl.z1) / 2 + (rnd() - 0.5) * (wl.z1 - wl.z0 - 4 - w);
      addT(x - wl.nx * 0.5, wl.h, z, 0.8, h + 2, w, 3, rnd() * 1000, 0x14181e); roofSigns.push([x + wl.nx * 0.05, wl.h + 2 + h / 2, z, w - 0.4, h - 0.4, wl.nx, 0]); }
  }

  /* ---------- build the instanced city ---------- */
  function instanced(list, geo, mat) {
    const n = list.length, im = new THREE.InstancedMesh(geo, mat, n), M = new THREE.Matrix4(), col = new THREE.Color();
    const seeds = new Float32Array(n), styles = new Float32Array(n);
    list.forEach((t, i) => { M.makeScale(t[3], t[4], t[5]); M.setPosition(t[0], t[1], t[2]); im.setMatrixAt(i, M); seeds[i] = t[7]; styles[i] = t[6]; im.setColorAt(i, col.setHex(t[8])); });
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1)); geo.setAttribute("aStyle", new THREE.InstancedBufferAttribute(styles, 1));
    im.computeBoundingSphere(); return im;
  }
  scene.add(instanced(towers, unitBox.clone(), facadeMat()));
  { /* fire escapes (platforms and stairs), their railings, awnings */
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), col = new THREE.Color();
    const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), upright = new THREE.PlaneGeometry(1, 1);   /* thin parts are single quads */
    const ironM = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide });
    const bars = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 16; const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, 64, 16); x.fillStyle = "#fff"; x.fillRect(0, 0, 64, 2); for (let i = 0; i < 64; i += 8) x.fillRect(i, 0, 2, 16); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(5, 1); return t; })();
    const railM = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.6, metalness: 0.4, alphaMap: bars, alphaTest: 0.5, side: THREE.DoubleSide });
    const make = (list, geo, mat, rot, colors) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((b, i) => { e.set(rot === "x" ? b[6] * 0.35 : 0, 0, rot === "z" ? b[6] : 0); q.setFromEuler(e); M.compose(V1.set(b[0], b[1], b[2]), q, V2.set(b[3], b[4], b[5])); im.setMatrixAt(i, M); if (colors) im.setColorAt(i, col.setHex(b[7])); });
      im.computeBoundingSphere(); scene.add(im); return im; };
    make(escapes, flat, ironM, "z"); make(rails, upright, railM, "z");
    make(awnings, flat, new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }), "x", true);
  }
  { const rm = new THREE.InstancedMesh(unitBox.clone(), new THREE.MeshStandardMaterial({ color: 0x5c5e63, roughness: 0.85 }), roofBoxes.length), M = new THREE.Matrix4(); roofBoxes.forEach((b, i) => { M.makeScale(b[3], b[4], b[5]); M.setPosition(b[0], b[1], b[2]); rm.setMatrixAt(i, M); }); rm.computeBoundingSphere(); scene.add(rm); }
  { /* rooftop water tanks */
    const parts = [new THREE.CylinderGeometry(2.4, 2.4, 4.4, 12).translate(0, 4.6, 0), new THREE.ConeGeometry(2.6, 1.8, 12).translate(0, 7.7, 0), new THREE.BoxGeometry(4, 2.4, 4).translate(0, 1.2, 0)].map(g => g.toNonIndexed());
    const geo = new THREE.BufferGeometry();
    for (const a of ["position", "normal"]) { const arr = new Float32Array(parts.reduce((s, g) => s + g.attributes[a].array.length, 0)); let o = 0; for (const g of parts) { arr.set(g.attributes[a].array, o); o += g.attributes[a].array.length; } geo.setAttribute(a, new THREE.BufferAttribute(arr, 3)); }
    const tm = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.9 }), tanks.length), M = new THREE.Matrix4();
    tanks.forEach((t, i) => { M.makeScale(t[3], t[3], t[3]); M.setPosition(t[0], t[1], t[2]); tm.setMatrixAt(i, M); }); tm.computeBoundingSphere(); scene.add(tm);
  }
  { /* lit crowns */
    const pyr = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
    const cm = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.6 });
    cm.onBeforeCompile = sh => { sh.uniforms.uNight = U.night; sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uNight;").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\ntotalEmissiveRadiance += vColor * 1.7 * uNight;\n#endif"); };
    const M = new THREE.Matrix4(), col = new THREE.Color();
    for (const kind of [0, 1]) {
      const list = crowns.filter(c => c[7] === kind); if (!list.length) continue;
      const im = new THREE.InstancedMesh(kind === 0 ? pyr : unitBox.clone(), cm, list.length);
      list.forEach((c, i) => { M.makeScale(c[3], c[4], c[5]); M.setPosition(c[0], c[1], c[2]); im.setMatrixAt(i, M); im.setColorAt(i, col.setHex(c[6])); }); im.computeBoundingSphere(); scene.add(im);
    }
  }

  /* ---------- ground: streets, plaza, crosswalks, park, streetlight pools and traffic light streams in one shader ---------- */
  const GROUND = `
{
  vec2 p = vGPos.xz;
  float ai = floor(p.x / 260.0 + 0.5), axd = p.x - ai * 260.0, dx = abs(axd);
  float si = floor(p.y / 80.0 + 0.5), szd = p.y - si * 80.0, dz = abs(szd);
  float avH = ai == 0.0 ? 18.0 : 15.0;
  float inC = (ai == 0.0 && p.y > -205.0 && p.y < 245.0) ? 1.0 : 0.0;
  float onAve = step(dx, avH), onSt = step(dz, 9.0);
  float aveRoad = step(dx, avH - 4.5), stRoad = step(dz, 5.5);
  if (inC > 0.5) aveRoad = step(4.0, axd) * step(axd, 14.0);
  float road = max(aveRoad, stRoad), street = max(onAve, onSt);
  float plaza = inC * step(-14.0, axd) * step(axd, 4.0) * (1.0 - stRoad);
  float park = step(-258.0, p.x) * step(p.x, 518.0) * step(p.y, -1102.0);
  vec2 fwp = fwidth(p); float farK = smoothstep(0.5, 3.0, max(fwp.x, fwp.y));
  vec3 col = vec3(0.07); float rough = 0.9;
  if (street > 0.5) { col = vec3(0.15, 0.15, 0.16); rough = 0.6; }
  if (plaza > 0.5) { col = vec3(0.17, 0.16, 0.18) * (0.85 + 0.3 * fh21(floor(p / 1.6))); rough = 0.3; }
  if (road > 0.5) { col = vec3(0.03, 0.032, 0.038); rough = 0.2; }
  float mark = 0.0;
  if (road > 0.5) {
    float zebraA = aveRoad * step(5.8, dz) * step(dz, 8.8) * step(0.5, fract(p.x / 1.1));
    float zebraS = stRoad * (1.0 - aveRoad) * step(avH - 4.4, dx) * step(dx, avH - 1.4) * step(0.5, fract(p.y / 1.1));
    float lane = aveRoad * (1.0 - stRoad) * (1.0 - smoothstep(0.07, 0.07 + fwp.x, abs(fract(axd / 3.4 + 0.5) - 0.5) * 3.4)) * step(0.5, fract(p.y / 9.0));
    mark = max(max(zebraA, zebraS), lane) * (1.0 - farK);
  }
  if (park > 0.5) { col = vec3(0.035, 0.065, 0.03) * (0.7 + 0.6 * fh21(floor(p / 9.0))); rough = 1.0; mark = 0.0; street = 0.0; road = 0.0; }
  col = mix(col, vec3(0.62), mark);
  if (park < 0.5 && street > 0.5 && farK < 0.98) { /* puddles, and leaves along the tree-lined streets */
    float tsq = (ai == 0.0 && p.y > -235.0 && p.y < 275.0) || (abs(p.x) < 95.0 && p.y > -235.0 && p.y < 275.0) ? 1.0 : 0.0;
    float pn = vnoise(p / 7.0) * 0.65 + vnoise(p / 2.3) * 0.35;
    float puddle = smoothstep(0.64, 0.69, pn) * (1.0 - farK) * (1.0 - 0.6 * tsq);
    col = mix(col, col * 0.45, puddle); rough = mix(rough, 0.12, puddle);
    vec2 lp = p / 0.3, lc = floor(lp);
    float near = onSt > 0.5 && onAve < 0.5 ? 1.0 : 0.25;
    float dens = mix(0.03, 0.3, near * smoothstep(0.3, 0.75, vnoise(p / 5.0))) * (1.0 - road * 0.55) * (1.0 - tsq);
    float leaf = step(1.0 - dens, fh21(lc + 17.0)) * step(length(fract(lp) - 0.5), 0.42) * (1.0 - farK) * (1.0 - puddle * 0.6);
    vec3 lcol = mix(vec3(0.8, 0.36, 0.06), vec3(0.92, 0.68, 0.16), fh21(lc + 3.0)); lcol = mix(lcol, vec3(0.55, 0.1, 0.04), step(0.8, fh21(lc + 9.0)));
    col = mix(col, lcol * 0.6, leaf); rough = mix(rough, 0.9, leaf);
  }
  vec3 em = vec3(0.0);
  float along = onAve > 0.5 ? p.y : p.x;
  float curbD = onAve > 0.5 ? abs(dx - (avH - 4.5)) : abs(dz - 5.5);
  float pool = exp(-curbD * curbD / 20.0) * (0.5 + 0.5 * cos(6.2832 * along / 28.0));
  float inCy = (ai == 0.0 && p.y > -215.0 && p.y < 250.0) ? 1.0 : 0.0;
  em += vec3(1.0, 0.56, 0.24) * mix(pool, 0.7, farK) * 0.45 * street * (1.0 - 0.7 * inCy);
  if (inCy > 0.5 && dx < 18.0) { /* each screen throws its own color on the pavement in front of it */
    float side = axd > 0.0 ? 3.0 : 7.0, sz = p.y / 15.0 + side, f = smoothstep(0.2, 0.8, fract(sz));
    vec3 c0 = neonAt(fh21(vec2(floor(sz), side))), c1 = neonAt(fh21(vec2(floor(sz) + 1.0, side)));
    float flick = 0.8 + 0.2 * sin(uTime * 0.9 + floor(sz) * 2.3);
    em += mix(c0, c1, f) * exp(-(18.0 - dx) / 3.0) * 0.55 * flick * (0.55 + 0.45 * fh21(floor(p * 0.7))) * (1.0 - 0.6 * road);
    em += mix(vec3(0.9, 0.1, 0.5), vec3(0.1, 0.55, 1.0), 0.5 + 0.5 * sin(p.y * 0.031)) * 0.018;
  }
  if (road > 0.5 && park < 0.5 && !(aveRoad > 0.5 && stRoad > 0.5)) {
    float lanePos = 1000.0, t = 0.0, sd = 0.0, dir = 1.0;
    if (aveRoad > 0.5 && inC < 0.5) { lanePos = axd; t = p.y; sd = ai; dir = mod(ai, 2.0) < 0.5 ? 1.0 : -1.0; }
    else if (stRoad > 0.5) { lanePos = szd; t = p.x; sd = si + 57.0; dir = mod(si, 2.0) < 0.5 ? 1.0 : -1.0; }
    float li = floor(lanePos / 3.2), lf = abs(fract(lanePos / 3.2) - 0.5);
    float laneMask = 1.0 - smoothstep(0.16, 0.26, lf);
    float h = fh21(vec2(li, sd));
    float ph = fract((t * dir + uTime * (8.0 + 6.0 * h) + h * 300.0) / (16.0 + 22.0 * h));
    float car = smoothstep(0.0, 0.015, ph) * (1.0 - smoothstep(0.05, 0.075, ph));
    vec3 lc = h > 0.5 ? vec3(2.6, 0.22, 0.12) : vec3(2.2, 2.0, 1.7);
    em += lc * mix(car * laneMask, 0.06, farK) * (aveRoad > 0.5 ? 1.0 : 0.55);
  }
  diffuseColor.rgb = col; roughnessFactor = rough; metalnessFactor = 0.0;
  totalEmissiveRadiance += em * uNight;
}`;
  const VNOISE = "float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(fh21(i), fh21(i + vec2(1.0, 0.0)), f.x), mix(fh21(i + vec2(0.0, 1.0)), fh21(i + vec2(1.0, 1.0)), f.x), f.y); }";
  const NEONAT = "vec3 neonAt(float h) { return h < 0.34 ? vec3(1.0, 0.08, 0.42) : h < 0.62 ? vec3(0.04, 0.68, 1.0) : h < 0.8 ? vec3(0.55, 0.12, 1.0) : h < 0.92 ? vec3(1.0, 0.5, 0.08) : vec3(0.9, 0.9, 1.0); }";
  const gMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  gMat.onBeforeCompile = sh => {
    sh.uniforms.uNight = U.night; sh.uniforms.uTime = U.time;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGPos;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvGPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nuniform float uNight; uniform float uTime; varying vec3 vGPos;\n${HASH}\n${VNOISE}\n${NEONAT}`).replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + GROUND);
  };
  gMat.customProgramCacheKey = () => "ground";
  const plane = (x0, x1, z0, z1, m, y = 0) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), m); o.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); scene.add(o); return o; };
  plane(-1300, 2100, -5200, 3600, gMat); plane(-8000, -2300, -6000, 6000, gMat); plane(2900, 8000, -6000, 6000, gMat);
  plane(-12000, 12000, -12000, 12000, new THREE.MeshStandardMaterial({ color: 0x06101a, roughness: 0.1, metalness: 0.7 }), -1.2);
  const FALL = [0xd9661a, 0xe88a1f, 0xc23a1a, 0xf0b429, 0xb8461d, 0x9c2f14, 0xe0a030, 0xcf7a22, 0x8a8f2a];
  const leafM = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  { const n = low ? 300 : 900, im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), leafM, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    for (let i = 0; i < n; i++) { const s = 4 + rnd() * 5; M.compose(new THREE.Vector3(PARK.x0 + 8 + rnd() * (PARK.x1 - PARK.x0 - 16), s * 0.9, PARK.z1 - 10 - rnd() * 2000), q, new THREE.Vector3(s, s * 0.85, s)); im.setMatrixAt(i, M); im.setColorAt(i, col.setHex(rnd() < 0.2 ? 0x3f5a22 : pick(FALL)).multiplyScalar(0.8)); }
    im.computeBoundingSphere(); scene.add(im); }
  { /* street trees on the cross streets: none in Times Square itself */
    const list = [];
    for (let j = -9; j <= 8; j++) for (const side of [-1, 1]) {
      const z = j * ST + side * 6.7;
      for (let x = -770; x < 840; x += (low ? 18 : 11) + rnd() * 6) {
        const ai = Math.round(x / AVE);
        if (Math.hypot(x - 40, z) > 860 || Math.abs(x - ai * AVE) < avHalf(ai) + 4 || (Math.abs(x) < 90 && z > CANYON.z0 - 30 && z < CANYON.z1 + 30) || rnd() < 0.15) continue;
        list.push([x, z, 2.3 + rnd() * 1.1, pick(FALL)]);
      }
    }
    const lump = (low ? [[0, 0, 0, 1]] : [[0, 0, 0, 1], [0.55, 0.32, 0.3, 0.74]]).map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 0).translate(x, y, z).toNonIndexed());
    const crownG = new THREE.BufferGeometry(); { const arr = new Float32Array(lump.reduce((a, g) => a + g.attributes.position.array.length, 0)); let o = 0; for (const g of lump) { arr.set(g.attributes.position.array, o); o += g.attributes.position.array.length; } crownG.setAttribute("position", new THREE.BufferAttribute(arr, 3)); crownG.computeVertexNormals(); }
    const crownsM = new THREE.InstancedMesh(crownG, leafM, list.length), trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.2, 1, 4, 1, true).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x2b2018, roughness: 1 }), list.length);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    list.forEach(([x, z, r, c], i) => { e.set(0, rnd() * 6.28, 0); q.setFromEuler(e); M.compose(new THREE.Vector3(x, 4.2 + r * 0.75, z), q, new THREE.Vector3(r, r * 0.95, r)); crownsM.setMatrixAt(i, M); crownsM.setColorAt(i, col.setHex(c));
      M.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(1, 4.4 + r * 0.3, 1)); trunks.setMatrixAt(i, M); });
    crownsM.computeBoundingSphere(); trunks.computeBoundingSphere(); scene.add(crownsM, trunks); }

  /* ---------- screens: one atlas, every panel scrolls on its own, all in one draw ---------- */
  const NEON = ["#ff2d78", "#00e5ff", "#ffcf3f", "#b43cff", "#10d9a0", "#ff6b35", "#ffffff", "#3d7bff", "#ff3b3b"];
  const SHOWS = ["FORM 1040: THE MUSICAL", "SCHEDULE C", "THE AUDIT", "DEPRECIATION NIGHTS", "CIRCULAR 230", "THE EXTENSION", "ENROLLED", "BASIS"];
  const WORDS = ["REFUND", "1099", "W-2", "DEDUCT", "K-1", "QBI", "AMT", "LEDGER", "BASIS", "FILE"];
  const FACTS = [["STANDARD DEDUCTION 2025", "$15,750 SINGLE"], ["SALT CAP 2025", "$40,000"], ["CHILD TAX CREDIT 2025", "$2,200"], ["FBAR THRESHOLD", "OVER $10,000"], ["HOME SALE EXCLUSION", "$250K / $500K"], ["GIFT EXCLUSION 2025", "$19,000"], ["SECTION 179 LIMIT 2025", "$2,500,000"], ["BUSINESS MILEAGE 2025", "70 CENTS"], ["COLLECTION STATUTE", "10 YEARS"], ["EA CONTINUING EDUCATION", "16 HOURS A YEAR"], ["ESTATE EXCLUSION 2025", "$13,990,000"], ["TAX COURT PETITION", "90 DAYS"]];
  const ACOLS = 4, AROWS = 8, CW = 512, CH = 256;
  function fitText(x, t, mw, mh, wt) { let fs = Math.floor(mh); do { x.font = `${wt} ${fs}px Inter, system-ui, Arial, sans-serif`; if (x.measureText(t).width <= mw) break; fs -= 2; } while (fs > 8); }
  const atlas = (() => {
    const c = document.createElement("canvas"); c.width = ACOLS * CW; c.height = AROWS * CH; const x = c.getContext("2d");
    for (let i = 0; i < ACOLS * AROWS; i++) {
      const k = i % 10; x.save(); x.translate((i % ACOLS) * CW, Math.floor(i / ACOLS) * CH); x.beginPath(); x.rect(0, 0, CW, CH); x.clip();
      const a = pick(NEON), b = pick(NEON.filter(c => c !== a));
      const grad = v => { const g = v ? x.createLinearGradient(0, 0, 0, CH) : x.createLinearGradient(0, 0, CW, 0); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, CW, CH); };
      x.textAlign = "center"; x.textBaseline = "middle";
      if (k === 0) { grad(true); x.lineWidth = 14; for (let j = 0; j < 6; j++) { x.strokeStyle = pick(NEON); x.globalAlpha = 0.8; x.beginPath(); for (let u = 0; u <= CW; u += 8) x.lineTo(u, 30 + j * 38 + Math.sin(u / CW * Math.PI * 4 + j) * 18); x.stroke(); } }
      if (k === 1) { x.fillStyle = "#100a26"; x.fillRect(0, 0, CW, CH); for (let j = 0; j < 40; j++) { x.globalAlpha = 0.9; x.fillStyle = pick(NEON); x.fillRect(rnd() * CW, rnd() * CH, 20 + rnd() * 120, 14 + rnd() * 70); } }
      if (k === 2) { x.fillStyle = "#08061a"; x.fillRect(0, 0, CW, CH); for (let j = 0; j < 55; j++) { const cx = rnd() * CW, cy = rnd() * CH, r = 8 + rnd() * 40, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, pick(NEON)); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); } }
      if (k === 3) { for (let j = -8; j < 24; j++) { x.fillStyle = [a, b, "#120c2a", pick(NEON)][(j + 8) % 4]; x.beginPath(); x.moveTo(j * 40, 0); x.lineTo(j * 40 + 40, 0); x.lineTo(j * 40 - 216, CH); x.lineTo(j * 40 - 256, CH); x.fill(); } }
      if (k === 4 || k === 8) { const show = SHOWS[i % SHOWS.length]; x.fillStyle = k === 4 ? "#120a1e" : "#fff6e2"; x.fillRect(0, 0, CW, CH); x.fillStyle = a; x.fillRect(0, CH - 34, CW, 34); x.fillStyle = k === 4 ? "#fff" : "#1b1f2e"; fitText(x, show, CW * 0.9, CH * 0.36, 900); x.fillText(show, CW / 2, CH * 0.42); x.fillStyle = k === 4 ? a : "#c6123f"; fitText(x, "NOW PLAYING", CW * 0.5, 30, 800); x.fillText("NOW PLAYING", CW / 2, CH * 0.14); }
      if (k === 5) { const f = FACTS[i % FACTS.length]; grad(false); x.fillStyle = "rgba(0,0,0,0.25)"; x.fillRect(0, 0, CW, CH); x.fillStyle = "#fff"; fitText(x, f[1], CW * 0.88, CH * 0.44, 900); x.fillText(f[1], CW / 2, CH * 0.44); fitText(x, f[0], CW * 0.88, CH * 0.13, 800); x.fillText(f[0], CW / 2, CH * 0.8); }
      if (k === 6) { grad(true); x.beginPath(); x.arc(CW * 0.22, CH / 2, 72, 0, 7); x.fillStyle = "#120a26"; x.fill(); const wd = WORDS[i % WORDS.length]; x.fillStyle = "#fff"; fitText(x, wd, CW * 0.55, CH * 0.5, 900); x.fillText(wd, CW * 0.64, CH / 2); }
      if (k === 7) { x.fillStyle = "#060814"; x.fillRect(0, 0, CW, CH); for (let j = 0; j < 30; j++) { const bw = 10 + rnd() * 40, bh = 40 + rnd() * 180, bx = rnd() * CW; x.fillStyle = "#151a2e"; x.fillRect(bx, CH - bh, bw, bh); x.fillStyle = a; for (let q = 0; q < bh / 10; q++) if (rnd() < 0.4) x.fillRect(bx + 3, CH - bh + q * 10 + 3, bw - 6, 3); } }
      if (k === 9) { x.fillStyle = "#07060f"; x.fillRect(0, 0, CW, CH); const wd = WORDS[(i * 3) % WORDS.length]; x.shadowColor = a; x.shadowBlur = 30; x.strokeStyle = a; x.lineWidth = 10; fitText(x, wd, CW * 0.8, CH * 0.6, 900); x.strokeText(wd, CW / 2, CH / 2); x.shadowBlur = 0; x.fillStyle = "#fff"; x.fillText(wd, CW / 2, CH / 2); }
      x.globalAlpha = 1; x.restore();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  const BB_V = `attribute vec2 aLocal; attribute vec4 aRect; attribute vec4 aAnim;
varying vec2 vL; varying vec4 vR; varying vec4 vA;
#include <fog_pars_vertex>
void main() { vL = aLocal; vR = aRect; vA = aAnim; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
  const BB_F = `uniform sampler2D map; uniform float uTime; uniform float uBright;
varying vec2 vL; varying vec4 vR; varying vec4 vA;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec2 rep = vec2(max(1.0, floor(vA.x + 0.5)), max(1.0, floor(1.0 / vA.x + 0.5)));
#ifdef REFL
  vec2 l = fract(vec2(vL.x * rep.x + vA.y * uTime, 0.12));
  vec3 c = texture2D(map, vR.xy + l * vR.zw, 3.0).rgb;
  float fade = pow(clamp(vL.y, 0.0, 1.0), 2.2) * (0.45 + 0.55 * sin(vL.x * 90.0) * sin(vL.y * 23.0 + vL.x * 7.0)) * 0.34;
  gl_FragColor = vec4(c * fade * vA.w * uBright, 1.0);
#else
  vec2 l = fract(vL * rep + vA.yz * uTime);
  vec3 c = texture2D(map, vR.xy + l * vR.zw).rgb;
  vec2 e = min(vL, 1.0 - vL); float bez = smoothstep(0.0, 0.012, min(e.x * vA.x, e.y));
  gl_FragColor = vec4(c * vA.w * uBright * mix(0.15, 1.0, bez), 1.0);
#endif
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`;
  const bbBright = { value: 1 }, reflBright = { value: 1 };
  function screenMat(map, refl) {
    const m = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null } }]), vertexShader: BB_V, fragmentShader: BB_F, fog: true });
    m.uniforms.map.value = map; m.uniforms.uTime = U.time; m.uniforms.uBright = refl ? reflBright : bbBright;
    if (refl) Object.assign(m, { defines: { REFL: 1 }, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    return m;
  }
  const BBS = { p: [], l: [], r: [], a: [], i: [] }, RF = { p: [], l: [], r: [], a: [], i: [] };
  const UP = new THREE.Vector3(0, 1, 0);
  function quad(store, c, right, up, w, h, rect, anim) {
    const n = store.p.length / 3;
    for (const [sx, sy] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      store.p.push(c.x + right.x * sx * w + up.x * sy * h, c.y + right.y * sx * w + up.y * sy * h, c.z + right.z * sx * w + up.z * sy * h);
      store.l.push(sx + 0.5, sy + 0.5); store.r.push(...rect); store.a.push(...anim);
    }
    store.i.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  const stats = [];
  for (let s = 0; s < 5; s++) { const c = document.createElement("canvas"); c.width = 768; c.height = 384; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; stats.push({ c, x: c.getContext("2d"), tex, quads: [], i: s, pal: s }); }
  function billboard(c, nrm, w, h, o = {}) {
    const right = new THREE.Vector3().crossVectors(UP, nrm).normalize();
    if (o.stat != null) { stats[o.stat].quads.push([c.clone(), right, w, h]); return; }
    const cell = Math.floor(rnd() * ACOLS * AROWS), rect = [(cell % ACOLS) / ACOLS, 1 - (Math.floor(cell / ACOLS) + 1) / AROWS, 1 / ACOLS, 1 / AROWS];
    const aspect = (w / h) / (CW / CH), mv = rnd(), sx = mv < 0.45 ? (0.015 + rnd() * 0.05) * (rnd() < 0.5 ? -1 : 1) : 0, sy = mv > 0.8 ? 0.03 + rnd() * 0.04 : 0, br = 0.85 + rnd() * 0.6;
    quad(BBS, c, right, UP, w, h, rect, [aspect, sx, sy, br]);
    if (c.y - h / 2 < 9) { const len = Math.min(12, 4 + h * 0.7), fc = new THREE.Vector3().copy(c).addScaledVector(nrm, len / 2 + 0.3); fc.y = 0.04; quad(RF, fc, right, new THREE.Vector3().copy(nrm).negate(), w, len, rect, [aspect, sx, 0, br]); }
  }
  for (const wl of walls) {
    const nrm = new THREE.Vector3(wl.nx, 0, 0), top = wl.h <= 22 ? wl.h - 2 : Math.min(wl.h - 3, 36 + rnd() * 36);
    let y = 4.8, row = 0;
    while (y < top - 2) {
      const big = row++ > 0, rh = Math.min(top - y, big ? 8 + rnd() * 14 : 3.2 + rnd() * 3.5); let z = wl.z0 + 0.4;
      while (z < wl.z1 - 2.4) { let pw = Math.min(wl.z1 - 0.4 - z, big ? 12 + rnd() * 30 : 5 + rnd() * 14); if (wl.z1 - 0.4 - z - pw < 6) pw = wl.z1 - 0.4 - z; billboard(new THREE.Vector3(wl.x + wl.nx * 0.2, y + rh / 2, z + pw / 2), nrm, pw - 0.3, rh - 0.3, rnd() < 0.08 ? { stat: Math.floor(rnd() * 5) } : {}); z += pw; }
      y += rh;
    }
    for (const [is, zf, nz] of [[wl.n, wl.z0, -1], [wl.s, wl.z1, 1]]) {
      if (!is) continue; const span = Math.min(wl.depth - 2, 14 + rnd() * 22), x0 = wl.x - wl.nx * 0.4, n2 = new THREE.Vector3(0, 0, nz); let yy = 4.8;
      while (yy < top - 2) { const rh = Math.min(top - yy, 6 + rnd() * 14); billboard(new THREE.Vector3(x0 - wl.nx * span / 2, yy + rh / 2, zf + nz * 0.2), n2, span, rh - 0.3); yy += rh; }
    }
  }
  for (const [x, y, z, w, h, nx, nz] of roofSigns) billboard(new THREE.Vector3(x, y, z), new THREE.Vector3(nx, 0, nz), w, h);
  { let y = 7, k = 0;
    while (y < OTS.h - 6) {
      const rh = 7 + rnd() * 9;
      billboard(new THREE.Vector3(0, y + rh / 2, OTS.z0 - 0.2), new THREE.Vector3(0, 0, -1), 21.4, rh - 0.4, k % 2 === 0 ? { stat: k / 2 % 5 } : {});
      billboard(new THREE.Vector3(OTS.x1 + 0.2, y + rh / 2, 222), new THREE.Vector3(1, 0, 0), 19.4, rh - 0.4);
      billboard(new THREE.Vector3(OTS.x0 - 0.2, y + rh / 2, 222), new THREE.Vector3(-1, 0, 0), 19.4, rh - 0.4);
      billboard(new THREE.Vector3(0, y + rh / 2, OTS.z1 + 0.2), new THREE.Vector3(0, 0, 1), 21.4, rh - 0.4);
      y += rh; k++;
    } }
  function storeMesh(s, mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.p, 3)); g.setAttribute("aLocal", new THREE.Float32BufferAttribute(s.l, 2));
    g.setAttribute("aRect", new THREE.Float32BufferAttribute(s.r, 4)); g.setAttribute("aAnim", new THREE.Float32BufferAttribute(s.a, 4)); g.setIndex(s.i);
    const m = new THREE.Mesh(g, mat); scene.add(m); return m;
  }
  storeMesh(BBS, screenMat(atlas)); const reflMesh = storeMesh(RF, screenMat(atlas, true)); reflMesh.renderOrder = 2;
  /* live-number screens: one canvas each, shared by every place it appears */
  let HUD = { part: "1", ready: 0, due: 0, streak: 0, today: 0, goal: 20, gap: "" };
  const SPALS = [["#ff2d78", "#ff9a3c"], ["#00b4ff", "#6b4dff"], ["#ffcf3f", "#ff5e35"], ["#10d9a0", "#0077ff"], ["#b43cff", "#ff3c8e"]];
  function drawStat(s) {
    const { x, c } = s, W = c.width, H = c.height, kinds = ["ready", "fact", "due", "streak", "gap", "today", "fact"], kind = kinds[s.i % kinds.length], pal = SPALS[(s.pal + s.i) % SPALS.length];
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(255,255,255,0.07)"; for (let y = 0; y < H; y += 6) x.fillRect(0, y, W, 2);
    let big, small;
    if (kind === "ready") { big = HUD.ready + "%"; small = "PART " + HUD.part + " READY"; }
    else if (kind === "due") { big = String(HUD.due); small = HUD.due === 1 ? "REVIEW DUE" : "REVIEWS DUE"; }
    else if (kind === "streak") { big = String(HUD.streak); small = "DAY STREAK"; }
    else if (kind === "today") { big = HUD.today + "/" + HUD.goal; small = "QUESTIONS TODAY"; }
    else if (kind === "gap") { big = "NEXT UP"; small = (HUD.gap || "Keep going").toUpperCase(); }
    else { const f = FACTS[(s.i * 3 + s.pal) % FACTS.length]; big = f[1]; small = f[0]; }
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle"; x.shadowColor = "rgba(0,0,0,0.35)"; x.shadowBlur = 10;
    fitText(x, big, W * 0.88, H * 0.5, 900); x.fillText(big, W / 2, H * 0.42); fitText(x, small, W * 0.88, H * 0.14, 800); x.fillText(small, W / 2, H * 0.8); x.shadowBlur = 0; s.tex.needsUpdate = true;
  }
  for (const s of stats) {
    drawStat(s); if (!s.quads.length) continue;
    const st = { p: [], l: [], r: [], a: [], i: [] };
    for (const [c, right, w, h] of s.quads) quad(st, c, right, UP, w, h, [0, 0, 1, 1], [1, 0, 0, 1.35]);
    storeMesh(st, screenMat(s.tex));
  }

  /* ---------- the red steps, the crowd, cabs (one per review due), lamps ---------- */
  const stepM = new THREE.MeshStandardMaterial({ color: 0x9a0e1c, emissive: 0xff1a2c, emissiveIntensity: 1.4, roughness: 0.25 });
  { const g = new THREE.Group(); for (let i = 0; i < 9; i++) g.add(new THREE.Mesh(new THREE.BoxGeometry(14, 0.45 * (i + 1), 1.6).translate(-5, 0.225 * (i + 1), -110 - i * 1.6), stepM)); scene.add(g);
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 6).translate(-5, 1.6, -128), new THREE.MeshStandardMaterial({ color: 0x0c1016, roughness: 0.1, metalness: 0.8, emissive: 0x331018, emissiveIntensity: 1 }))); }
  const crowd = [];
  { const n = 300, geo = new THREE.CapsuleGeometry(0.27, 1.1, 2, 6).translate(0, 0.82, 0), im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.75 }), n), CC = [0x1d1f26, 0x2a2d36, 0x3b3f4a, 0x4a3b33, 0x22303f, 0x5a1f24, 0xd8d4cc, 0x8a8f99, 0xb8312f, 0x2f4f7a, 0xd9a520, 0x1d1f26, 0x2a2d36];
    for (let i = 0; i < n; i++) {
      let x, z, y = 0, sit = false; const r = rnd();
      if (r < 0.14) { const s = Math.floor(rnd() * 9); x = -11.5 + rnd() * 13; z = -110 - s * 1.6; y = 0.45 * (s + 1); sit = true; }
      else if (r < 0.8) { x = -13.5 + rnd() * 17; z = -200 + rnd() * 405; if (z > -132 && z < -105 && x < 2.5) z += 30; }
      else { x = (rnd() < 0.5 ? -1 : 1) * (14.5 + rnd() * 3); z = -200 + rnd() * 405; }
      crowd.push({ x, y: sit ? y - 0.35 : y, z, v: sit || rnd() < 0.45 ? 0 : (0.8 + rnd() * 0.8) * (rnd() < 0.5 ? -1 : 1), s: sit ? 0.8 : 0.9 + rnd() * 0.2 });
      im.setColorAt(i, new THREE.Color(pick(CC)));
    }
    crowd.mesh = im; im.frustumCulled = false; scene.add(im); }
  const GLOW = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const DOT = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.beginPath(); x.arc(16, 16, 13, 0, Math.PI * 2); x.fill(); return new THREE.CanvasTexture(c); })();
  function points(list, size, cols) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(list.flat(), 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); p.frustumCulled = false; scene.add(p); return p;
  }
  const avLights = points(avPts, 7, avPts.flatMap(() => [3, 0.25, 0.15]));
  const cars = [];
  { const n = 30, cm = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.35 });
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 0.9, 4.6).translate(0, 0.75, 0), cm, n), cabs = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.7, 2.4).translate(0, 1.55, -0.2), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.15, metalness: 0.8 }), n);
    const CC = [0xf2b707, 0xf2b707, 0xf2b707, 0x1b1d22, 0xe8e8e4, 0xf2b707, 0x8a9099, 0x6b1520];
    for (let i = 0; i < n; i++) { cars.push({ lane: [6.4, 9.6, 12.6][i % 3], z: -600 + (i / n) * 1100 + rnd() * 20, v: 6 + rnd() * 5 }); bodies.setColorAt(i, new THREE.Color(pick(CC))); }
    cars.bodies = bodies; cars.cabs = cabs; bodies.frustumCulled = cabs.frustumCulled = false; bodies.count = cabs.count = 0; scene.add(bodies, cabs);
    cars.lights = points(new Array(n * 4).fill([0, -50, 0]), 1.6, cars.flatMap(() => [3, 0.2, 0.12, 3, 0.2, 0.12, 2.4, 2.2, 1.9, 2.4, 2.2, 1.9]));
    cars.lights.geometry.setDrawRange(0, 0);
  }
  { const lamps = [], tl = [], tlc = []; for (let z = -200; z <= 240; z += 28) for (const x of [-16.2, 16.2]) lamps.push([x, 8.2, z]);
    for (let j = -2; j <= 3; j++) for (const x of [-15, 15]) { tl.push([x, 5.2, j * 80 - 10]); const red = (j + (x > 0 ? 1 : 0)) % 2; tlc.push(red ? 3 : 0.2, red ? 0.25 : 2.4, red ? 0.15 : 0.9); }
    points(lamps, 3.4, lamps.flatMap(() => [2.6, 1.9, 1.2])); points(tl, 1.2, tlc);
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 8.2, 6).translate(0, 4.1, 0), new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.6 }), lamps.length), M = new THREE.Matrix4();
    lamps.forEach(([x, , z], i) => { M.makeTranslation(x, 0, z); posts.setMatrixAt(i, M); }); scene.add(posts); }
  { const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 2), new THREE.MeshStandardMaterial({ color: 0xbfd6ff, emissive: 0x9fc4ff, emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.6 })); ball.position.set(0, OTS.h + 30, 222); scene.add(ball); }

  /* ---------- sky, haze, light, reflections ---------- */
  const SKY = { night: { top: 0x020309, mid: 0x0d0b24, hor: 0x2b1a3a }, day: { top: 0x4a78bd, mid: 0x9db8da, hor: 0xeee2d2 } };
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, uDay: { value: 0 } },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }",
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform float uDay; varying vec3 vD;
${HASH}
${VNOISE}
void main(){ float h = vD.y; vec3 c = mix(hor, mid, smoothstep(0.0, 0.14, h)); c = mix(c, top, smoothstep(0.14, 0.65, h)); if (h < 0.0) c = hor;
  if (uDay > 0.01 && h > 0.0) { /* soft autumn clouds */
    vec2 q = vD.xz / (h + 0.12) * 1.3; float n = vnoise(q) * 0.55 + vnoise(q * 2.2 + 5.1) * 0.3 + vnoise(q * 4.7 + 1.7) * 0.15;
    float cl = smoothstep(0.42, 0.78, n) * smoothstep(0.02, 0.22, h);
    c = mix(c, mix(vec3(0.74, 0.76, 0.8), vec3(1.0, 0.97, 0.92), smoothstep(0.5, 0.9, n)), cl * 0.9 * uDay); }
  gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), skyMat); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
  scene.fog = new THREE.FogExp2(SKY.night.hor, 0.00055);
  const hemi = new THREE.HemisphereLight(0x5560a0, 0x40281a, 0.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0x9fb0ff, 0.35); sun.position.set(-0.8, 0.45, 0.42); scene.add(sun);
  const pmrem = new THREE.PMREMGenerator(renderer);
  function envFor(night) {
    const s = new THREE.Scene(), geo = new THREE.SphereGeometry(50, 32, 16), cols = [], pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const h = pos.getY(i) / 50, c = new THREE.Color();
      if (night) c.setRGB(...(h > 0.1 ? [0.01, 0.01, 0.03] : h > -0.05 ? [0.1, 0.045, 0.08] : [0.09, 0.045, 0.02])); else c.setRGB(...(h > 0.1 ? [0.35, 0.55, 0.95] : h > -0.05 ? [1.55, 1.42, 1.25] : [0.36, 0.31, 0.26]));
      cols.push(c.r, c.g, c.b); }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    if (night) for (let i = 0; i < 22; i++) { const a = rnd() * 6.28, p = new THREE.Mesh(new THREE.PlaneGeometry(6 + rnd() * 10, 4 + rnd() * 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(pick(NEON)).multiplyScalar(2.5 + rnd() * 2), side: THREE.DoubleSide })); p.position.set(Math.cos(a) * 40, -4 + rnd() * 16, Math.sin(a) * 40); p.lookAt(0, p.position.y, 0); s.add(p); }
    else { const sd = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(30, 27, 22) })); sd.position.set(-22, 38, 18); s.add(sd); }
    return pmrem.fromScene(s, 0, 0.1, 100).texture;
  }
  const ENV = { night: envFor(true), day: envFor(false) };

  /* ---------- render pipeline: bloom makes the screens and windows glow; low mode renders straight ---------- */
  let composer = null, bloom = null, gradePass = null;
  if (!low) {
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: coarse ? 2 : 4 }));
    composer.addPass(new RenderPass(scene, camera));
    /* one bad pixel (NaN or infinity) would be smeared over the whole frame by the bloom blur and turn it black: zero it first */
    composer.addPass(gradePass = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uN: { value: 1 } },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uN; varying vec2 vUv; void main() { vec3 c = texture2D(tDiffuse, vUv).rgb; if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0); c = min(max(c, vec3(0.0)), vec3(60.0));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(mix(vec3(l), c, 1.0 + 0.3 * uN), 0.0);
  c *= mix(vec3(1.0), vec3(0.8, 0.97, 1.16), (1.0 - smoothstep(0.0, 0.14, l)) * 0.75 * uN);
  c = max(c - 0.0045 * uN, 0.0);
  gl_FragColor = vec4(c, 1.0); }` }));
    bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), 0.55, 0.45, 0.9); composer.addPass(bloom); composer.addPass(new OutputPass());
  }

  /* ---------- day and dusk ---------- */
  let skyK = 1, skyTarget = 1, skyInit = false;
  const ca = new THREE.Color(), cb = new THREE.Color();
  function applySky() {
    const k = skyK, L = (a, b) => a + (b - a) * k;
    for (const key of ["top", "mid", "hor"]) skyMat.uniforms[key].value.copy(ca.setHex(SKY.day[key])).lerp(cb.setHex(SKY.night[key]), k);
    scene.fog.color.copy(skyMat.uniforms.hor.value); scene.fog.density = L(0.00026, low ? 0.00085 : 0.00055);
    U.night.value = k; skyMat.uniforms.uDay.value = 1 - k; if (gradePass) gradePass.uniforms.uN.value = k; hemi.intensity = L(1.15, 0.28); hemi.color.copy(ca.setHex(0xdfe8ff)).lerp(cb.setHex(0x5560a0), k); hemi.groundColor.copy(ca.setHex(0x6b5a48)).lerp(cb.setHex(0x40281a), k);
    sun.intensity = L(2.8, 0.35); sun.color.copy(ca.setHex(0xffdcb0)).lerp(cb.setHex(0x9fb0ff), k);
    scene.environment = k > 0.5 ? ENV.night : ENV.day;
    renderer.toneMappingExposure = L(0.9, 1.0); bbBright.value = L(0.95, 0.82); reflBright.value = L(0.25, 1.0);
    stepM.emissiveIntensity = L(0.35, 1.4);
    if (bloom) { bloom.strength = L(0.25, 0.55); bloom.radius = L(0.3, 0.45); bloom.threshold = L(0.97, 0.9); }
    for (const d in B) B[d].crownM.emissiveIntensity = L(0.4, 1.6);
  }
  function setSky(name, instant) {
    skyTarget = name === "dusk" ? 1 : 0;
    if (instant || reduce || !skyInit) { skyK = skyTarget; skyInit = true; applySky(); }
    kick();
  }

  /* ---------- fireworks when a tower is finished ---------- */
  const bursts = [], pending = [];
  const FW_COLS = [[1, 0.5, 0.02], [1, 0.12, 0.35], [0.05, 0.85, 0.7], [0.45, 0.3, 1], [1, 0.8, 0.1]];
  function burst(x, y, z, k) {
    const N = 120, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    const c1 = FW_COLS[k % FW_COLS.length], c2 = FW_COLS[(k + 2) % FW_COLS.length];
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = 40 + Math.random() * 14;
      vel[i * 3] = r * Math.cos(th) * sp; vel[i * 3 + 1] = u * sp + 5; vel[i * 3 + 2] = r * Math.sin(th) * sp;
      const c = i % 3 ? c1 : c2; col[i * 3] = c[0] * 2.5; col[i * 3 + 1] = c[1] * 2.5; col[i * 3 + 2] = c[2] * 2.5;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const night = skyK > 0.5, m = new THREE.PointsMaterial({ size: night ? 9 : 6, opacity: 0.95, map: night ? GLOW : DOT, alphaTest: night ? 0 : 0.4, vertexColors: true, blending: night ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false });
    const pts = new THREE.Points(geo, m); pts.frustumCulled = false; scene.add(pts);
    bursts.push({ pts, vel, o: [x, y, z], t0: performance.now(), life: 2000 });
  }
  function stepBursts(now) {
    for (let j = bursts.length - 1; j >= 0; j--) {
      const b = bursts[j], t = (now - b.t0) / 1000, k = 2.4, f = (1 - Math.exp(-k * t)) / k, p = b.pts.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, b.o[0] + b.vel[i * 3] * f, b.o[1] + b.vel[i * 3 + 1] * f - 7 * t * t, b.o[2] + b.vel[i * 3 + 2] * f);
      p.needsUpdate = true; const a = Math.min(1, t * 1000 / b.life); b.pts.material.opacity = 0.95 * (1 - a * a);
      if (a >= 1) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(j, 1); }
    }
    for (let j = pending.length - 1; j >= 0; j--) {
      const q = pending[j]; if (now < q.at) continue; pending.splice(j, 1);
      const b = B[q.d]; if (!b) continue; const top = Math.max(b.H + 40, b.top + 14);
      [[0, 0], [-14, 8], [12, 5], [3, 14]].forEach(([dx, dy], i) => setTimeout(() => { burst(b.x + dx * 0.4, top + dy, b.z + dx, i + q.k); kick(); }, i * 320));
    }
  }

  /* ---------- camera: each part is seen down the lit canyon: Part 1 from the north toward the screen tower, Parts 2 and 3 over the screen tower's shoulder ---------- */
  const FOCUS = { ts: { t: [0, 24, 120], yaw: Math.PI, pitch: 0.07, dist: 330 }, 1: { t: [0, 60, 40], yaw: Math.PI, pitch: 0.42, dist: 380 }, 2: { t: [0, 50, 30], yaw: 0, pitch: 0.5, dist: 420 }, 3: { t: [0, 50, 110], yaw: 0, pitch: 0.62, dist: 380 } };
  const rig = { t: [0, 105, -80], yaw: Math.PI + 0.5, pitch: 0.5, dist: 400, off: 0, zoom: 1, anim: null };
  let aspect = 1;
  function placeCamera() {
    const yaw = rig.yaw + rig.off, d = rig.dist / rig.zoom * (aspect < 1.2 ? 1.12 : 1), cp = Math.cos(rig.pitch);
    camera.position.set(rig.t[0] + d * Math.sin(yaw) * cp, rig.t[1] + d * Math.sin(rig.pitch), rig.t[2] + d * Math.cos(yaw) * cp);
    camera.lookAt(rig.t[0], rig.t[1], rig.t[2]); sky.position.copy(camera.position);
  }
  function focusPart(p, instant) {
    const f = FOCUS[p] || FOCUS[1]; let yaw = f.yaw; while (yaw - rig.yaw > Math.PI) yaw -= 2 * Math.PI; while (yaw - rig.yaw < -Math.PI) yaw += 2 * Math.PI;
    const to = { t: f.t.slice(), yaw, pitch: f.pitch, dist: f.dist }; rig.off = 0;
    if (instant || reduce) { Object.assign(rig, to); rig.anim = null; return; }
    rig.anim = { from: { t: rig.t.slice(), yaw: rig.yaw, pitch: rig.pitch, dist: rig.dist }, to, t0: performance.now(), dur: 1100 };
  }

  /* ---------- labels ---------- */
  let stage = null, labels = null, tagEls = {}, focusD = null, highlightD = null;
  const v3 = new THREE.Vector3();
  function buildLabels() {
    if (!labels) return; labels.innerHTML = ""; tagEls = {};
    const names = (window.__townLabels && window.__townLabels().names) || {};
    for (const d in B) {
      if (!fs && !d.startsWith("P" + currentPart)) continue;
      const el = document.createElement("button"); el.className = "tag"; el.type = "button";
      el.innerHTML = `<b class="fl" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2 11V1.5M2.6 1.8 10 3.6 2.6 5.6Z" fill="currentColor" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></b>${names[d] || d}<i></i>`; el.onclick = () => fs ? select(d) : window.__townPick && window.__townPick(d);
      labels.appendChild(el); tagEls[d] = el;
    }
    updateLabelText();
  }
  function updateLabelText() {
    for (const d in tagEls) { tagEls[d].querySelector("i").textContent = Math.round(B[d].target * 100) + "%"; tagEls[d].classList.toggle("focus", d === focusD || d === highlightD); tagEls[d].classList.toggle("done", B[d].target >= 0.999); }
  }
  let barK = "", barY = 0; /* bottom of the buttons over the canvas, measured once per view and size */
  function barBottom(w, h) { const k = (fs ? "fs" : "home") + w + "x" + h; if (k !== barK) { const bar = stage.querySelector(".stagebtns, .fs-top"); barK = k; barY = bar ? bar.offsetTop + bar.offsetHeight + 4 : 0; } return barY; }
  function placeLabels() {
    if (!stage) return; const hideL = viewTS && !fs; if (labels) labels.style.visibility = hideL ? "hidden" : ""; if (hideL) return; const w = stage.clientWidth, h = stage.clientHeight;
    const items = [], minY = barBottom(w, h);
    for (const d in tagEls) {
      const b = B[d], el = tagEls[d]; if (!el._w) { el._w = el.offsetWidth || 90; el._h = el.offsetHeight || 26; }
      /* a finished modeled tower's label goes above its mast if that stays clear of the buttons over the canvas, else mid-crown, else at the roofline like the rest; keeps room for one label stacked above it */
      const hs = b.m >= 0.999 && b.top > b.H + 12 ? [b.top + 4, (b.H + b.top) / 2, b.H + 12] : [b.H + 12];
      for (const y of hs) { v3.set(b.x, y, b.z).project(camera); if ((1 - v3.y) / 2 * h - 2 * el._h - 4 >= minY) break; }
      items.push({ el, x: (v3.x + 1) / 2 * w, y: (1 - v3.y) / 2 * h, on: v3.z < 1 && (!fs || (Math.abs(v3.x) < 1.02 && v3.y < 1.02 && v3.y > -1.02)) });
    }
    items.sort((a, b) => b.y - a.y);
    const placed = [];
    for (const it of items) {
      const hw = it.el._w / 2 + 3, hh = it.el._h + 4;
      it.x = Math.min(w - hw + 3, Math.max(hw - 3, it.x));
      it.y = Math.min(h - 4, Math.max(it.el._h + 6, it.y));
      const clash = (x, y) => placed.find(p => Math.abs(p.x - x) < p.hw + hw && Math.abs(p.y - y) < hh);
      for (let k = 0; k < 12; k++) {
        const hit = clash(it.x, it.y); if (!hit) break;
        /* slide sideways first (toward the side the label already leans), then step up */
        const r = hit.x + hit.hw + hw, l = hit.x - hit.hw - hw, sides = it.x >= hit.x ? [r, l] : [l, r];
        const side = sides.find(x => x > hw - 3 && x < w - hw + 3 && !clash(x, it.y));
        if (side != null) { it.x = side; break; }
        it.y = hit.y - hh;
      }
      it.hw = hw; placed.push(it);
      const squeezed = fs && it.y < it.el._h + 6;   /* full screen: a label with no room left hides instead of piling at the top */
      it.y = Math.max(it.el._h + 6, it.y); it.el.style.transform = `translate(${it.x}px, ${it.y}px) translate(-50%, -100%)`;
      it.el.style.opacity = it.on && !squeezed ? 1 : 0;
    }
  }

  /* ---------- pointer: drag to turn, pinch or wheel to zoom, tap a tower to drill it ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const ptrs = new Map(); let downAt = null, moved = false, pinch0 = null;
  function onDown(e) { if (fs) return; canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) { downAt = { x: e.clientX, y: e.clientY, off: rig.off }; moved = false; } if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), z: rig.zoom }; } }
  function onMove(e) {
    if (fs || !ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; rig.zoom = THREE.MathUtils.clamp(pinch0.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch0.d, 0.75, 1.9); moved = true; kick(); return; }
    if (downAt) { const dx = e.clientX - downAt.x; if (Math.abs(dx) > 6 || Math.abs(e.clientY - downAt.y) > 6) moved = true; rig.off = THREE.MathUtils.clamp(downAt.off - dx * 0.004, -0.5, 0.5); kick(); }
  }
  function onUp(e) {
    if (fs) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null;
    if (ptrs.size === 0 && downAt && !moved) {
      const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false).find(h => h.object.userData.d);
      if (hit && window.__townPick) window.__townPick(hit.object.userData.d);
    }
    if (ptrs.size === 0) downAt = null;
  }
  canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", e => { if (fs) return; e.preventDefault(); rig.zoom = THREE.MathUtils.clamp(rig.zoom * (e.deltaY < 0 ? 1.08 : 0.93), 0.75, 1.9); kick(); }, { passive: false });
  canvas.addEventListener("dblclick", () => { if (fs) return; rig.off = 0; rig.zoom = 1; kick(); });

  /* ---------- full screen: the city fills the screen and moves like a map (the CoreCHI campus way) ----------
     One finger drags the ground (the spot under it stays under it) and glides on when let go; two fingers pinch to zoom
     toward them, twist to turn, slide up or down together to tilt; tapping a tower flies to it. A mouse: drag to move,
     right-drag to turn and tilt, the wheel zooms toward the pointer. The view stops softly at the city's edges. */
  const NAV = { minD: 45, maxD: 1200, minPhi: 0.18, maxPhi: 1.42, x0: -420, x1: 420, z0: -480, z1: 480 };
  const UPV = new THREE.Vector3(0, 1, 0), GPLANE = new THREE.Plane(UPV, 0), SPH = new THREE.Spherical(), tgt = new THREE.Vector3();
  let fs = null, fsPrev = null, picked = null, glide = null, fly = null;
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  function look() { camera.lookAt(tgt); camera.updateMatrixWorld(); sky.position.copy(camera.position); }
  function groundAt(x, y) { const r = canvas.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.ray.intersectPlane(GPLANE, new THREE.Vector3()); return h && h.distanceTo(camera.position) < 3000 ? h : null; }
  function moveBy(dx, dz) { tgt.x += dx; tgt.z += dz; camera.position.x += dx; camera.position.z += dz; }
  function keepIn() { moveBy(Math.min(NAV.x1, Math.max(NAV.x0, tgt.x)) - tgt.x, Math.min(NAV.z1, Math.max(NAV.z0, tgt.z)) - tgt.z); pushOut(); }
  /* the buildings as plain boxes on a 50 m grid, so the camera can tell what it is over and what a finger points at */
  const GC = 50, SOLID = new Map(), gkey = (i, j) => i * 4096 + j;
  function addSolid(x0, x1, z0, z1, top) { const s = [x0, x1, z0, z1, top]; for (let i = Math.floor(x0 / GC); i <= Math.floor(x1 / GC); i++) for (let j = Math.floor(z0 / GC); j <= Math.floor(z1 / GC); j++) { const k = gkey(i, j); if (!SOLID.has(k)) SOLID.set(k, []); SOLID.get(k).push(s); } }
  for (const t of towers) if (Math.abs(t[0]) < 1600 && Math.abs(t[2]) < 1600) addSolid(t[0] - t[3] / 2, t[0] + t[3] / 2, t[2] - t[5] / 2, t[2] + t[5] / 2, t[1] + t[4]);
  for (const d in B) { const b = B[d], bb = new THREE.Box3().setFromObject(b.g.children[0]); addSolid(bb.min.x, bb.max.x, bb.min.z, bb.max.z, b.H + 10); }
  function solidAt(p) { const l = SOLID.get(gkey(Math.floor(p.x / GC), Math.floor(p.z / GC))); if (l) for (const s of l) if (p.x > s[0] && p.x < s[1] && p.z > s[2] && p.z < s[3] && p.y < s[4]) return s; return null; }
  /* never inside a building: rise above its roof */
  function pushOut() { const s = solidAt(camera.position); if (s) camera.position.y = s[4] + 12; if (camera.position.y < 20) camera.position.y = 20; }
  /* the first thing under a screen point: a building face or the street */
  function hitAt(x, y) { const r = canvas.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, dv = ray.ray.direction, p = new THREE.Vector3();
    for (let t = 4; t < 2500; t += t < 300 ? 3 : 8) { p.copy(o).addScaledVector(dv, t); if (p.y <= 0) return groundAt(x, y); if (solidAt(p)) return p.clone(); }
    return groundAt(x, y); }
  function zoomAbout(M, k) { const d = camera.position.distanceTo(tgt); k = Math.min(Math.max(k, NAV.minD / d), NAV.maxD / d); for (const p of [camera.position, tgt]) p.sub(M).multiplyScalar(k).add(M);
    const dir = tgt.clone().sub(camera.position).normalize(); if (dir.y < -0.05) tgt.addScaledVector(dir, -tgt.y / dir.y); else tgt.y = 0; }
  function turnAbout(M, a) { for (const p of [camera.position, tgt]) p.sub(M).applyAxisAngle(UPV, a).add(M); }
  function tiltBy(d) { const off = camera.position.clone().sub(tgt); SPH.setFromVector3(off); SPH.phi = Math.min(NAV.maxPhi, Math.max(NAV.minPhi, SPH.phi + d)); off.setFromSpherical(SPH); camera.position.copy(tgt).add(off); }
  /* a stage view (target, yaw, pitch, distance) as the same picture pivoting on the ground */
  function groundPose(t, yaw, pitch, dist) { const s = t[1] / Math.sin(pitch), cp = Math.cos(pitch); return { x: t[0] - s * Math.sin(yaw) * cp, z: t[2] - s * Math.cos(yaw) * cp, r: dist + s, th: yaw, ph: Math.PI / 2 - pitch }; }
  function flyTo(p, ms = 900) { const off = camera.position.clone().sub(tgt); SPH.setFromVector3(off);
    fly = { t0: performance.now(), ms, a: { x: tgt.x, z: tgt.z, r: SPH.radius, th: SPH.theta, ph: SPH.phi }, b: { x: p.x, z: p.z, r: p.r, th: SPH.theta + wrapA((p.th ?? SPH.theta) - SPH.theta), ph: p.ph ?? SPH.phi } }; glide = null; kick(); }
  const fsView = k => { const f = FOCUS[k]; return groundPose(f.t, f.yaw, f.pitch, f.dist * (aspect < 1 ? 1.25 : 1)); };
  function fsUpdate(now) {
    if (glide) { const dt = Math.min(48, now - glide.t); glide.t = now; moveBy(glide.x * dt, glide.z * dt); keepIn(); const k = Math.pow(0.86, dt / 16); glide.x *= k; glide.z *= k; if (Math.hypot(glide.x, glide.z) < 0.003) glide = null; }
    if (fly) { const u = Math.min(1, (now - fly.t0) / fly.ms), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, L = p => fly.a[p] + (fly.b[p] - fly.a[p]) * e;
      tgt.set(L("x"), 0, L("z")); SPH.set(L("r"), L("ph"), L("th")); camera.position.copy(tgt).add(new THREE.Vector3().setFromSpherical(SPH)); pushOut(); if (u >= 1) fly = null; }
    look();
  }
  const FP = new Map(); let fmode = null, anchor = null, d0 = 0, vel = { x: 0, z: 0, t: 0 }, tap = null;
  const two = () => { const [a, b] = [...FP.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
  function fbegin() { glide = null;
    if (FP.size === 1) { const p = [...FP.values()][0]; fmode = p.b === 2 ? "turn" : "pan"; anchor = groundAt(p.x, p.y); vel = { x: 0, z: 0, t: performance.now() }; }
    else if (FP.size === 2) { fmode = "two"; for (const p of FP.values()) { p.sx = p.x; p.sy = p.y; } d0 = two().d; tap = null; }
    else fmode = null; }
  canvas.addEventListener("pointerdown", e => { if (!fs) return; try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    FP.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button }); fly = null; tap = FP.size === 1 && e.button === 0 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; fbegin(); kick(); });
  canvas.addEventListener("pointermove", e => { if (!fs) return; const p = FP.get(e.pointerId); if (!p) return;
    const before = FP.size === 2 ? two() : null, dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8) tap = null;
    if (fmode === "pan" && anchor) { const h = groundAt(p.x, p.y); if (!h) return;
      const sx = anchor.x - h.x, sz = anchor.z - h.z, now = performance.now(), dt = Math.max(8, now - vel.t);
      moveBy(sx, sz); keepIn(); look(); vel = { x: vel.x * 0.5 + sx / dt * 0.5, z: vel.z * 0.5 + sz / dt * 0.5, t: now }; kick(); return; }
    if (fmode === "turn") { turnAbout(tgt.clone(), -dx * 0.006); tiltBy(-dy * 0.005); keepIn(); look(); kick(); return; }
    if (!before || FP.size !== 2) return;
    const now2 = two();
    if (fmode === "two") { const [a, b] = [...FP.values()], va = a.y - a.sy, vb = b.y - b.sy, ha = a.x - a.sx, hb = b.x - b.sx;
      if (Math.abs(va) + Math.abs(vb) + Math.abs(ha) + Math.abs(hb) + Math.abs(now2.d - d0) < 14) return;   /* not decided yet */
      fmode = va * vb > 0 && Math.abs(va) > 1.5 * Math.abs(ha) && Math.abs(vb) > 1.5 * Math.abs(hb) && Math.abs(now2.d - d0) < 0.3 * (Math.abs(va) + Math.abs(vb)) ? "tilt" : "zoom"; }
    if (fmode === "tilt") { tiltBy(-(now2.y - before.y) * 0.004); keepIn(); look(); kick(); return; }
    const M = hitAt(before.x, before.y); if (!M) return;
    zoomAbout(M, before.d / Math.max(1, now2.d)); turnAbout(M, wrapA(now2.ang - before.ang)); look();
    const h = groundAt(now2.x, now2.y); if (h) moveBy(M.x - h.x, M.z - h.z);   /* the spot between the fingers follows them */
    keepIn(); look(); kick(); });
  function fend(e) { if (!fs || !FP.has(e.pointerId)) return; FP.delete(e.pointerId);
    if (tap && FP.size === 0 && performance.now() - tap.t < 450) { pickAt(e.clientX, e.clientY); tap = null; }
    else if (fmode === "pan" && FP.size === 0 && performance.now() - vel.t < 90 && Math.hypot(vel.x, vel.z) > 0.02) { const v = Math.hypot(vel.x, vel.z), k = Math.min(1, 0.6 / v); glide = { x: vel.x * k, z: vel.z * k, t: performance.now() }; }
    if (FP.size) fbegin(); else fmode = null; kick(); }
  canvas.addEventListener("pointerup", fend); canvas.addEventListener("pointercancel", fend);
  canvas.addEventListener("contextmenu", e => { if (fs) e.preventDefault(); });
  canvas.addEventListener("wheel", e => { if (!fs) return; e.preventDefault(); fly = null; glide = null; const M = hitAt(e.clientX, e.clientY); if (!M) return; zoomAbout(M, Math.exp(e.deltaY * 0.0015)); keepIn(); look(); kick(); }, { passive: false });
  function pickAt(x, y) { const r = canvas.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false).find(h => h.object.userData.d); select(hit ? hit.object.userData.d : null); }
  /* a tapped tower: fly to it and show its card */
  function select(d) {
    picked = d; for (const k in B) { B[k].hl = k === d; B[k].clad.emissive.setHex(B[k].hl ? 0x3a2a08 : 0x000000); }
    highlightD = d; updateLabelText();
    const card = fs && fs.querySelector(".fs-card"); if (!card) return;
    if (!d) { card.hidden = true; return; }
    const b = B[d], names = (window.__townLabels && window.__townLabels().names) || {}, pctv = Math.round(b.target * 100), floors = Math.round(b.H / 4);
    card.innerHTML = `<div class="fs-card-top"><b>${names[d] || d}</b><button class="sky" type="button" data-fs="unpick" aria-label="Close this card">✕</button></div>
      <div class="fs-bar"><i style="width:${pctv}%"></i></div>
      <span>${pctv >= 100 ? "Finished: every floor is mastered." : `${pctv}% finished · ${Math.round(floors * b.target)} of ${floors} floors done`}</span>
      <button class="btn primary" type="button" data-fs="drill">Drill ${names[d] || "this area"}</button>`;
    card.hidden = false;
    const off = camera.position.clone().sub(tgt); SPH.setFromVector3(off);
    /* frame the whole tower, a little above center so the card below doesn't cover it */
    const r = Math.max(260, b.H * 1.9 + 80) * (aspect < 1 ? 1.1 : 1), ph = Math.min(1.05, Math.max(0.85, SPH.phi));
    /* aim at the tower's middle, not its base: slide the ground pivot past the tower along the view */
    const th = clearSide(b, r, ph, SPH.theta), lift = b.H * 0.45 * Math.tan(ph);
    flyTo({ x: b.x - Math.sin(th) * lift, z: b.z - Math.cos(th) * lift, r: r + b.H * 0.3, ph, th });
  }
  /* of 16 directions around a tower, the one nearest the current view with nothing standing in front of it */
  function clearSide(b, r, ph, cur) {
    const ths = []; for (let i = 0; i < 16; i++) ths.push(cur + wrapA(i * Math.PI / 8));
    ths.sort((a, c) => Math.abs(wrapA(a - cur)) - Math.abs(wrapA(c - cur)));
    const base = new THREE.Vector3(b.x, 0, b.z), aim = new THREE.Vector3(b.x, b.H * 0.7, b.z), cam = new THREE.Vector3(), p = new THREE.Vector3();
    for (const th of ths) {
      cam.setFromSpherical(new THREE.Spherical(r, ph, th)).add(base); const L = cam.distanceTo(aim); let clear = !solidAt(cam);
      for (let t = 0; clear && t < L - 32; t += 5) { p.lerpVectors(cam, aim, t / L); if (solidAt(p)) clear = false; }
      if (clear) return th;
    }
    return cur;
  }
  function onFsClick(e) {
    const a = e.target.closest("[data-fs]"); if (!a) return; const k = a.dataset.fs;
    if (k === "close") closeFs();
    else if (k === "home") { select(null); flyTo(fsView(currentPart)); }
    else if (k === "unpick") select(null);
    else if (k === "drill") { const d = picked; closeFs(); if (d && window.__townPick) setTimeout(() => window.__townPick(d), 60); }
    else if (k === "sky") { const sb = document.getElementById("skybtn"); if (sb) sb.click(); else setSky(skyTarget ? "day" : "dusk"); a.textContent = skyTarget ? "Day" : "Dusk"; }
    else if (k.startsWith("view-")) { select(null); flyTo(fsView(k.slice(5))); }
  }
  function openFs() {
    if (fs) return;
    fsPrev = stage;
    const pose = stage ? groundPose(rig.t, rig.yaw + rig.off, rig.pitch, rig.dist / rig.zoom * (aspect < 1.2 ? 1.12 : 1)) : fsView(currentPart);
    fs = document.createElement("div"); fs.className = "town-fs"; fs.setAttribute("role", "dialog"); fs.setAttribute("aria-modal", "true"); fs.setAttribute("aria-label", "Your study city in 3D");
    fs.innerHTML = `<div class="labels"></div>
      <div class="fs-top"><button class="sky" type="button" data-fs="close">✕ Close</button>
        <div class="fs-views">${[["1", "Part 1"], ["2", "Part 2"], ["3", "Part 3"], ["ts", "Times Sq"]].map(([k, l]) => `<button class="sky" type="button" data-fs="view-${k}">${l}</button>`).join("")}</div></div>
      <div class="fs-hint">Drag to move · pinch to zoom · twist to turn · two fingers up or down to tilt · tap a tower</div>
      <div class="fs-bottom"><button class="sky" type="button" data-fs="sky">${skyTarget ? "Day" : "Dusk"}</button><button class="sky" type="button" data-fs="home">Reset view</button></div>
      <div class="fs-card" hidden></div>`;
    fs.addEventListener("click", onFsClick);
    document.body.appendChild(fs); document.documentElement.classList.add("town-fs-open");
    window.Town.mount(fs);
    tgt.set(pose.x, 0, pose.z); SPH.set(pose.r, pose.ph, pose.th); camera.position.copy(tgt).add(new THREE.Vector3().setFromSpherical(SPH)); look();
    for (const d in B) applyCut(B[d]);
    try { history.pushState({ town3d: 1 }, ""); } catch (e) {}
    setTimeout(() => { const h = fs && fs.querySelector(".fs-hint"); if (h) h.classList.add("gone"); }, 5000);
    const close = fs.querySelector("[data-fs=close]"); if (close) close.focus();
  }
  function closeFs(fromHistory) {
    if (!fs) return;
    const el = fs, prev = fsPrev; fs = null; fsPrev = null; glide = null; fly = null; FP.clear(); fmode = null;
    select(null);
    window.Town.unmount(); el.remove(); document.documentElement.classList.remove("town-fs-open");
    if (prev && document.body.contains(prev)) window.Town.mount(prev);
    for (const d in B) applyCut(B[d]);
    if (!fromHistory) { try { if (history.state && history.state.town3d) history.back(); } catch (e) {} }
  }
  addEventListener("popstate", () => { if (fs) closeFs(true); });
  addEventListener("keydown", e => { if (fs && e.key === "Escape") { if (picked) select(null); else closeFs(); } });

  /* ---------- loop ---------- */
  let running = false, visible = true, lastT = performance.now(), paintAnim = null, wantFrame = true, nCars = 0, lastStat = 0, statI = 0, lastDraw = 0;
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }) : null;
  const ro = "ResizeObserver" in window ? new ResizeObserver(() => resize()) : null;
  function kick() { wantFrame = true; if (!running) { running = true; requestAnimationFrame(frame); } }
  function resize() {
    if (!stage) return; const w = stage.clientWidth || 360, h = stage.clientHeight || 360;
    renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.fov = aspect < 1.2 ? 58 : 48; camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    const hero = stage.parentElement; /* the home card's top fade (see .stage-fade): where the stage starts and 9% of its height */
    if (hero && stage.classList.contains("stage")) { hero.style.setProperty("--ft", stage.offsetTop + "px"); hero.style.setProperty("--fh", Math.round(h * 0.09) + "px"); }
    kick();
  }
  /* iOS may take the 3D drawing away to save memory (switching apps, in-app browsers). Wait for it to come back;
     if it doesn't, say so and offer a restart instead of leaving a black box. Progress is saved either way. */
  let lost = false, lostCount = 0, lostTimer = 0, lostEl = null;
  function lostMsg(show) {
    if (show && stage && !lostEl) {
      lostEl = document.createElement("div"); lostEl.className = "stage-msg town-lost";
      lostEl.innerHTML = `<div style="display:grid;gap:10px;justify-items:center"><span>The 3D view was paused by your phone to save memory.</span><button class="sky" type="button">Restart 3D</button></div>`;
      lostEl.querySelector("button").onclick = () => location.reload();
      stage.appendChild(lostEl);
    }
    if (!show && lostEl) { lostEl.remove(); lostEl = null; }
    if (labels) labels.style.display = show ? "none" : "";
  }
  canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); lost = true; lostCount++; clearTimeout(lostTimer); lostTimer = setTimeout(() => { if (lost) lostMsg(true); }, 1500); });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false; clearTimeout(lostTimer); lostMsg(false);
    ENV.night = envFor(true); ENV.day = envFor(false); applySky();   /* the reflections lived on the GPU; draw them again */
    for (const s of stats) s.tex.needsUpdate = true;
    kick();
  });
  /* low graphics: no crowd, bloom or wet-street reflections, 1x pixels, 30 frames a second */
  function applyLow() { crowd.mesh.visible = !low; reflMesh.visible = !low; renderer.setPixelRatio(dprFor()); resize(); }
  const perf = { t0: performance.now(), sum: 0, n: 0, fps: 0, fpsN: 0, fpsT: 0 };
  const meter = QS.get("fps") ? Object.assign(document.createElement("div"), { style: "position:absolute;left:8px;bottom:6px;z-index:5;font:600 11px system-ui;color:#fff;background:rgba(0,0,0,.55);padding:3px 6px;border-radius:6px;pointer-events:none" }) : null;
  function sampleFrame(now, raw) {
    perf.fpsN++; if (now - perf.fpsT > 500) { perf.fps = Math.round(perf.fpsN * 1000 / (now - perf.fpsT)); perf.fpsN = 0; perf.fpsT = now; if (meter) meter.textContent = `${perf.fps} fps · ${renderer.info.render.calls} draws · ${low ? "low" : "high"} · ${renderer.getPixelRatio()}x${lostCount ? ` · lost ${lostCount}` : ""}`; }
    if (gfxForced || low || now - perf.t0 < 2500 || raw > 250) return;
    perf.sum += raw; perf.n++;
    if (perf.sum < 3000) return;
    if (perf.sum / perf.n > 28) { low = true; applyLow(); try { localStorage.setItem(GFXKEY, JSON.stringify({ level: "low", at: Date.now() })); } catch (e) {} }
    perf.sum = 0; perf.n = 0;
  }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sv = new THREE.Vector3();
  function frame(now) {
    if (!stage || document.hidden || !visible || lost) { running = false; return; }
    if (low && !wantFrame && now - lastDraw < 30) { requestAnimationFrame(frame); return; }
    const raw = now - lastT; lastDraw = now; sampleFrame(now, raw);
    const dt = Math.min(0.05, raw / 1000); lastT = now; U.time.value = now / 1000;
    let busy = !reduce || (fs && (glide || fly));
    if (rig.anim) { const k = Math.min(1, (now - rig.anim.t0) / rig.anim.dur), e = 1 - Math.pow(1 - k, 3); for (let i = 0; i < 3; i++) rig.t[i] = rig.anim.from.t[i] + (rig.anim.to.t[i] - rig.anim.from.t[i]) * e; for (const key of ["yaw", "pitch", "dist"]) rig[key] = rig.anim.from[key] + (rig.anim.to[key] - rig.anim.from[key]) * e; if (k >= 1) rig.anim = null; busy = true; }
    if (paintAnim) {
      const k = Math.max(0, Math.min(1, (now - paintAnim.t0) / paintAnim.dur)), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      for (const d in B) { const b = B[d]; b.m = b.from + (b.target - b.from) * e; applyCut(b); }
      if (k >= 1) paintAnim = null; busy = true;
    }
    if (skyK !== skyTarget) { const st = dt / 0.9; skyK = skyTarget > skyK ? Math.min(skyTarget, skyK + st) : Math.max(skyTarget, skyK - st); applySky(); busy = true; }
    const fw = bursts.length || pending.length; if (labels) labels.style.opacity = fw ? 0.08 : "";
    if (fw) { stepBursts(now); busy = true; }
    if (!reduce) {
      if (!low) { crowd.forEach((p, i) => { if (p.v) { p.z += p.v * dt; if (p.z > 205) p.z = -200; if (p.z < -200) p.z = 205; } M4.compose(V.set(p.x, p.y, p.z), Q, Sv.set(p.s, p.s, p.s)); crowd.mesh.setMatrixAt(i, M4); }); crowd.mesh.instanceMatrix.needsUpdate = true; }
      const lp = cars.lights.geometry.attributes.position;
      for (let i = 0; i < nCars; i++) { const c = cars[i]; c.z += c.v * dt; if (c.z > 520) c.z = -620; M4.makeTranslation(c.lane, 0, c.z); cars.bodies.setMatrixAt(i, M4); cars.cabs.setMatrixAt(i, M4);
        lp.setXYZ(i * 4, c.lane - 0.7, 0.9, c.z - 2.35); lp.setXYZ(i * 4 + 1, c.lane + 0.7, 0.9, c.z - 2.35); lp.setXYZ(i * 4 + 2, c.lane - 0.7, 0.8, c.z + 2.35); lp.setXYZ(i * 4 + 3, c.lane + 0.7, 0.8, c.z + 2.35); }
      cars.bodies.instanceMatrix.needsUpdate = cars.cabs.instanceMatrix.needsUpdate = lp.needsUpdate = true;
      avLights.material.opacity = (Math.sin(now / 420) > 0.2 ? 1 : 0.12) * (0.4 + 0.6 * skyK);
      for (const d in B) { const b = B[d]; if (b.crane.visible) b.jib.rotation.y += dt * 0.12 * (d.charCodeAt(3) % 2 ? 1 : -1); }
      redLightM.color.setRGB(Math.sin(now / 300) > 0 ? 4 : 0.6, 0.3, 0.2);
      if (now - lastStat > 2600) { lastStat = now; const s = stats[statI++ % stats.length]; s.i++; drawStat(s); }
    }
    if (fs) fsUpdate(now); else placeCamera();
    renderer.info.reset();
    if (composer && !low) composer.render(); else renderer.render(scene, camera);
    placeLabels();
    wantFrame = false;
    if (busy) requestAnimationFrame(frame); else running = false;
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });

  /* ---------- public API (unchanged for app.js) ---------- */
  window.Town = {
    ready: true,
    mount(el) {
      stage = el; labels = el.querySelector(".labels");
      el.insertBefore(canvas, labels); if (meter) el.appendChild(meter);
      if (io) { io.disconnect(); io.observe(el); } if (ro) { ro.disconnect(); ro.observe(el); if (el.parentElement && el.classList.contains("stage")) ro.observe(el.parentElement); }
      resize(); buildLabels(); kick();
    },
    unmount() { if (io) io.disconnect(); if (ro) ro.disconnect(); if (canvas.parentNode) canvas.parentNode.removeChild(canvas); stage = null; labels = null; },
    update(data) {
      if (!data) return;
      const partChanged = data.part !== currentPart; currentPart = data.part;
      let maxGap = -1; focusD = null;
      for (const d in B) {
        const b = B[d], t = Math.max(0, Math.min(1, data.mastery[d] || 0));
        const from = data.from && d in data.from ? data.from[d] : t;
        b.from = reduce ? t : from; b.target = t; b.m = b.from; applyCut(b);
        if (d.startsWith("P" + currentPart)) { const gp = (1 - t) * WEIGHT[d]; if (gp > maxGap && t < 0.999) { maxGap = gp; focusD = d; } }
      }
      paintAnim = reduce ? null : { t0: performance.now() + 350, dur: 1300 };
      if (data.view) viewTS = data.view === "ts";
      if (data.sky) setSky(data.sky, !skyInit);
      if (data.hud) { HUD = Object.assign({}, HUD, data.hud); stats.forEach(drawStat); }
      if (!reduce) { let k = 0; for (const d in B) if (B[d].from < 0.999 && B[d].target >= 0.999) pending.push({ d, k: k++, at: paintAnim.t0 + paintAnim.dur + 150 }); }
      const due = Object.entries(data.due || {}).filter(([k]) => k.startsWith("P" + currentPart)).reduce((a, [, v]) => a + v, 0);
      nCars = Math.min(cars.length, due); cars.bodies.count = cars.cabs.count = nCars; cars.lights.geometry.setDrawRange(0, nCars * 4);
      for (let i = 0; i < nCars; i++) { const c = cars[i]; M4.makeTranslation(c.lane, 0, c.z); cars.bodies.setMatrixAt(i, M4); cars.cabs.setMatrixAt(i, M4); }
      cars.bodies.instanceMatrix.needsUpdate = cars.cabs.instanceMatrix.needsUpdate = true;
      focusPart(viewTS ? "ts" : currentPart, !partChanged && !rig.anim);
      buildLabels(); kick();
    },
    highlight(d) {
      highlightD = d;
      for (const k in B) { B[k].hl = k === d; B[k].clad.emissive.setHex(B[k].hl ? 0x3a2a08 : 0x000000); }
      updateLabelText(); kick();
    },
    setSky(name) { setSky(name, false); },
    setView(v) { viewTS = v === "ts"; for (const d in B) applyCut(B[d]); focusPart(viewTS ? "ts" : currentPart, false); kick(); },
    celebrate(d) { if (B[d] && !reduce) { pending.push({ d, k: 0, at: performance.now() }); kick(); } },
    fullscreen(on) { if (on) openFs(); else closeFs(); }
  };
  window.__townDebug = () => ({ rig(t, yaw, pitch, dist) { rig.anim = null; rig.off = 0; rig.zoom = 1; Object.assign(rig, { t, yaw, pitch, dist }); kick(); },
    cam(pos, at) { fly = glide = null; camera.position.set(...pos); tgt.set(...at); look(); kick(); }, nanTest: () => { reflBright.value = NaN; kick(); return true; }, lost, lostCount, fs: !!fs, picked, target: tgt.toArray().map(Math.round), b: bursts.length, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, low, dpr: renderer.getPixelRatio(), fps: perf.fps, towers: Object.keys(B).length,
    /* where a tower sits on screen, for tests that tap it */
    screenOf(d) { const b = B[d]; if (!b || !stage) return null; v3.set(b.x, b.H * 0.85, b.z).project(camera); const r = canvas.getBoundingClientRect(); return { x: r.left + (v3.x + 1) / 2 * r.width, y: r.top + (1 - v3.y) / 2 * r.height }; } });
  applySky(); focusPart("1", true);
  if (low) applyLow();
  if (window.__townData) window.Town.update(window.__townData);
  window.__townReady && window.__townReady();
})();
