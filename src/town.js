(async () => {
  let THREE;
  try {
    THREE = await Promise.race([
      import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 15000))
    ]);
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("no webgl");
  } catch (e) { window.__townFail && window.__townFail(); return; }

  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* graphics level: ?gfx=low or ?gfx=high forces it; otherwise a slow device drops to low on its own and remembers for 7 days */
  const GFXKEY = "eaTaxTown.gfx", QS = new URLSearchParams(location.search), gfxForced = QS.get("gfx");
  const gfxSaved = (() => { try { const v = JSON.parse(localStorage.getItem(GFXKEY) || "null"); return v && Date.now() - v.at < 7 * 864e5 ? v.level : null; } catch (e) { return null; } })();
  if (gfxForced === "high") { try { localStorage.removeItem(GFXKEY); } catch (e) {} }
  let low = gfxForced ? gfxForced === "low" : gfxSaved === "low";
  const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  const dprFor = () => low ? 1 : Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(dprFor());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; /* redrawn only when the sun, the camera or a building's paint moves; movers cast no shadows */
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 1, 600);
  const hemi = new THREE.HemisphereLight(0xe3ebff, 0x8c7a66, 1.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0db, 2.4);
  sun.position.set(-38, 70, 28); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 10, far: 200 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xb9c8ff, 0.45); fill.position.set(40, 30, -30); scene.add(fill);

  /* ---------- materials ---------- */
  const MATS = new Map(); /* same color, roughness and metalness share one material, so their meshes can merge */
  const mat = (c, r = 0.85, m = 0) => { const k = c + "|" + r + "|" + m; if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m })); return MATS.get(k); };
  const PAL = {
    grass: mat(0xc3ddb6), grass2: mat(0xb3d3a4), earth: mat(0xa8673e, 0.95), earth2: mat(0x7e4a2b, 0.95),
    road: mat(0x5c6070, 0.9), walk: mat(0xdcd8cf), line: mat(0xf3cf5a), white: mat(0xf4f3ef), pad: mat(0xe4e0d7),
    water: mat(0x76bcd9, 0.25, 0.05), trunk: mat(0x7a5236), leaf: mat(0x3f9d6b), leaf2: mat(0x5bb37f), bloom: mat(0xf1a8c3),
    hedge: mat(0x4f9a63), scaf: mat(0xf1b23f, 0.6), crane: mat(0xe9a43a, 0.55), dark: mat(0x2b2f3d), skin: mat(0xf0c7a2)
  };
  const CLAY = 0xd6d4ce;
  const ROLES = {
    brick: 0xb4553f, brick2: 0x8e3f30, cream: 0xefe5d3, stone: 0xdcd5c6, slate: 0x5d6678, glass: 0x3f6f91, glass2: 0x2f7f86,
    white: 0xeef0f2, orange: 0xcd8a58, yellow: 0xe9c37a, roof: 0x7b4b3a, red: 0xb23a2e, steel: 0x9ea6b1, teal: 0x2f8f8a,
    copper: 0x5fa58e, blue: 0x3d64a8, green: 0x6aa86b, gold: 0xe5b85c, door: 0x3a2f2a, awn: 0x2f8f8a,
    brown: 0x7b4a35, brown2: 0x5a3424, iron: 0x2b2f3d, wood: 0x9a6b45, wood2: 0x6b4a33
  };
  const ROUGH = { glass: 0.25, glass2: 0.25, steel: 0.5, copper: 0.5 };
  const GLOW = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,236,196,0.7)"); g.addColorStop(1, "rgba(255,200,120,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const DOT = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.beginPath(); x.arc(16, 16, 13, 0, Math.PI * 2); x.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff1c0, emissiveIntensity: 0 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x9b2a2a, emissive: 0xff3b3b, emissiveIntensity: 0 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd58a, emissiveIntensity: 0 });
  const busWin = new THREE.MeshStandardMaterial({ color: 0x2c3e55, roughness: 0.3, emissive: 0xffd99a, emissiveIntensity: 0 });
  const FLAGMAT = new THREE.MeshStandardMaterial({ color: 0xf5b84a, side: THREE.DoubleSide, roughness: 0.6, emissive: 0x6b3d00, emissiveIntensity: 0.3 });
  const FLAGPOS = { "P1-1": [-2, 7.45, -1.5], "P1-2": [0, 7.4, -2.5], "P1-3": [0, 8.4, -1.5], "P1-4": [-1.8, 10.5, 1.5], "P1-5": [-2, 8.55, -1.5], "P1-6": [0, 7.7, 0],
    "P2-1": [1.6, 25.05, 1.6], "P2-2": [-3.5, 11.45, 2], "P2-3": [-3.8, 7.4, 2.8], "P3-1": [-1.5, 9.45, -1.5], "P3-2": [0, 12.4, -0.6], "P3-3": [-2.5, 12.6, 1.5], "P3-4": [-1, 4.75, 1.5] };

  /* ---------- geometry helpers ---------- */
  const tag = (o, d) => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; c.userData.d = d; } }); return o; };
  function box(g, m, w, h, d, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); g.add(o); return o; }
  function cyl(g, m, rt, rb, h, x = 0, y = 0, z = 0, seg = 18) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y + h / 2, z); g.add(o); return o; }
  function gable(g, m, w, rise, d, x = 0, y = 0, z = 0, ry = 0) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, rise); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2);
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o;
  }
  function hip(g, m, w, rise, d, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1), m);
    o.rotation.y = Math.PI / 4; o.scale.set(w, rise, d); o.position.set(x, y + rise / 2, z); g.add(o); return o;
  }
  /* fold every static mesh under root into one mesh per material, so the GPU gets a few big draws instead of hundreds of small ones */
  const ATTRS = ["position", "normal", "uv"];
  function mergeStatic(root, skip) {
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), M = new THREE.Matrix4(), buckets = new Map();
    (function walk(o) {
      for (const c of o.children) {
        if (skip && skip.has(c)) continue;
        if (c.isMesh && !c.isInstancedMesh && !Array.isArray(c.material) && !c.children.length && c.visible && ATTRS.every(a => c.geometry.attributes[a])) {
          const k = c.material.uuid + "|" + c.castShadow + "|" + c.receiveShadow + "|" + (c.userData.d || "");
          if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(c);
        } else if (c.children.length) walk(c);
      }
    })(root);
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const geos = list.map(m => { M.multiplyMatrices(inv, m.matrixWorld); const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(M); return g; });
      const out = new THREE.BufferGeometry();
      for (const a of ATTRS) {
        const n = geos[0].attributes[a].itemSize, arr = new Float32Array(geos.reduce((s, g) => s + g.attributes[a].count * n, 0)); let off = 0;
        for (const g of geos) { arr.set(g.attributes[a].array, off); off += g.attributes[a].array.length; }
        out.setAttribute(a, new THREE.BufferAttribute(arr, n));
      }
      const first = list[0], mesh = new THREE.Mesh(out, first.material);
      mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow; if (first.userData.d) mesh.userData.d = first.userData.d;
      for (const m of list) m.parent.remove(m);
      root.add(mesh);
    }
    return root;
  }
  const noShadow = o => { o.traverse(c => { if (c.isMesh) c.castShadow = false; }); return o; };
  const winGeo = new THREE.BoxGeometry(0.62, 0.9, 0.12);
  function windows(g, m, spec) {
    const { w, d, floors, fh, y0, faces = ["+z", "-x"], gap = 1.35, inset = 0 } = spec;
    const pts = [];
    for (const f of faces) {
      const span = f.endsWith("z") ? w : d, cols = Math.max(1, Math.floor((span - 0.8) / gap));
      for (let fl = 0; fl < floors; fl++) for (let c = 0; c < cols; c++) {
        const u = (c - (cols - 1) / 2) * gap, y = y0 + fl * fh + fh * 0.5;
        if (f === "+z") pts.push([u, y, d / 2 + 0.03 - inset, 0]); if (f === "-z") pts.push([u, y, -d / 2 - 0.03 + inset, 0]);
        if (f === "+x") pts.push([w / 2 + 0.03 - inset, y, u, 1]); if (f === "-x") pts.push([-w / 2 - 0.03 + inset, y, u, 1]);
      }
    }
    const im = new THREE.InstancedMesh(winGeo, m, pts.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    pts.forEach((p, i) => { e.set(0, p[3] ? Math.PI / 2 : 0, 0); q.setFromEuler(e); M4.compose(new THREE.Vector3(p[0], p[1], p[2]), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, M4); });
    g.add(im); return im;
  }

  function wtower(g, M, x, y, z, s = 1) {
    for (const [a, c] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) box(g, M.iron, 0.12 * s, 1.3 * s, 0.12 * s, x + a * s, y, z + c * s);
    box(g, M.iron, 2 * s, 0.1 * s, 2 * s, x, y + 1.3 * s, z);
    cyl(g, M.wood, 1.05 * s, 1.05 * s, 2 * s, x, y + 1.4 * s, z, 14);
    for (let i = 1; i < 4; i++) cyl(g, M.iron, 1.08 * s, 1.08 * s, 0.05 * s, x, y + 1.4 * s + i * 0.5 * s, z, 14);
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.12 * s, 0.9 * s, 14), M.wood2); c.position.set(x, y + 3.85 * s, z); g.add(c);
  }
  function fireEscape(g, M, face, w, d, floors, fh, y0, u0, span) {
    for (let f = 0; f < floors; f++) {
      const y = y0 + f * fh, L = Math.hypot(span * 0.7, fh), ang = (f % 2 ? 1 : -1) * Math.atan2(fh, span * 0.7);
      if (face === "+z") {
        box(g, M.iron, span, 0.08, 0.8, u0, y, d / 2 + 0.4); box(g, M.iron, span, 0.5, 0.04, u0, y + 0.08, d / 2 + 0.8);
        if (f < floors - 1) { const st = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, 0.45), M.iron); st.position.set(u0, y + fh / 2 + 0.04, d / 2 + 0.35); st.rotation.z = ang; g.add(st); }
      } else {
        box(g, M.iron, 0.8, 0.08, span, -w / 2 - 0.4, y, u0); box(g, M.iron, 0.04, 0.5, span, -w / 2 - 0.8, y + 0.08, u0);
        if (f < floors - 1) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, L), M.iron); st.position.set(-w / 2 - 0.35, y + fh / 2 + 0.04, u0); st.rotation.x = ang; g.add(st); }
      }
    }
  }

  /* ---------- the 13 buildings (local origin at the base, front faces +z) ---------- */
  const B = {
    "P1-1": { x: -19, z: -21, ry: -Math.PI / 2, w: 6, d: 5, h: 7.6, make(g, M) {
      box(g, M.brick, 6, 7, 5);
      box(g, M.glass, 4.6, 2, 0.12, 0, 0.3, 2.53); box(g, M.door, 1, 2.1, 0.14, 2.3, 0, 2.53);
      const aw = box(g, M.awn, 6.2, 0.22, 1.3, 0, 2.55, 3.05); aw.rotation.x = 0.28;
      box(g, M.cream, 4.2, 0.75, 0.14, 0, 3.1, 2.56);
      windows(g, M.glass, { w: 6, d: 5, floors: 2, fh: 1.75, y0: 3.7, faces: ["+z", "-x"], gap: 1.5 });
      box(g, M.cream, 6.4, 0.45, 5.4, 0, 7, 0);
      wtower(g, M, 1.5, 7.45, 0.6, 0.75);
    } },
    "P1-2": { x: -9, z: -20, ry: -Math.PI / 2, w: 7.6, d: 7, h: 7.9, make(g, M) {
      box(g, M.stone2 || M.stone, 8, 0.5, 7.4); box(g, M.stone, 7.4, 0.35, 6.8, 0, 0.5, 0);
      box(g, M.stone, 6.8, 4.6, 4.6, 0, 0.85, -0.9);
      for (const x of [-2.5, -0.85, 0.85, 2.5]) cyl(g, M.cream, 0.32, 0.36, 4.6, x, 0.85, 2.25, 12);
      box(g, M.door, 1.2, 2.4, 0.1, 0, 0.85, 1.42);
      box(g, M.cream, 7.4, 0.65, 6.4, 0, 5.45, -0.1);
      gable(g, M.stone, 7.4, 1.4, 6.4, 0, 6.1, -0.1, Math.PI / 2 * 0);
      box(g, M.gold, 2.2, 0.3, 0.1, 0, 6.3, 3.12);
    } },
    "P1-3": { x: -27.5, z: -27, ry: -Math.PI / 2, w: 6.4, d: 5, h: 8.4, make(g, M) {
      box(g, M.brown, 6.4, 7.6, 5); box(g, M.brown2, 0.12, 7.6, 5.04, 0, 0, 0);
      box(g, M.cream, 6.7, 0.5, 5.3, 0, 7.6, 0); box(g, M.brown2, 6.4, 0.3, 5.1, 0, 8.1, 0);
      for (const x of [-1.6, 1.6]) {
        for (let i = 0; i < 4; i++) box(g, M.brown, 1.2, 0.32 * (i + 1), 0.4, x + 0.3, 0, 4.2 - i * 0.4);
        box(g, M.door, 0.85, 1.9, 0.1, x + 0.3, 1.3, 2.53); box(g, M.glass, 0.7, 1.4, 0.1, x - 0.9, 1.6, 2.53);
      }
      windows(g, M.glass, { w: 6.4, d: 5, floors: 2, fh: 2.3, y0: 3.2, faces: ["+z", "-x"], gap: 1.5 });
    } },
    "P1-4": { x: -9.5, z: -9.5, ry: -Math.PI / 2, w: 6, d: 6, h: 11, make(g, M) {
      box(g, M.brick, 6, 10, 6);
      windows(g, M.glass, { w: 6, d: 6, floors: 5, fh: 2, y0: 0, faces: ["+z", "-x"], gap: 1.45 });
      box(g, M.cream, 6.3, 0.18, 6.3, 0, 2, 0);
      fireEscape(g, M, "+z", 6, 6, 4, 2, 2, 0.7, 2.6); fireEscape(g, M, "-x", 6, 6, 4, 2, 2, -0.7, 2.6);
      box(g, M.cream, 6.4, 0.5, 6.4, 0, 10, 0);
      wtower(g, M, 1.2, 10.5, -1.2, 0.85);
    } },
    "P1-5": { x: -19.5, z: -9.5, ry: -Math.PI / 2, w: 6, d: 5, h: 8.4, make(g, M) {
      for (let f = 0; f < 3; f++) { box(g, M.white, 6.2, 0.4, 5.2, 0, f * 2.6, 0); box(g, M.glass2, 5.6, 2.2, 4.6, 0, f * 2.6 + 0.4, 0); }
      box(g, M.white, 6.2, 0.4, 5.2, 0, 7.8, 0);
      box(g, M.green, 4, 0.35, 3, 0, 8.2, 0);
      for (let i = 0; i < 4; i++) box(g, M.white, 0.12, 7.8, 0.12, -3.05 + i * 2.03, 0, 2.55);
    } },
    "P1-6": { x: -27, z: -12, ry: -Math.PI / 2, w: 12, d: 6.4, h: 8.2, make(g, M) {
      box(g, M.cream, 7, 5, 6); hip(g, M.slate, 7.6, 2.8, 6.6, 0, 5, 0);
      for (const s of [-1, 1]) { box(g, M.cream, 2.6, 3.8, 5, s * 4.8, 0, 0); hip(g, M.slate, 3, 1.6, 5.4, s * 4.8, 3.8, 0); }
      for (const x of [-1.4, -0.45, 0.45, 1.4]) cyl(g, M.white, 0.22, 0.24, 3.8, x, 0, 3.4, 10);
      box(g, M.white, 3.6, 0.4, 1.2, 0, 3.8, 3.4); gable(g, M.cream, 3.6, 0.9, 1.2, 0, 4.2, 3.4);
      box(g, M.door, 1, 2.2, 0.1, 0, 0, 3.02);
      windows(g, M.glass, { w: 7, d: 6, floors: 2, fh: 2.4, y0: 0.2, faces: ["+z"], gap: 1.5 });
      box(g, M.brick2, 0.6, 1.6, 0.6, 2.2, 6.2, -1.2); box(g, M.brick2, 0.6, 1.6, 0.6, -2.2, 6.2, -1.2);
    } },
    "P2-1": { x: 10.5, z: -10.5, ry: Math.PI, w: 9, d: 9, h: 26, make(g, M) {
      box(g, M.glass, 9, 3, 9); box(g, M.white, 9.3, 0.35, 9.3, 0, 3, 0);
      box(g, M.glass2, 7, 19, 7, 0, 3.35, 0);
      for (let i = 0; i < 6; i++) { const u = -3.5 + i * 1.4; box(g, M.white, 0.14, 19, 0.2, u, 3.35, 3.55); box(g, M.white, 0.2, 19, 0.14, -3.55, 3.35, u); }
      for (let f = 1; f < 13; f++) box(g, M.white, 7.15, 0.1, 7.15, 0, 3.35 + f * 1.45, 0);
      box(g, M.glass2, 5, 2.4, 5, 0, 22.35, 0); box(g, M.white, 5.3, 0.3, 5.3, 0, 24.75, 0);
      cyl(g, M.steel, 0.08, 0.14, 2.2, 0, 25, 0, 6);
      box(g, M.door, 2.4, 2, 0.1, 0, 0, 4.53);
    } },
    "P2-2": { x: 23, z: -11, ry: Math.PI, w: 12, d: 9, h: 12, make(g, M) {
      box(g, M.brick, 11, 11, 8);
      windows(g, M.glass, { w: 11, d: 8, floors: 5, fh: 2.1, y0: 0.6, faces: ["+z", "-x"], gap: 1.25 });
      box(g, M.door, 2.4, 2.4, 0.12, -3, 0, 4.03); box(g, M.iron, 3, 0.2, 1.2, -3, 2.5, 4.4);
      box(g, M.cream, 11.4, 0.45, 8.4, 0, 11, 0);
      wtower(g, M, 2.5, 11.45, -1.5, 1);
      fireEscape(g, M, "+z", 11, 8, 4, 2.1, 2.7, 2.6, 2.6);
    } },
    "P2-3": { x: 24, z: -24.5, ry: Math.PI, w: 9, d: 8, h: 10.4, make(g, M) {
      box(g, M.brick2, 9, 7, 7.6);
      windows(g, M.glass, { w: 9, d: 7.6, floors: 3, fh: 2.2, y0: 0.3, faces: ["+z", "-x"], gap: 1.4 });
      box(g, M.cream, 9.3, 0.4, 7.9, 0, 7, 0);
      box(g, M.glass2, 3.6, 2.2, 3, -2.2, 7.4, -1.4); gable(g, M.glass2, 3.6, 0.9, 3, -2.2, 9.6, -1.4);
      for (let i = 0; i < 4; i++) box(g, M.green, 3.4, 0.35, 0.6, 1.9, 7.4, 2.6 - i * 1.1);
      wtower(g, M, 2.6, 7.4, -2.4, 0.8);
    } },
    "P3-1": { x: 10, z: 21.5, ry: Math.PI / 2, w: 5, d: 5, h: 9.6, make(g, M) {
      box(g, M.brick, 5, 9, 5);
      windows(g, M.glass, { w: 5, d: 5, floors: 4, fh: 2.15, y0: 0.3, faces: ["+z", "-x"], gap: 1.5 });
      box(g, M.stone, 2, 0.3, 1.6, 0.9, 0, 3.2); box(g, M.stone, 2, 0.3, 1.1, 0.9, 0.3, 2.95);
      box(g, M.door, 1, 2, 0.1, 0.9, 0.6, 2.53);
      box(g, M.glass, 2, 2.2, 0.8, -1.2, 2.4, 2.9); box(g, M.cream, 2.2, 0.2, 1, -1.2, 4.6, 2.9);
      box(g, M.cream, 5.3, 0.45, 5.3, 0, 9, 0);
      wtower(g, M, 1.1, 9.45, 1.1, 0.7);
      box(g, M.steel, 0.08, 0.08, 1.2, 2.2, 3.1, 3.1); box(g, M.gold, 0.08, 0.8, 0.9, 2.2, 2.25, 3.4);
    } },
    "P3-2": { x: 10.5, z: 10.5, ry: Math.PI / 2, w: 10, d: 8, h: 13, make(g, M) {
      box(g, M.stone, 10, 0.6, 8); box(g, M.stone, 9, 5.6, 6, 0, 0.6, -0.6);
      for (let i = 0; i < 6; i++) cyl(g, M.cream, 0.3, 0.34, 4.6, -3.2 + i * 1.28, 0.6, 3, 12);
      box(g, M.cream, 9.2, 0.6, 2.2, 0, 5.2, 2.6); gable(g, M.stone, 9.2, 1.3, 2.2, 0, 5.8, 2.6);
      cyl(g, M.cream, 2.4, 2.4, 1.8, 0, 6.2, -0.6, 24);
      const dm = new THREE.Mesh(new THREE.SphereGeometry(2.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.copper); dm.position.set(0, 8, -0.6); g.add(dm);
      cyl(g, M.cream, 0.45, 0.45, 1.2, 0, 10.4, -0.6, 10); cyl(g, M.copper, 0.02, 0.5, 0.9, 0, 11.6, -0.6, 10);
      box(g, M.door, 1.4, 2.6, 0.1, 0, 0.6, 2.42);
      windows(g, M.glass, { w: 9, d: 6, floors: 2, fh: 2.4, y0: 0.8, faces: ["-x"], gap: 1.6 });
    } },
    "P3-3": { x: 21.5, z: 9.5, ry: Math.PI / 2, w: 8, d: 6, h: 13, make(g, M) {
      box(g, M.stone, 8, 12, 6);
      for (let i = 0; i < 6; i++) box(g, M.glass, 0.7, 10.6, 0.1, -3.1 + i * 1.24, 0.8, 3.03);
      for (let i = 0; i < 4; i++) box(g, M.glass, 0.1, 10.6, 0.7, -4.03, 0.8, -2.1 + i * 1.4);
      box(g, M.white, 3.4, 0.25, 1.6, 0, 2.6, 3.7); box(g, M.door, 1.6, 2.4, 0.1, 0, 0, 3.05);
      box(g, M.slate, 8.4, 0.6, 6.4, 0, 12, 0); box(g, M.slate, 2.4, 1.2, 2, 1.5, 12.6, -1);
    } },
    "P3-4": { x: 22, z: 22, ry: Math.PI / 2, w: 9, d: 6, h: 8.4, make(g, M) {
      box(g, M.brick, 9, 4.4, 6);
      box(g, M.blue, 9.15, 0.5, 6.15, 0, 3.4, 0); box(g, M.cream, 9.4, 0.35, 6.4, 0, 4.4, 0);
      box(g, M.glass, 5, 2, 0.1, -1, 0.4, 3.03); box(g, M.door, 1.2, 2.4, 0.1, 2.8, 0, 3.03);
      windows(g, M.glass, { w: 9, d: 6, floors: 1, fh: 3, y0: 0.3, faces: ["-x"], gap: 1.6 });
      cyl(g, M.steel, 0.12, 0.12, 1.4, 2.5, 4.75, -1.2, 6);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), M.white);
      dish.rotation.x = Math.PI * 0.75; dish.position.set(2.5, 6.6, -1.2); g.add(dish);
      cyl(g, M.steel, 0.05, 0.08, 3.6, -3, 4.75, -2, 6);
    } }
  };

  /* ---------- per-building instances: painted + clay, split by a moving cut ---------- */
  const world = new THREE.Group(); scene.add(world);
  const pickables = [];
  for (const d in B) {
    const b = B[d]; b.id = d;
    b.below = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    b.above = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const P = {}, C = {};
    const clay = new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.92, clippingPlanes: [b.above], clipShadows: true });
    for (const r in ROLES) {
      P[r] = new THREE.MeshStandardMaterial({ color: ROLES[r], roughness: ROUGH[r] || 0.82, metalness: r.startsWith("glass") ? 0.1 : 0, clippingPlanes: [b.below], clipShadows: true });
      C[r] = clay;
    }
    b.paintMats = Object.values(P); b.P = P; b.hl = false;
    b.group = new THREE.Group(); b.group.position.set(b.x, 0, b.z); b.group.rotation.y = b.ry;
    const gp = new THREE.Group(), gc = new THREE.Group(); b.make(gp, P); b.make(gc, C);
    tag(gp, d); tag(gc, d); b.group.add(gp, gc); mergeStatic(gp); mergeStatic(gc);
    box(b.group, PAL.pad, b.w + 2, 0.12, b.d + 2, 0, 0, 0).receiveShadow = true;
    world.add(b.group); pickables.push(gp, gc);
    b.m = 0; b.target = 0; b.from = 0;
    b.scaf = null; b.craneG = makeCrane(b); b.group.add(b.craneG);
    b.flagG = makeFlag(b); b.group.add(b.flagG);
  }
  function makeCrane(b) {
    const g = new THREE.Group(), H = b.h + 5;
    g.position.set(b.w / 2 + 1.2, 0, -b.d / 2 - 1.2);
    box(g, PAL.crane, 0.55, H, 0.55);
    for (let y = 1; y < H; y += 1.4) box(g, PAL.dark, 0.62, 0.06, 0.62, 0, y, 0);
    const jib = new THREE.Group(); jib.position.y = H; g.add(jib);
    box(jib, PAL.crane, 9, 0.45, 0.45, 2.8, 0, 0); box(jib, PAL.dark, 1.4, 0.9, 0.9, -2.2, -0.2, 0);
    box(jib, PAL.crane, 0.7, 0.9, 0.7, 0, 0.45, 0);
    box(jib, PAL.dark, 0.05, 3.2, 0.05, 6.4, -3.2, 0); box(jib, PAL.crane, 0.35, 0.3, 0.35, 6.4, -3.5, 0);
    g.userData.jib = jib; jib.rotation.y = Math.random() * 6.28;
    g.traverse(c => { if (c.isMesh) c.castShadow = true; }); noShadow(jib);
    mergeStatic(jib); mergeStatic(g, new Set([jib]));
    return g;
  }
  function makeFlag(b) {
    const g = new THREE.Group(), p = FLAGPOS[b.id] || [0, b.h, 0]; g.position.set(p[0], p[1], p[2]);
    cyl(g, PAL.white, 0.07, 0.09, 3.4, 0, 0, 0, 6);
    const pen = new THREE.Group(); pen.position.y = 3.35; g.add(pen);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(2.1, -0.55); sh.lineTo(0, -1.1); sh.closePath();
    pen.add(new THREE.Mesh(new THREE.ShapeGeometry(sh), FLAGMAT));
    g.userData.pen = pen; g.userData.ph = Math.random() * 6; g.visible = false;
    g.traverse(c => { if (c.isMesh) c.castShadow = true; }); noShadow(pen);
    return g;
  }
  const unit = new THREE.BoxGeometry(1, 1, 1);
  function rebuildScaffold(b) {
    if (b.scaf) { b.group.remove(b.scaf); b.scaf.dispose(); b.scaf = null; }
    const cut = b.h * b.m; if (b.m >= 0.999 || !b.id.startsWith("P" + currentPart)) return;
    const W = b.w + 0.6, D = b.d + 0.6, y0 = Math.max(0, cut), H = b.h - y0; if (H < 0.2) return;
    const parts = [];
    const posts = [];
    for (let x = -W / 2; x <= W / 2 + 0.01; x += W / Math.max(1, Math.round(W / 3.2))) posts.push([x, -D / 2], [x, D / 2]);
    for (let z = -D / 2 + D / Math.max(1, Math.round(D / 3.2)); z < D / 2 - 0.01; z += D / Math.max(1, Math.round(D / 3.2))) posts.push([-W / 2, z], [W / 2, z]);
    for (const [x, z] of posts) parts.push([x, y0 + H / 2, z, 0.1, H, 0.1]);
    for (let y = y0 + 0.05; y <= b.h + 0.01; y += 2) { parts.push([0, y, D / 2, W, 0.08, 0.08], [0, y, -D / 2, W, 0.08, 0.08], [W / 2, y, 0, 0.08, 0.08, D], [-W / 2, y, 0, 0.08, 0.08, D]); }
    const im = new THREE.InstancedMesh(unit, PAL.scaf, parts.length), M4 = new THREE.Matrix4();
    parts.forEach((p, i) => { M4.makeScale(p[3], p[4], p[5]); M4.setPosition(p[0], p[1], p[2]); im.setMatrixAt(i, M4); });
    im.castShadow = true; b.group.add(im); b.scaf = im;
  }
  function applyCut(b) {
    const cut = b.m >= 0.999 ? b.h + 50 : b.h * b.m - (b.m <= 0.001 ? 0.05 : 0);
    b.below.constant = cut; b.above.constant = -cut;
    b.craneG.visible = b.m < 0.999 && b.id.startsWith("P" + currentPart) && !viewTS;
    b.flagG.visible = b.m >= 0.999;
  }

  /* ---------- the board ---------- */
  const S = 33;
  box(world, PAL.earth, 2 * S, 3.2, 2 * S, 0, -3.5, 0).receiveShadow = true;
  box(world, PAL.earth2, 2 * S - 0.6, 0.5, 2 * S - 0.6, 0, -4, 0);
  box(world, PAL.grass, 2 * S, 0.3, 2 * S, 0, -0.3, 0).receiveShadow = true;
  const flat = (m, w, d, x, z, y = 0.01, h = 0.06) => { const o = box(world, m, w, h, d, x, y, z); o.receiveShadow = true; return o; };
  flat(PAL.road, 6, 2 * S, 0, 0); flat(PAL.road, 2 * S, 6, 0, 0, 0.012);
  for (const s of [-1, 1]) { flat(PAL.walk, 1.2, 2 * S, s * 3.6, 0, 0.01, 0.16); flat(PAL.walk, 2 * S, 1.2, 0, s * 3.6, 0.01, 0.16); }
  for (let t = -S + 2; t < S - 1; t += 3) { if (Math.abs(t) < 5) continue; flat(PAL.line, 0.18, 1.3, 0, t, 0.075, 0.02); flat(PAL.line, 1.3, 0.18, t, 0, 0.075, 0.02); }
  for (let i = -2; i <= 2; i++) { flat(PAL.white, 0.5, 2.4, i * 1.1, 5.2, 0.075, 0.02); flat(PAL.white, 2.4, 0.5, -5.2, i * 1.1, 0.075, 0.02); }
  flat(mat(0x8e8b95), 27, 27, -17.5, 17.5, 0.005, 0.03); flat(mat(0x4a4858, 0.55), 8, 28.5, -16, 18.6, 0.012, 0.04);
  /* park: pond, gazebo, benches, paths */
  function tree(x, z, s = 1, kind = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    cyl(g, PAL.trunk, 0.16, 0.2, 0.9, 0, 0, 0, 6);
    if (kind === 2) { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 0), PAL.bloom); o.position.y = 1.7; g.add(o); }
    else { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), kind ? PAL.leaf2 : PAL.leaf); o.scale.set(1, 0.9, 1); o.position.y = 1.75; g.add(o); }
    g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); world.add(g);
  }
  [
   [-5, -5, 0.8, 1], [-13.5, -15.5, 0.8, 0], [-31, -16, 1, 2], [-22.5, -16, 0.9, 1], [-31, -31, 1.1, 0], [-14, -30.5, 1, 2], [-5, -30, 0.9, 0],
   [5, -5, 0.8, 0], [16, -4.9, 0.8, 1], [5, -17.5, 0.9, 2], [30.8, -5, 1, 0], [31, -18, 0.9, 1], [8, -31, 1, 0],
   [5, 5, 0.8, 1], [15.5, 15.8, 0.9, 2], [27.5, 16, 0.8, 0], [5, 30, 1, 0], [16, 30.8, 0.9, 1], [31, 30.5, 1.1, 2], [30.8, 5, 0.9, 1]].forEach(t => tree(...t));
  for (let i = 0; i < 8; i++) box(world, PAL.hedge, 0.9, 0.7, 1.2, -31.3, 0, -6 - i * 1.3).castShadow = true;
  const truck = new THREE.Group(); truck.position.set(29.3, 0, 26); truck.rotation.y = Math.PI / 2; box(truck, mat(0xf4f3ef), 2.6, 1.5, 1.4, 0, 0.25, 0); box(truck, mat(0x3d64a8), 2.62, 0.25, 1.42, 0, 0.9, 0); box(truck, PAL.dark, 0.5, 0.8, 1.3, 1.5, 0.25, 0); world.add(tag(truck));
  const mailbox = new THREE.Group(); mailbox.position.set(28, 0, 19.5); box(mailbox, mat(0x3d64a8), 0.7, 1, 0.6, 0, 0.1, 0); box(mailbox, PAL.dark, 0.1, 0.3, 0.1, 0, 0, 0); world.add(tag(mailbox));
  /* streetlamps: bulbs, a soft glow and a pool of light, all off by day */
  const lampPost = mat(0x3b4152, 0.6);
  const glowMat = new THREE.SpriteMaterial({ map: GLOW, color: 0xffd9a0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
  const poolMat = new THREE.MeshBasicMaterial({ map: GLOW, color: 0xffc879, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
  const poolGeo = new THREE.PlaneGeometry(5, 5), bulbGeo = new THREE.SphereGeometry(0.22, 10, 8);
  for (const t of [-27, -17, -7, 7, 17, 27]) for (const [x, z] of [[4.5, t], [-4.5, t], [t, 4.5], [t, -4.5]]) {
    if (Math.abs(x - 4.6) < 1 && Math.abs(z + 13) < 3) continue;
    const g = new THREE.Group(); g.position.set(x, 0, z);
    cyl(g, lampPost, 0.07, 0.1, 3.2, 0, 0, 0, 6).castShadow = true;
    const head = new THREE.Mesh(bulbGeo, bulbMat); head.position.y = 3.3; g.add(head);
    const sp = new THREE.Sprite(glowMat); sp.scale.set(2.2, 2.2, 1); sp.position.y = 3.3; g.add(sp);
    const pool = new THREE.Mesh(poolGeo, poolMat); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.2; g.add(pool);
    world.add(g);
  }
  /* bus shelter on the downtown side of the avenue */
  const STOPZ = -13;
  const shelter = new THREE.Group(); shelter.position.set(4.7, 0, STOPZ);
  box(shelter, mat(0x9fc3d6, 0.2), 0.08, 1.9, 2.6, 0.55, 0.17, 0); box(shelter, mat(0x3b4152), 0.9, 0.12, 2.9, 0.15, 2.1, 0);
  box(shelter, mat(0x8a6a4a), 0.35, 0.1, 2, 0.3, 0.6, 0); cyl(shelter, lampPost, 0.04, 0.04, 2.5, -0.35, 0.17, 1.6, 6); box(shelter, mat(0x3d64a8), 0.06, 0.5, 0.5, -0.35, 2.3, 1.6);
  world.add(tag(shelter));
  /* pigeons on the plaza */
  const ducks = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(), white = i > 0;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), mat(white ? 0x8c93a0 : 0x6f7684)); body.scale.set(1.4, 0.8, 0.9); body.position.y = 0.2; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mat(0x4d5866)); head.position.set(0.42, 0.5, 0); g.add(head);
    box(g, mat(0x2b2f3d), 0.14, 0.05, 0.08, 0.6, 0.45, 0); g.scale.setScalar(0.6);
    g.userData = { a: i * 2.1, r: 1.1 + i * 0.7, s: 0.35 - i * 0.07 };
    world.add(g); ducks.push(g);
  }
  /* pigeons circling the screen tower */
  const birds = [], birdMat = mat(0x6b7280), wingGeo = new THREE.BoxGeometry(0.22, 0.04, 0.55);
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(); box(g, birdMat, 0.32, 0.12, 0.12, 0, -0.06, 0);
    const wl = new THREE.Group(), wr = new THREE.Group(); wl.position.z = 0.06; wr.position.z = -0.06;
    const ml = new THREE.Mesh(wingGeo, birdMat); ml.position.z = 0.27; wl.add(ml);
    const mr = new THREE.Mesh(wingGeo, birdMat); mr.position.z = -0.27; wr.add(mr);
    g.add(wl, wr); g.userData = { a: i * 0.45 + (i % 2) * 0.2, r: 8 + (i % 3) * 1.4, h: 38 + (i % 3) * 0.8, wl, wr, ph: i };
    world.add(g); birds.push(g);
  }
  const pole = new THREE.Group(); pole.position.set(16, 0, 27.5); cyl(pole, PAL.white, 0.06, 0.08, 7, 0, 0, 0, 6); const flag = box(pole, mat(0xc6455a), 1.6, 0.9, 0.04, 0.8, 6, 0); world.add(tag(pole)); flag.castShadow = false;

  /* ---------- Times Square: screens, red steps, the screen tower, street furniture ---------- */
  let HUD = { part: "1", ready: 0, due: 0, streak: 0, today: 0, goal: 20, gap: "" };
  const FACTS = [["STANDARD DEDUCTION 2025", "$15,750 SINGLE"], ["SALT CAP 2025", "$40,000"], ["CHILD TAX CREDIT 2025", "$2,200"], ["FBAR THRESHOLD", "OVER $10,000"],
    ["HOME SALE EXCLUSION", "$250K / $500K"], ["GIFT EXCLUSION 2025", "$19,000"], ["SECTION 179 LIMIT 2025", "$2,500,000"], ["BUSINESS MILEAGE 2025", "70 CENTS"],
    ["COLLECTION STATUTE", "10 YEARS"], ["EA CONTINUING EDUCATION", "16 HOURS A YEAR"], ["ESTATE EXCLUSION 2025", "$13,990,000"], ["TAX COURT PETITION", "90 DAYS"]];
  const PALS = [["#ff2d78", "#ff9a3c"], ["#00b4ff", "#6b4dff"], ["#ffcf3f", "#ff5e35"], ["#10d9a0", "#0077ff"], ["#b43cff", "#ff3c8e"], ["#ff3b3b", "#ffae00"]];
  const screens = [], tickers = [], frameMat = mat(0x1d2130, 0.5);
  function fit(ctx, txt, maxW, maxH, weight) { let fs = Math.floor(maxH); do { ctx.font = `${weight} ${fs}px Inter, system-ui, Arial, sans-serif`; if (ctx.measureText(txt).width <= maxW) break; fs -= 2; } while (fs > 8); return fs; }
  function drawScreen(sc) {
    const { ctx, c } = sc, W = c.width, H = c.height, kind = sc.kinds[sc.i % sc.kinds.length], pal = PALS[(sc.pal + sc.i) % PALS.length];
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.08)"; for (let y = 0; y < H; y += 5) ctx.fillRect(0, y, W, 2);
    let big, small;
    if (kind === "ready") { big = HUD.ready + "%"; small = "PART " + HUD.part + " READY"; }
    else if (kind === "due") { big = String(HUD.due); small = HUD.due === 1 ? "REVIEW DUE" : "REVIEWS DUE"; }
    else if (kind === "streak") { big = String(HUD.streak); small = "DAY STREAK"; }
    else if (kind === "today") { big = HUD.today + "/" + HUD.goal; small = "QUESTIONS TODAY"; }
    else if (kind === "gap") { big = "NEXT UP"; small = (HUD.gap || "Keep going").toUpperCase(); }
    else { sc.f = (sc.f + 1) % FACTS.length; small = FACTS[sc.f][0]; big = FACTS[sc.f][1]; }
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 8;
    if (W >= H) {
      fit(ctx, big, W * 0.88, H * 0.5, 900); ctx.fillText(big, W / 2, H * 0.42);
      fit(ctx, small, W * 0.88, H * 0.15, 800); ctx.fillText(small, W / 2, H * 0.8);
    } else {
      fit(ctx, big, W * 0.86, H * 0.2, 900); ctx.fillText(big, W / 2, H * 0.34);
      const words = small.split(" "), lh = Math.min(H * 0.08, W * 0.2);
      words.forEach((wd, k) => { fit(ctx, wd, W * 0.86, lh, 800); ctx.fillText(wd, W / 2, H * 0.56 + k * lh * 1.2); });
    }
    ctx.shadowBlur = 0; sc.tex.needsUpdate = true;
  }
  function screen(w, h, x, y, z, ry, opts = {}) {
    let pw, ph; if (w >= h) { ph = 160; pw = Math.min(1024, Math.round(ph * w / h)); } else { pw = 200; ph = Math.min(1024, Math.round(pw * h / w)); }
    const c = document.createElement("canvas"); c.width = pw; c.height = ph;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    mesh.position.set(x, y, z); mesh.rotation.y = ry; world.add(mesh);
    if (opts.frame !== false) { const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.1), frameMat); fr.position.set(x, y, z); fr.rotation.y = ry; fr.translateZ(-0.07); world.add(fr); }
    const sc = { c, ctx: c.getContext("2d"), tex, kinds: opts.kinds || ["ready", "fact", "due", "fact", "streak", "gap", "fact", "today"], i: opts.i || 0, pal: opts.pal || 0, f: opts.f || 0, next: 0, period: opts.period || 4600 };
    screens.push(sc); drawScreen(sc); return sc;
  }
  const TICK_W = 4096;
  function ticker(w, h, places) {
    const c = document.createElement("canvas"); c.width = TICK_W; c.height = 64;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.x = (w / h) * 64 / TICK_W;
    const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    for (const [x, y, z, ry] of places) { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.y = ry; world.add(o); }
    const t = { c, ctx: c.getContext("2d"), tex, w, h, s: Math.random() * 400, tw: 1 }; tickers.push(t); drawTicker(t); return t;
  }
  function drawTicker(t) {
    const txt = `PART ${HUD.part}: ${HUD.ready}% READY   •   ${HUD.due} ${HUD.due === 1 ? "REVIEW" : "REVIEWS"} DUE   •   ${HUD.streak}-DAY STREAK   •   ${HUD.today} OF ${HUD.goal} TODAY   •   EXAM WINDOW OPEN THROUGH FEB 28, 2027   •   ${HUD.gap ? "NEXT UP: " + HUD.gap.toUpperCase() : "KEEP STUDYING"}   •   `;
    const ctx = t.ctx, vis = (t.w / t.h) * 64; let fs = 40;
    do { ctx.font = `800 ${fs}px Inter, system-ui, Arial, sans-serif`; t.tw = Math.ceil(ctx.measureText(txt).width); fs -= 2; } while (t.tw + vis > TICK_W && fs > 14);
    ctx.fillStyle = "#0b0a1a"; ctx.fillRect(0, 0, TICK_W, 64); ctx.textBaseline = "middle"; ctx.fillStyle = "#ffcf4a";
    ctx.fillText(txt, 0, 34); ctx.fillText(txt, t.tw, 34); t.tex.needsUpdate = true;
  }
  /* ---------- Times Square canyon: towers, screen walls, the screen tower, a theater, the red steps ---------- */
  const CX = -16;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const winTex = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 128; const x = c.getContext("2d"); x.fillStyle = "#1b1f2e"; x.fillRect(0, 0, 64, 128);
    for (let r = 0; r < 16; r++) for (let q = 0; q < 8; q++) { const lit = rnd() < 0.55; x.fillStyle = lit ? (rnd() < 0.5 ? "#ffd9a0" : "#cfe3ff") : "#2a3044"; x.fillRect(q * 8 + 2, r * 8 + 2, 5, 5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t; })();
  const towerMats = [];
  function tower(x0, x1, z0, z1, h, crown) {
    const w = x1 - x0, d = z1 - z0, tex = winTex.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(w, d) / 4, h / 4);
    const m = new THREE.MeshStandardMaterial({ color: 0x9aa3b8, map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0, roughness: 0.6 }); towerMats.push(m);
    const o = box(world, m, w, h, d, (x0 + x1) / 2, 0, (z0 + z1) / 2); o.castShadow = true; o.receiveShadow = true;
    if (crown) { box(world, frameMat, w * 0.6, 2.2, d * 0.6, (x0 + x1) / 2, h, (z0 + z1) / 2).castShadow = true; cyl(world, mat(0x9ea6b1, 0.5), 0.08, 0.14, 4, (x0 + x1) / 2, h + 2.2, (z0 + z1) / 2, 6); }
  }
  /* abstract neon artwork for most panels; it scrolls instead of redrawing */
  const NEON = ["#ff2d78", "#00e5ff", "#ffcf3f", "#b43cff", "#10d9a0", "#ff6b35", "#ffffff", "#3d7bff"];
  const ART = [0, 1, 2, 3, 4, 5].map(k => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d");
    const grad = (a, b, v) => { const g = v ? x.createLinearGradient(0, 0, 0, 256) : x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, 512, 256); };
    if (k === 0) { grad("#2a0b5e", "#ff2d78", true); x.lineWidth = 14; for (let i = 0; i < 6; i++) { x.strokeStyle = NEON[(i * 3) % NEON.length]; x.globalAlpha = 0.8; x.beginPath(); for (let u = 0; u <= 512; u += 8) x.lineTo(u, 40 + i * 36 + Math.sin(u / 512 * Math.PI * 4 + i) * 18); x.stroke(); } }
    if (k === 1) { x.fillStyle = "#120c2a"; x.fillRect(0, 0, 512, 256); for (let i = 0; i < 46; i++) { x.globalAlpha = 0.9; x.fillStyle = NEON[Math.floor(rnd() * NEON.length)]; x.fillRect(rnd() * 512, rnd() * 256, 20 + rnd() * 120, 14 + rnd() * 70); } }
    if (k === 2) { x.fillStyle = "#08061a"; x.fillRect(0, 0, 512, 256); for (let i = 0; i < 60; i++) { const cx = rnd() * 512, cy = rnd() * 256, r = 8 + rnd() * 40, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); const col = NEON[Math.floor(rnd() * NEON.length)]; g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); } }
    if (k === 3) { const cols = ["#ff3c8e", "#6b4dff", "#00b4ff", "#ffcf3f"]; for (let i = -8; i < 24; i++) { x.fillStyle = cols[(i + 8) % 4]; x.beginPath(); x.moveTo(i * 40, 0); x.lineTo(i * 40 + 40, 0); x.lineTo(i * 40 - 216, 256); x.lineTo(i * 40 - 256, 256); x.fill(); } }
    if (k === 4) { grad("#ff3b3b", "#ffae00"); x.fillStyle = "#fff"; for (let i = 0; i < 4; i++) { x.globalAlpha = i ? 0.75 : 1; const y = 40 + i * 48, w = i ? 180 + rnd() * 160 : 360; x.fillRect(40, y, w, i ? 18 : 34); } x.globalAlpha = 1; x.beginPath(); x.arc(440, 128, 50, 0, Math.PI * 2); x.fillStyle = "#2a0b5e"; x.fill(); }
    if (k === 5) { grad("#00b4ff", "#10d9a0", true); for (let i = 0; i < 18; i++) { x.globalAlpha = 0.35; x.fillStyle = "#ffffff"; x.beginPath(); x.arc(rnd() * 512, rnd() * 256, 10 + rnd() * 50, 0, Math.PI * 2); x.fill(); } }
    x.globalAlpha = 1; x.fillStyle = "rgba(0,0,0,0.12)"; for (let y = 0; y < 256; y += 4) x.fillRect(0, y, 512, 1);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  });
  const arts = [];
  function artPanel(w, h, x, y, z, ry, k) {
    const tex = ART[k % ART.length].clone(); tex.needsUpdate = true; tex.repeat.set(w / (2 * h), 1); tex.offset.set(rnd(), 0);
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); o.position.set(x, y, z); o.rotation.y = ry; world.add(o);
    const vert = rnd() < 0.3; arts.push({ o, tex, vx: vert ? 0 : (0.02 + rnd() * 0.05) * (rnd() < 0.5 ? -1 : 1), vy: vert ? 0.05 + rnd() * 0.05 : 0 });
  }
  let wallN = 0;
  function screenWall(axis, at, ry, u0, u1, y0, y1) {
    let y = y0;
    while (y < y1 - 1.2) {
      const rh = Math.min(y1 - y, 2.4 + rnd() * 3.2), splits = rnd() < 0.45 ? 1 : 2; let u = u0;
      for (let s = 0; s < splits; s++) {
        const uw = s === splits - 1 ? (u1 - u) : (u1 - u0) * (0.35 + rnd() * 0.3), w = uw - 0.16, h = rh - 0.16, cu = u + uw / 2, cy = y + rh / 2;
        const [x, z] = axis === "x" ? [at, cu] : [cu, at];
        if (wallN++ % 4 === 0) screen(w, h, x, cy, z, ry, { i: wallN, pal: wallN, f: wallN * 2, period: 6400, frame: false }); else artPanel(w, h, x, cy, z, ry, Math.floor(rnd() * 6));
        u += uw;
      }
      y += rh;
    }
  }
  tower(-31, -20, 5.5, 12.5, 22); tower(-31, -20, 13.5, 22, 32, true); tower(-31, -20, 23, 31.5, 24);
  tower(-12, -5.2, 5.5, 12, 18); tower(-12, -5.2, 13, 21.5, 27, true); tower(-12, -5.2, 22.5, 31.5, 20);
  const WE = -20 + 0.06, EW = -12 - 0.06;
  screenWall("x", WE, Math.PI / 2, 5.6, 12.4, 1.2, 15); screenWall("x", WE, Math.PI / 2, 13.6, 21.9, 1.2, 20); screenWall("x", WE, Math.PI / 2, 23.1, 31.4, 1.2, 16);
  screenWall("x", EW, -Math.PI / 2, 5.6, 11.9, 5.4, 14); screenWall("x", EW, -Math.PI / 2, 13.1, 21.4, 1.2, 17.5); screenWall("x", EW, -Math.PI / 2, 22.6, 31.4, 1.2, 14);
  screenWall("z", 5.44, Math.PI, -30.9, -20.1, 3, 14); screenWall("z", 5.44, Math.PI, -11.9, -5.3, 6, 13); screenWall("x", -5.14, Math.PI / 2, 13.1, 21.4, 3, 15);
  ticker(8.3, 0.9, [[-12.08, 19, 17.25, -Math.PI / 2], [-5.12, 19, 17.25, Math.PI / 2]]);
  /* the screen tower that closes the canyon */
  const TS0 = -18.2, TS1 = -13.8, TZ0 = 27.5, TZ1 = 30.5, TH = 36;
  box(world, frameMat, TS1 - TS0, TH, TZ1 - TZ0, CX, 0, (TZ0 + TZ1) / 2).castShadow = true;
  cyl(world, mat(0x9ea6b1, 0.5), 0.08, 0.14, 4, CX, TH, (TZ0 + TZ1) / 2, 6);
  { let y = 3; [4.4, 3, 4.6, 3.2, 5, 3.4, 4.2].forEach((h, k) => {
      const cy = y + h / 2;
      if (k % 2 === 0) screen(4.2, h - 0.2, CX, cy, TZ0 - 0.06, Math.PI, { i: k, pal: k + 1, f: k * 2 + 1, frame: false }); else artPanel(4.2, h - 0.2, CX, cy, TZ0 - 0.06, Math.PI, k);
      artPanel(2.8, h - 0.2, TS1 + 0.06, cy, (TZ0 + TZ1) / 2, Math.PI / 2, k + 2); artPanel(2.8, h - 0.2, TS0 - 0.06, cy, (TZ0 + TZ1) / 2, -Math.PI / 2, k + 4);
      y += h; }); }
  ticker(4.4, 0.8, [[CX, 2.1, TZ0 - 0.08, Math.PI]]);
  /* a theater: marquee with chasing bulbs and a blade sign */
  box(world, frameMat, 1.4, 1.3, 5.6, -12.7, 3.4, 8.75).castShadow = true;
  box(world, mat(0x2c3e55, 0.3), 0.1, 2.6, 4, -12.05, 0, 8.75);
  const textPanel = (w, h, x, y, z, ry, cw, chh, draw) => { const c = document.createElement("canvas"); c.width = cw; c.height = chh; draw(c.getContext("2d"), cw, chh); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); o.position.set(x, y, z); o.rotation.y = ry; world.add(o); };
  textPanel(5.4, 1.1, -13.42, 4.05, 8.75, -Math.PI / 2, 640, 130, (x, W, H) => { x.fillStyle = "#fff8e6"; x.fillRect(0, 0, W, H); x.fillStyle = "#c6123f"; x.textAlign = "center"; x.textBaseline = "middle"; fit(x, "NOW PLAYING", W * 0.5, H * 0.3, 800); x.fillText("NOW PLAYING", W / 2, H * 0.26); x.fillStyle = "#1b1f2e"; fit(x, "FORM 1040: THE MUSICAL", W * 0.92, H * 0.42, 900); x.fillText("FORM 1040: THE MUSICAL", W / 2, H * 0.66); });
  box(world, frameMat, 1.5, 7, 0.25, -12.85, 5.2, 6.1).castShadow = true;
  const blade = (x, W, H) => { x.fillStyle = "#c6123f"; x.fillRect(0, 0, W, H); x.fillStyle = "#fff"; x.strokeStyle = "#ffcf3f"; x.lineWidth = 4; x.textAlign = "center"; x.textBaseline = "middle"; "LEDGER".split("").forEach((ch, i) => { x.font = "900 86px Inter, system-ui, Arial, sans-serif"; x.strokeText(ch, W / 2, 60 + i * 104); x.fillText(ch, W / 2, 60 + i * 104); }); };
  textPanel(1.3, 6.8, -12.85, 8.6, 5.96, Math.PI, 128, 670, blade); textPanel(1.3, 6.8, -12.85, 8.6, 6.24, 0, 128, 670, blade);
  const bulbPts = [];
  for (let z = 6.05; z <= 11.46; z += 0.27) bulbPts.push([-13.46, 3.42, z], [-13.46, 4.68, z]);
  for (let y = 5.3; y <= 12.1; y += 0.34) bulbPts.push([-12.85, y, 5.94], [-12.85, y, 6.26]);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ toneMapped: false }), bulbPts.length);
  { const M = new THREE.Matrix4(), on = new THREE.Color(1, 0.9, 0.55); bulbPts.forEach((p, i) => { M.makeTranslation(p[0], p[1], p[2]); bulbs.setMatrixAt(i, M); bulbs.setColorAt(i, on); }); world.add(bulbs); }
  const BULB_ON = new THREE.Color(1.6, 1.3, 0.7), BULB_DIM = new THREE.Color(0.45, 0.32, 0.18);
  /* the red steps */
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xd8262f, roughness: 0.3, emissive: 0xff2a2a, emissiveIntensity: 0.25 });
  for (let i = 0; i < 5; i++) { const o = box(world, stepMat, 6, 0.42 * (i + 1), 0.8, CX, 0, 15.2 + i * 0.8); o.castShadow = true; o.receiveShadow = true; }
  /* billboards on the buildings that face the crossroads */
  screen(4.6, 3.6, -6.42, 6.8, -9.5, Math.PI / 2, { i: 1, pal: 2, f: 2 });
  screen(3.2, 5.4, -9.5, 5.6, -6.42, 0, { i: 3, pal: 4, f: 5, kinds: ["due", "fact", "streak", "fact", "ready"] });
  screen(6, 10, 6.88, 13, -10.5, -Math.PI / 2, { i: 0, pal: 1, f: 7 });
  screen(6, 8, 10.5, 12, -6.88, 0, { i: 4, pal: 5, f: 9 });
  ticker(8.4, 0.8, [[5.92, 2.1, -10.5, -Math.PI / 2], [10.5, 2.1, -5.92, 0]]);
  screen(5.4, 4, 21.5, 7.5, 5.42, Math.PI, { i: 2, pal: 3, f: 4 });
  screen(4.2, 6, 18.42, 6.5, 9.5, -Math.PI / 2, { i: 5, pal: 0, f: 10, kinds: ["gap", "fact", "today", "fact"] });
  /* colored light from the screens, on the street at dusk */
  const spillMats = [];
  for (const [x, z, sz, col] of [[0, 0, 18, 0xc13cff], [CX, 11, 12, 0xff2d78], [CX, 23, 12, 0x00b4ff], [8, -8, 12, 0x00b4ff], [-8, -8, 10, 0xffae00], [19, 6, 9, 0x10d9a0]]) {
    const m = new THREE.MeshBasicMaterial({ map: GLOW, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }); spillMats.push(m);
    const o = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), m); o.rotation.x = -Math.PI / 2; o.position.set(x, 0.22, z); world.add(o);
  }
  /* crowds in the canyon and on the steps (instanced: three draws for everyone) */
  const headGeo = new THREE.SphereGeometry(0.2, 8, 6), bodyGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.8, 8), legGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8);
  const CROWD = [], crowd = [];
  for (let k = 0; k < 14; k++) { const i = Math.floor(rnd() * 5); CROWD.push([CX - 2.6 + rnd() * 5.2, 0.42 * (i + 1), 15.2 + i * 0.8]); }
  for (let k = 0; k < 60; k++) { let x, z; do { x = -19.6 + rnd() * 7.2; z = 4.8 + rnd() * 22; } while ((x > -19.2 && x < -12.8 && z > 14.6 && z < 19.8) || (z > 26.9 && x > -18.6 && x < -13.4) || (x > -14.6 && z > 12.2 && z < 14.2)); CROWD.push([x, 0.02, z]); }
  { const n = CROWD.length, cLeg = new THREE.InstancedMesh(legGeo, PAL.dark, n), cBody = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n), cHead = new THREE.InstancedMesh(headGeo, PAL.skin, n);
    const M = new THREE.Matrix4(), CC = [0xc6455a, 0x3d64a8, 0x2f8f5b, 0xe9a43a, 0x6b4fa8, 0x2f8f8a, 0xf4f3ef, 0x2b2f3d, 0xd8262f].map(c => new THREE.Color(c));
    CROWD.forEach(([x, y, z], i) => { M.makeTranslation(x, y + 0.125, z); cLeg.setMatrixAt(i, M); M.makeTranslation(x, y + 0.55, z); cBody.setMatrixAt(i, M); cBody.setColorAt(i, CC[Math.floor(rnd() * CC.length)]); M.makeTranslation(x, y + 1.15, z); cHead.setMatrixAt(i, M); });
    [cLeg, cBody, cHead].forEach(m => { m.castShadow = true; world.add(m); crowd.push(m); }); }
  /* hot dog cart */
  const cart = new THREE.Group(); cart.position.set(-13.4, 0, 13.2); cart.rotation.y = Math.PI / 2;
  box(cart, mat(0xc9ced6, 0.35, 0.4), 1.6, 0.9, 0.8, 0, 0.35, 0); for (const x of [-0.5, 0.5]) box(cart, PAL.dark, 0.36, 0.36, 0.08, x, 0, 0.42);
  cyl(cart, PAL.white, 0.04, 0.04, 1.6, 0, 1.25, 0, 6);
  const umb = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.5, 8), mat(0xf5c518)); umb.position.y = 3.05; cart.add(umb);
  const umb2 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.2, 8), mat(0x3d64a8)); umb2.position.y = 3.35; cart.add(umb2);
  world.add(tag(cart));
  /* subway entrances */
  const subGreen = mat(0x1f6b45, 0.5), globeMat = new THREE.MeshStandardMaterial({ color: 0x5dff9a, emissive: 0x3dff8a, emissiveIntensity: 0.5, roughness: 0.3 });
  for (const [x, z, ry] of [[4.75, 21.5, 0], [-4.75, -21.5, Math.PI]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    box(g, PAL.dark, 0.9, 0.02, 2.2, 0, 0.17, 0);
    box(g, subGreen, 0.06, 0.9, 2.2, -0.48, 0.17, 0); box(g, subGreen, 0.06, 0.9, 2.2, 0.48, 0.17, 0); box(g, subGreen, 1.0, 0.9, 0.06, 0, 0.17, 1.1);
    for (const sx of [-0.48, 0.48]) { cyl(g, subGreen, 0.04, 0.05, 1.6, sx, 0.17, -1.1, 6); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), globeMat); gl.position.set(sx, 1.95, -1.1); g.add(gl); }
    world.add(g);
  }
  /* steam stacks in the street */
  const steam = [];
  for (const [x, z] of [[0, 12], [12, 0], [0, -20]]) {
    cyl(world, mat(0xff7a1a, 0.6), 0.3, 0.34, 1.5, x, 0.07, z, 12); for (const y of [0.45, 0.95]) cyl(world, PAL.white, 0.31, 0.35, 0.18, x, 0.07 + y, z, 12);
    for (let i = 0; i < 4; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 })); sp.userData = { x, z, ph: i / 4 }; world.add(sp); steam.push(sp); }
  }

  /* ---------- movers ---------- */
  const TAXI = 0xf5c518, carCols = [TAXI, TAXI, 0x2b2f3d, TAXI, TAXI, 0xf4f3ef, TAXI, 0xc6455a];
  const lanes = [{ ax: "z", c: -1.45, dir: 1 }, { ax: "z", c: 1.45, dir: -1 }, { ax: "x", c: 1.45, dir: 1 }, { ax: "x", c: -1.45, dir: -1 }];
  const cars = [];
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group(), col = mat(carCols[i % carCols.length], 0.45);
    box(g, col, 1.9, 0.6, 1, 0, 0.18, 0); box(g, mat(0xdfe8f0, 0.2), 1.05, 0.48, 0.9, -0.1, 0.78, 0); box(g, PAL.dark, 1.6, 0.22, 1.04, 0, 0, 0);
    for (const z of [0.28, -0.28]) { box(g, headMat, 0.06, 0.16, 0.22, 0.96, 0.32, z); box(g, tailMat, 0.06, 0.14, 0.2, -0.96, 0.32, z); }
    if (carCols[i % carCols.length] === TAXI) { box(g, headMat, 0.5, 0.18, 0.62, -0.1, 1.02, 0); box(g, PAL.dark, 1.92, 0.08, 1.02, 0, 0.45, 0); }
    mergeStatic(g);
    const lane = [lanes[0], lanes[2], lanes[3]][i % 3]; g.userData = { lane, t: (i * 0.37) % 1, speed: 0.022 + (i % 3) * 0.004 };
    if (lane.ax === "z") g.rotation.y = lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2; else g.rotation.y = lane.dir > 0 ? 0 : Math.PI;
    g.visible = false; world.add(g); cars.push(g);
  }
  const bus = new THREE.Group();
  box(bus, mat(0x2f6db5, 0.5), 4.4, 1.3, 1.25, 0, 0.25, 0); box(bus, mat(0xf4f3ef, 0.5), 4.42, 0.22, 1.27, 0, 1.55, 0);
  box(bus, busWin, 3.3, 0.5, 1.28, -0.35, 1.0, 0); box(bus, busWin, 0.06, 0.6, 1.0, 2.2, 0.95, 0); box(bus, PAL.dark, 3.8, 0.25, 1.28, 0, 0, 0);
  for (const z of [0.4, -0.4]) { box(bus, headMat, 0.06, 0.18, 0.24, 2.21, 0.45, z); box(bus, tailMat, 0.06, 0.16, 0.22, -2.21, 0.45, z); }
  mergeStatic(bus);
  bus.rotation.y = Math.PI / 2; bus.userData = { lane: lanes[1], t: 0.2, speed: 0.017, dwell: 0, stopped: false }; world.add(bus);
  const walkers = [];
  const shirts = [0xc6455a, 0x3d64a8, 0x2f8f5b, 0xe9a43a, 0x6b4fa8, 0x2f8f8a, 0xf4f3ef];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); cyl(g, mat(shirts[i % shirts.length]), 0.22, 0.26, 0.8, 0, 0.15, 0, 8); cyl(g, PAL.dark, 0.2, 0.2, 0.25, 0, 0, 0, 8);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), PAL.skin); h.position.y = 1.15; g.add(h);
    const s = i % 2 ? 1 : -1; g.userData = { ax: i % 4 < 2 ? "z" : "x", c: s * 3.6, dir: i % 3 ? 1 : -1, t: (i * 0.23) % 1, speed: 0.006 + (i % 3) * 0.0015 };
    world.add(g); walkers.push(g);
  }
  /* everything that never moves folds into one mesh per material */
  mergeStatic(world, new Set([...Object.values(B).map(b => b.group), ...ducks, ...birds, ...cars, bus, ...walkers, flag]));
  function along(o, ax, c, t, dir, y = 0) { const p = (dir > 0 ? t : 1 - t) * 2 * S - S; if (ax === "z") o.position.set(c, y, p); else o.position.set(p, y, c); const e = Math.min(1, (S - Math.abs(p)) / 2.5); o.scale.setScalar(Math.max(0.001, e)); }

  /* ---------- camera rig ---------- */
  const FOCUS = { ts: { t: [-16, 9, 15], r: 15, yaw: Math.PI, el: 0.32 }, 1: { t: [-9, 2, -9], r: 25, yaw: -3 * Math.PI / 4 }, 2: { t: [9, 2, -9], r: 26, yaw: 3 * Math.PI / 4 }, 3: { t: [9, 2, 9], r: 25, yaw: Math.PI / 4 } };
  const rig = { tx: -9, ty: 2, tz: -9, r: 25, yaw: -3 * Math.PI / 4, off: 0, el: 0.64, zoom: 1, anim: null };
  let aspect = 1;
  function placeCamera() {
    const fovV = THREE.MathUtils.degToRad(camera.fov), fit = Math.min(Math.tan(fovV / 2), Math.tan(fovV / 2) * aspect);
    const D = (rig.r / fit) * 1.02 / rig.zoom, yaw = rig.yaw + rig.off;
    camera.position.set(rig.tx + D * Math.cos(rig.el) * Math.sin(yaw), rig.ty + D * Math.sin(rig.el), rig.tz + D * Math.cos(rig.el) * Math.cos(yaw));
    camera.lookAt(rig.tx, rig.ty + 3, rig.tz);
    const ky = yaw - 0.75;
    sun.position.set(rig.tx + 60 * Math.sin(ky), 72, rig.tz + 60 * Math.cos(ky)); sun.target.position.set(rig.tx, 0, rig.tz); sun.target.updateMatrixWorld();
  }
  function focusPart(p, instant) {
    const f = FOCUS[p] || FOCUS[1]; let yaw = f.yaw; while (yaw - rig.yaw > Math.PI) yaw -= 2 * Math.PI; while (yaw - rig.yaw < -Math.PI) yaw += 2 * Math.PI;
    const to = { tx: f.t[0], ty: f.t[1], tz: f.t[2], r: f.r, yaw, el: f.el || 0.64 }; rig.off = 0;
    if (instant || reduce) { Object.assign(rig, to); rig.anim = null; return; }
    rig.anim = { from: { tx: rig.tx, ty: rig.ty, tz: rig.tz, r: rig.r, yaw: rig.yaw, el: rig.el }, to, t0: performance.now(), dur: 850 };
  }

  /* ---------- labels ---------- */
  let viewTS = false, stage = null, labels = null, tagEls = {}, currentPart = "1", focusD = null, highlightD = null;
  const v3 = new THREE.Vector3();
  function buildLabels() {
    if (!labels) return; labels.innerHTML = ""; tagEls = {};
    const names = (window.__townLabels && window.__townLabels().names) || {};
    for (const d in B) {
      if (!d.startsWith("P" + currentPart)) continue;
      const el = document.createElement("button"); el.className = "tag"; el.type = "button";
      el.innerHTML = `<b class="fl" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2 11V1.5M2.6 1.8 10 3.6 2.6 5.6Z" fill="currentColor" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></b>${names[d] || d}<i></i>`; el.onclick = () => window.__townPick && window.__townPick(d);
      labels.appendChild(el); tagEls[d] = el;
    }
    updateLabelText();
  }
  function updateLabelText() {
    for (const d in tagEls) { tagEls[d].querySelector("i").textContent = Math.round(B[d].target * 100) + "%"; tagEls[d].classList.toggle("focus", d === focusD || d === highlightD); tagEls[d].classList.toggle("done", B[d].target >= 0.999); }
  }
  function placeLabels() {
    if (!stage) return; if (labels) labels.style.visibility = viewTS ? "hidden" : ""; if (viewTS) return; const w = stage.clientWidth, h = stage.clientHeight;
    const items = [];
    for (const d in tagEls) {
      const b = B[d]; v3.set(b.x, b.h + 1.2, b.z).project(camera);
      const el = tagEls[d]; if (!el._w) { el._w = el.offsetWidth || 90; el._h = el.offsetHeight || 26; }
      items.push({ el, x: (v3.x + 1) / 2 * w, y: (1 - v3.y) / 2 * h, on: v3.z < 1 });
    }
    items.sort((a, b) => b.y - a.y);
    const placed = [];
    for (const it of items) {
      const hw = it.el._w / 2 + 3, hh = it.el._h + 4;
      it.x = Math.min(w - hw + 3, Math.max(hw - 3, it.x));
      for (let k = 0; k < 12; k++) {
        const hit = placed.find(p => Math.abs(p.x - it.x) < p.hw + hw && Math.abs(p.y - it.y) < hh);
        if (!hit) break; it.y = hit.y - hh;
      }
      it.hw = hw; placed.push(it);
      it.el.style.transform = `translate(${it.x}px, ${it.y}px) translate(-50%, -100%)`;
      it.y = Math.max(it.el._h + 6, it.y); it.el.style.transform = `translate(${it.x}px, ${it.y}px) translate(-50%, -100%)`;
      it.el.style.opacity = it.on ? 1 : 0;
    }
  }

  /* ---------- pointer: drag to turn, pinch or wheel to zoom, tap to pick ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const ptrs = new Map(); let downAt = null, moved = false, pinch0 = null;
  function onDown(e) { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) { downAt = { x: e.clientX, y: e.clientY, off: rig.off }; moved = false; } if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), z: rig.zoom }; } }
  function onMove(e) {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; rig.zoom = THREE.MathUtils.clamp(pinch0.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch0.d, 0.75, 1.9); moved = true; kick(); return; }
    if (downAt) { const dx = e.clientX - downAt.x; if (Math.abs(dx) > 6 || Math.abs(e.clientY - downAt.y) > 6) moved = true; rig.off = THREE.MathUtils.clamp(downAt.off - dx * 0.006, -1.1, 1.1); kick(); }
  }
  function onUp(e) {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null;
    if (ptrs.size === 0 && downAt && !moved) {
      const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, true).find(h => h.object.userData.d);
      if (hit && window.__townPick) window.__townPick(hit.object.userData.d);
    }
    if (ptrs.size === 0) downAt = null;
  }
  canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", e => { e.preventDefault(); rig.zoom = THREE.MathUtils.clamp(rig.zoom * (e.deltaY < 0 ? 1.08 : 0.93), 0.75, 1.9); kick(); }, { passive: false });
  canvas.addEventListener("dblclick", () => { rig.off = 0; rig.zoom = 1; kick(); });

  /* ---------- fireworks ---------- */
  const bursts = [], pending = [];
  const FW_COLS = [[1, 0.5, 0.02], [1, 0.12, 0.35], [0.05, 0.85, 0.7], [0.45, 0.3, 1], [1, 0.8, 0.1]];
  function burst(x, y, z, k) {
    const N = 90, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    const c1 = FW_COLS[k % FW_COLS.length], c2 = FW_COLS[(k + 2) % FW_COLS.length];
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = 11 + Math.random() * 3.5;
      vel[i * 3] = r * Math.cos(th) * sp; vel[i * 3 + 1] = u * sp + 1.5; vel[i * 3 + 2] = r * Math.sin(th) * sp;
      const c = i % 3 ? c1 : c2; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size: skyK > 0.5 ? 5.2 : 3.2, opacity: 0.95, map: skyK > 0.5 ? GLOW : DOT, alphaTest: skyK > 0.5 ? 0 : 0.4, vertexColors: true, toneMapped: false, blending: skyK > 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false });
    const pts = new THREE.Points(geo, m); pts.frustumCulled = false; scene.add(pts);
    bursts.push({ pts, vel, o: [x, y, z], t0: performance.now(), life: 1800 });
  }
  function stepBursts(now) {
    for (let j = bursts.length - 1; j >= 0; j--) {
      const b = bursts[j], t = (now - b.t0) / 1000, k = 2.4, f = (1 - Math.exp(-k * t)) / k, p = b.pts.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, b.o[0] + b.vel[i * 3] * f, b.o[1] + b.vel[i * 3 + 1] * f - 2.2 * t * t, b.o[2] + b.vel[i * 3 + 2] * f);
      p.needsUpdate = true; const a = Math.min(1, t * 1000 / b.life); b.pts.material.opacity = 0.95 * (1 - a * a); b.pts.userData.s0 = b.pts.userData.s0 || b.pts.material.size; b.pts.material.size = b.pts.userData.s0 * (1 - 0.45 * a);
      if (a >= 1) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(j, 1); }
    }
    for (let j = pending.length - 1; j >= 0; j--) {
      const q = pending[j]; if (now < q.at) continue; pending.splice(j, 1);
      const b = B[q.d], top = (FLAGPOS[q.d] ? FLAGPOS[q.d][1] : b.h) + 9;
      [[0, 0], [-2.6, 1.2], [2.4, 0.8], [0.4, 2]].forEach(([dx, dy], i) => setTimeout(() => { burst(b.x + dx, top + dy, b.z - dx * 0.5, i + q.k); kick(); }, i * 320));
    }
  }

  /* ---------- day and dusk ---------- */
  let skyK = 0, skyTarget = 0, skyInit = false;
  const C = (h) => new THREE.Color(h);
  const SKY = { hemi: [C(0xe3ebff), C(0x7f8fd6)], ground: [C(0x8c7a66), C(0x3b2c3e)], sun: [C(0xfff0db), C(0xff9a66)], fill: [C(0xb9c8ff), C(0x6f7dff)] };
  const lerp = (a, b, k) => a + (b - a) * k;
  function refreshEmissive() {
    for (const d in B) { const b = B[d]; for (const r in b.P) { const m = b.P[r];
      if (r === "glass" || r === "glass2") { m.emissive.setHex(0xffc46b); m.emissiveIntensity = skyK * (r === "glass" ? 1.6 : 0.7) + (b.hl ? 0.12 : 0); }
      else { m.emissive.setHex(0x2a1c00); m.emissiveIntensity = b.hl ? 1 : 0; } } }
  }
  function applySky() {
    const k = skyK;
    hemi.intensity = lerp(1.35, 0.42, k); hemi.color.copy(SKY.hemi[0]).lerp(SKY.hemi[1], k); hemi.groundColor.copy(SKY.ground[0]).lerp(SKY.ground[1], k);
    sun.intensity = lerp(2.4, 0.6, k); sun.color.copy(SKY.sun[0]).lerp(SKY.sun[1], k);
    fill.intensity = lerp(0.45, 0.35, k); fill.color.copy(SKY.fill[0]).lerp(SKY.fill[1], k);
    renderer.toneMappingExposure = lerp(1.05, 1.18, k);
    bulbMat.emissiveIntensity = 3 * k; glowMat.opacity = 0.9 * k; poolMat.opacity = 0.5 * k; glowMat.visible = poolMat.visible = k > 0.01;
    headMat.emissiveIntensity = 2.6 * k; tailMat.emissiveIntensity = 2 * k; busWin.emissiveIntensity = 1.3 * k;
    birds.forEach(b => { b.visible = k < 0.5 && !low; });
    towerMats.forEach(m => { m.emissiveIntensity = 1.1 * k; }); stepMat.emissiveIntensity = lerp(0.25, 1.4, k); globeMat.emissiveIntensity = lerp(0.5, 2.6, k); spillMats.forEach(m => { m.opacity = 0.42 * k; m.visible = k > 0.01; });
    refreshEmissive();
  }
  function setSky(name, instant) {
    skyTarget = name === "dusk" ? 1 : 0;
    if (instant || reduce || !skyInit) { skyK = skyTarget; skyInit = true; applySky(); }
    kick();
  }

  /* ---------- loop ---------- */
  let running = false, visible = true, lastT = performance.now(), paintAnim = null, wantFrame = true, nCars = 0;
  /* low graphics: no crowd, steam, art panels or pigeons, 1x pixels, 30 frames a second */
  function applyLow() {
    crowd.forEach(m => { m.visible = !low; }); steam.forEach(sp => { sp.visible = !low; }); arts.forEach(a => { a.o.visible = !low; });
    birds.forEach(b => { b.visible = skyK < 0.5 && !low; });
    renderer.setPixelRatio(dprFor()); resize(); shadowDirty = true;
  }
  /* frame-time check: after the first 2 seconds, if 3 straight seconds average slower than ~36 fps, drop to low and remember it */
  const perf = { t0: performance.now(), sum: 0, n: 0, fps: 0, fpsN: 0, fpsT: 0 };
  function sampleFrame(now, raw) {
    perf.fpsN++; if (now - perf.fpsT > 500) { perf.fps = Math.round(perf.fpsN * 1000 / (now - perf.fpsT)); perf.fpsN = 0; perf.fpsT = now; if (meter) meter.textContent = `${perf.fps} fps · ${renderer.info.render.calls} draws · ${low ? "low" : "high"} · ${renderer.getPixelRatio()}x`; }
    if (gfxForced || low || now - perf.t0 < 2000 || raw > 250) return;
    perf.sum += raw; perf.n++;
    if (perf.sum < 3000) return;
    if (perf.sum / perf.n > 28) { low = true; applyLow(); try { localStorage.setItem(GFXKEY, JSON.stringify({ level: "low", at: Date.now() })); } catch (e) {} }
    perf.sum = 0; perf.n = 0;
  }
  const meter = QS.get("fps") ? Object.assign(document.createElement("div"), { style: "position:absolute;left:8px;bottom:6px;z-index:5;font:600 11px system-ui;color:#fff;background:rgba(0,0,0,.55);padding:3px 6px;border-radius:6px;pointer-events:none" }) : null;
  let shadowDirty = true, shadowKey = "", lastDraw = 0;
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }) : null;
  const ro = "ResizeObserver" in window ? new ResizeObserver(() => resize()) : null;
  function kick() { wantFrame = true; if (!running) { running = true; requestAnimationFrame(frame); } }
  function resize() {
    if (!stage) return; const w = stage.clientWidth || 360, h = stage.clientHeight || 360;
    renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); kick();
  }
  function frame(now) {
    if (!stage || document.hidden || !visible) { running = false; return; }
    if (low && wantFrame === false && now - lastDraw < 30) { requestAnimationFrame(frame); return; }
    const raw = now - lastT; lastDraw = now; sampleFrame(now, raw);
    const dt = Math.min(0.05, raw / 1000); lastT = now;
    let busy = !reduce;
    if (rig.anim) { const k = Math.min(1, (now - rig.anim.t0) / rig.anim.dur), e = 1 - Math.pow(1 - k, 3); for (const key in rig.anim.to) rig[key] = rig.anim.from[key] + (rig.anim.to[key] - rig.anim.from[key]) * e; if (k >= 1) rig.anim = null; busy = true; }
    if (paintAnim) {
      const k = Math.min(1, (now - paintAnim.t0) / paintAnim.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      for (const d in B) { const b = B[d]; b.m = b.from + (b.target - b.from) * e; applyCut(b); if (Math.abs(b.target - b.from) > 0.001) rebuildScaffold(b); }
      if (k >= 1) paintAnim = null; busy = true; shadowDirty = true;
    }
    if (skyK !== skyTarget) { const st = dt / 0.9; skyK = skyTarget > skyK ? Math.min(skyTarget, skyK + st) : Math.max(skyTarget, skyK - st); applySky(); busy = true; }
    const fw = bursts.length || pending.length; if (labels) labels.style.opacity = fw ? 0.08 : "";
    if (fw) { stepBursts(now); busy = true; }
    if (!reduce) {
      for (const d in B) { const j = B[d].craneG.userData.jib; if (B[d].craneG.visible) j.rotation.y += dt * 0.18 * (d.charCodeAt(3) % 2 ? 1 : -1); }
      cars.forEach((c, i) => { if (!c.visible) return; const u = c.userData; u.t = (u.t + dt * u.speed) % 1; along(c, u.lane.ax, u.lane.c, u.t, u.lane.dir, 0.06); });
      walkers.forEach(wk => { const u = wk.userData; u.t = (u.t + dt * u.speed) % 1; along(wk, u.ax, u.c, u.t, u.dir, 0.17); wk.rotation.y = u.ax === "z" ? (u.dir > 0 ? 0 : Math.PI) : (u.dir > 0 ? Math.PI / 2 : -Math.PI / 2); wk.position.y = 0.17 + Math.abs(Math.sin(now / 160 + u.t * 40)) * 0.06; });
      flag.rotation.y = Math.sin(now / 600) * 0.25;
      for (const sc of screens) if (now > sc.next) { if (sc.next) { sc.i++; drawScreen(sc); } sc.next = now + sc.period + Math.random() * 800; }
      for (const t of tickers) { t.s = (t.s + dt * 110) % t.tw; t.tex.offset.x = t.s / TICK_W; }
      for (const a of arts) { a.tex.offset.x = (a.tex.offset.x + dt * a.vx) % 1; a.tex.offset.y = (a.tex.offset.y + dt * a.vy) % 1; }
      { const ph = Math.floor(now / 130); for (let i = 0; i < bulbPts.length; i++) bulbs.setColorAt(i, (i + ph) % 3 === 0 ? BULB_ON : BULB_DIM); bulbs.instanceColor.needsUpdate = true; }
      for (const sp of steam) { const u = sp.userData, t = (now / 2600 + u.ph) % 1; sp.position.set(u.x + Math.sin(t * 3 + u.ph * 9) * 0.35, 1.7 + t * 4.2, u.z); const sc = 0.9 + t * 2.8; sp.scale.set(sc, sc, 1); sp.material.opacity = 0.5 * (1 - t) * Math.min(1, t * 5); }
      for (const d in B) { const f = B[d].flagG; if (f.visible) f.userData.pen.rotation.y = Math.sin(now / 380 + f.userData.ph) * 0.35; }
      { const u = bus.userData, p = (1 - u.t) * 2 * S - S, dist = Math.abs(p - STOPZ);
        if (u.dwell > 0) u.dwell -= dt;
        else { const f = !u.stopped && p > STOPZ && dist < 4 ? Math.max(0.25, dist / 4) : 1; u.t = (u.t + dt * u.speed * f) % 1; }
        if (!u.stopped && dist < 0.2) { u.stopped = true; u.dwell = 2.4; } if (dist > 6) u.stopped = false;
        along(bus, u.lane.ax, u.lane.c, u.t, u.lane.dir, 0.06); }
      ducks.forEach((dk, i) => { const u = dk.userData; u.a += dt * u.s; dk.position.set(-17.6 + Math.cos(u.a) * u.r, 0.06 + Math.abs(Math.sin(now / 140 + i)) * 0.05, 9.5 + Math.sin(u.a) * u.r); dk.rotation.y = -u.a - Math.PI / 2; });
      birds.forEach(bd => { if (!bd.visible) return; const u = bd.userData; u.a += dt * 0.32; bd.position.set(-16 + Math.cos(u.a) * u.r, u.h + Math.sin(u.a * 2) * 0.6, 24 + Math.sin(u.a) * u.r); bd.rotation.y = -u.a - Math.PI / 2; const fl = Math.sin(now / 90 + u.ph) * 0.7; u.wl.rotation.x = fl; u.wr.rotation.x = -fl; });
    }
    placeCamera();
    { const key = sun.position.x.toFixed(2) + "," + sun.position.z.toFixed(2); if (shadowDirty || key !== shadowKey) { renderer.shadowMap.needsUpdate = true; shadowKey = key; shadowDirty = false; } }
    renderer.render(scene, camera); placeLabels();
    wantFrame = false;
    if (busy) requestAnimationFrame(frame); else running = false;
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });

  /* ---------- public API ---------- */
  window.Town = {
    ready: true,
    mount(el) {
      stage = el; labels = el.querySelector(".labels");
      el.insertBefore(canvas, labels); if (meter) el.appendChild(meter);
      if (io) { io.disconnect(); io.observe(el); } if (ro) { ro.disconnect(); ro.observe(el); }
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
        b.from = reduce ? t : from; b.target = t; b.m = b.from; applyCut(b); rebuildScaffold(b);
        if (d.startsWith("P" + currentPart)) { const gp = (1 - t) * ({ "P1-1": 14, "P1-2": 17, "P1-3": 17, "P1-4": 15, "P1-5": 11, "P1-6": 11, "P2-1": 30, "P2-2": 37, "P2-3": 18, "P3-1": 26, "P3-2": 25, "P3-3": 20, "P3-4": 14 })[d]; if (gp > maxGap && t < 0.999) { maxGap = gp; focusD = d; } }
      }
      paintAnim = reduce ? null : { t0: performance.now() + 350, dur: 1300 }; shadowDirty = true;
      if (data.view) viewTS = data.view === "ts";
      if (data.sky) setSky(data.sky, !skyInit);
      if (data.hud) { HUD = Object.assign({}, HUD, data.hud); screens.forEach(drawScreen); tickers.forEach(drawTicker); }
      if (!reduce) { let k = 0; for (const d in B) if (B[d].from < 0.999 && B[d].target >= 0.999) pending.push({ d, k: k++, at: paintAnim.t0 + paintAnim.dur + 150 }); }
      { const u = bus.userData; along(bus, u.lane.ax, u.lane.c, u.t, u.lane.dir, 0.06); }
      ducks.forEach(dk => { const u = dk.userData; dk.position.set(-17.6 + Math.cos(u.a) * u.r, 0.06, 9.5 + Math.sin(u.a) * u.r); dk.rotation.y = -u.a - Math.PI / 2; });
      birds.forEach(bd => { const u = bd.userData; bd.position.set(-16 + Math.cos(u.a) * u.r, u.h, 24 + Math.sin(u.a) * u.r); bd.rotation.y = -u.a - Math.PI / 2; });
      const due = Object.entries(data.due || {}).filter(([k]) => k.startsWith("P" + currentPart)).reduce((a, [, v]) => a + v, 0);
      nCars = Math.min(cars.length, due); cars.forEach((c, i) => { c.visible = i < nCars; });
      if (!reduce) cars.forEach(c => { const u = c.userData; along(c, u.lane.ax, u.lane.c, u.t, u.lane.dir, 0.06); });
      else cars.forEach(c => { const u = c.userData; along(c, u.lane.ax, u.lane.c, u.t, u.lane.dir, 0.06); });
      walkers.forEach(wk => { const u = wk.userData; along(wk, u.ax, u.c, u.t, u.dir, 0.17); });
      focusPart(viewTS ? "ts" : currentPart, !partChanged && !rig.anim ? true : false);
      buildLabels(); kick();
    },
    highlight(d) {
      highlightD = d;
      for (const k in B) B[k].hl = k === d;
      refreshEmissive(); updateLabelText(); kick();
    },
    setSky(name) { setSky(name, false); },
    setView(v) { viewTS = v === "ts"; for (const d in B) applyCut(B[d]); shadowDirty = true; focusPart(viewTS ? "ts" : currentPart, false); kick(); },
    celebrate(d) { if (B[d] && !reduce) { pending.push({ d, k: 0, at: performance.now() }); kick(); } }
  };
  window.__townDebug = () => ({ b: bursts.length, calls: renderer.info.render.calls, low, dpr: renderer.getPixelRatio(), fps: perf.fps });
  focusPart("1", true);
  if (low) applyLow();
  if (window.__townData) window.Town.update(window.__townData);
  window.__townReady && window.__townReady();
})();
