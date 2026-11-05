(async () => {
  /* A classic script, so it runs before the bank streams in and the ride can start as soon as three.js arrives (import()
     resolves through the page's import map). The launch ride (see src/intro.js for the overlay and the load tracker). Everything moves on a story clock s, in seconds:
     0-2 wide shot of the El over the skyline, 2-10 the train passes three stations (it waits at one whose lights are off),
     10-13 the camera swings beside the lead car as it accelerates and dives toward the tower, 13+ hero shot of the portal. */
  const I = window.Intro, Boot = window.Boot;
  if (!I || !I.on) return;
  let THREE, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass;
  try {
    await Boot.threeWarm;
    THREE = await import("three"); Boot.done("three");
    if (!document.createElement("canvas").getContext("webgl2")) throw new Error("no webgl2");
    [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }] = await Promise.all([
      import("three/addons/postprocessing/EffectComposer.js"), import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"), import("three/addons/postprocessing/OutputPass.js"), import("three/addons/postprocessing/ShaderPass.js")]);
    Boot.done("post");
  } catch (e) { for (const k of ["three", "post", "paint", "env"]) Boot.done(k); I.no3d(); return; }
  if (!I.el.isConnected || !window.IntroArt) { Boot.done("paint"); Boot.done("env"); return; }

  const reduce = I.reduce;
  let title = I.mode === "title" || reduce;
  const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
  const col = h => new THREE.Color(h);
  /* palette: Night, Dusk Top and Dusk Mid from DESIGN.md, plus Violet Haze, Cyan Window and Lit Window gold */
  const C = { night: col(0x0b0a24), top: col(0x1a1840), mid: col(0x33285c), haze: col(0x6b4fa8), fog: col(0x2a2158), cyan: col(0x7fe3ff), gold: col(0xffd27a), amber: col(0xf5b84a) };
  const hdr = (c, k) => c.clone().multiplyScalar(k);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(C.fog, 0.0034);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 6000);

  /* ---------- sky, stars, moon ---------- */
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uNight: { value: C.night }, uTop: { value: C.top }, uMid: { value: C.mid }, uHaze: { value: C.haze }, uFog: { value: C.fog } },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uNight, uTop, uMid, uHaze, uFog; varying vec3 vD;
      void main(){ float h = vD.y; vec3 c = mix(uFog, uHaze, smoothstep(-0.01, 0.05, h)); c = mix(c, uMid, smoothstep(0.04, 0.16, h));
        c = mix(c, uTop, smoothstep(0.14, 0.34, h)); c = mix(c, uNight, smoothstep(0.32, 0.75, h)); gl_FragColor = vec4(c, 1.0); }` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4500, 32, 16), skyMat); sky.renderOrder = -2; scene.add(sky);
  const rnd = (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(20261105);
  {
    const n = 1400, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const y = 0.12 + rnd() * 0.88, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      p.set([Math.cos(a) * r * 4200, y * 4200, Math.sin(a) * r * 4200], i * 3);
      const b = 0.35 + rnd() * 0.65; c.set([b, b, b * 1.1], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false })));
  }
  const moonTex = (() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256; const x = cv.getContext("2d");
    const g = x.createRadialGradient(110, 110, 10, 128, 128, 128); g.addColorStop(0, "#f4f6ff"); g.addColorStop(0.85, "#c9d0ec"); g.addColorStop(1, "#9aa3cc");
    x.fillStyle = g; x.beginPath(); x.arc(128, 128, 127, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(120,128,170,${0.08 + rnd() * 0.16})`; x.beginPath(); x.arc(40 + rnd() * 176, 40 + rnd() * 176, 4 + rnd() * 22, 0, Math.PI * 2); x.fill(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const moon = new THREE.Mesh(new THREE.CircleGeometry(150, 48), new THREE.MeshBasicMaterial({ map: moonTex, color: hdr(col(0xffffff), 1.25), fog: false, depthWrite: false }));
  moon.renderOrder = -1; scene.add(moon);
  const glowMat = (c, k) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uC: { value: c }, uK: { value: k } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 uC; uniform float uK; varying vec2 vU; void main(){ float r = length(vU - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - r), 2.2); gl_FragColor = vec4(uC * a * uK, 1.0); }" });
  const moonHalo = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), glowMat(col(0x8f8de0), 0.5)); moonHalo.renderOrder = -1; scene.add(moonHalo);

  /* ---------- the track: an El line across town that curves down into the portal under the tower ---------- */
  const curve = new THREE.CatmullRomCurve3([[-330, 13, 70], [-230, 13, 22], [-120, 13, -6], [-10, 13, -14], [90, 13, -4], [165, 12, 26], [212, 9, 74], [236, 5, 128], [244, 2.4, 172], [247, 2.2, 215], [249, 2.2, 260]].map(a => new V3(...a)), false, "catmullrom", 0.5);
  const L = curve.getLength(), SAMPLES = 600;
  const pts = curve.getSpacedPoints(SAMPLES);
  const frame = (d, out = {}) => {
    const u = Math.min(1, Math.max(0, d / L));
    out.P = curve.getPointAt(u, out.P || new V3()); out.T = curve.getTangentAt(u, out.T || new V3());
    out.S = (out.S || new V3()).crossVectors(out.T, UP).normalize(); out.U = (out.U || new V3()).crossVectors(out.S, out.T).normalize();
    return out;
  };
  const dPortal = L - 88;   /* the portal face; the last 88 m run on inside the tunnel */
  /* story distances: the lead car's distance along the track at story time s */
  const D0 = 64, sStations = [3.6, 6.0, 8.4], D10 = dPortal - 205, v0 = (D10 - D0) / 10;
  const acc = 2 * (dPortal - D10 - v0 * 3.3) / (3.3 * 3.3);
  const dAt = s => s <= 10 ? D0 + v0 * s : D10 + v0 * (s - 10) + 0.5 * acc * (s - 10) * (s - 10);
  const speedAt = s => s <= 10 ? v0 : v0 + acc * (s - 10);
  const stopD = sStations.map(dAt);
  const sPortal = 10 + (-v0 + Math.sqrt(v0 * v0 + 2 * acc * (dPortal - D10))) / acc;

  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), sc = new V3(), tmp = new V3(), tmp2 = new V3(), basis = new THREE.Matrix4();
  const coarse = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
  const fr = {};
  const place = (mesh, i, d, side, up, len, h, w, along = 0) => {
    frame(d, fr); basis.makeBasis(fr.T, fr.U, fr.S); q4.setFromRotationMatrix(basis);
    tmp.copy(fr.P).addScaledVector(fr.S, side).addScaledVector(fr.U, up).addScaledVector(fr.T, along);
    mesh.setMatrixAt(i, m4.compose(tmp, q4, sc.set(len, h, w)));
  };
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2d48, metalness: 0.6, roughness: 0.55 });
  const railM = new THREE.MeshStandardMaterial({ color: 0x9aa0bb, metalness: 0.9, roughness: 0.25 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  {
    const seg = 2, n = Math.ceil(L / seg);
    const deck = new THREE.InstancedMesh(box, steel, n), gird = new THREE.InstancedMesh(box, steel, n * 2), rails = new THREE.InstancedMesh(box, railM, n * 2);
    const third = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: hdr(C.gold, 0.1) }), n);
    for (let i = 0; i < n; i++) {
      const d = i * seg + seg / 2;
      place(deck, i, d, 0, -0.45, seg + 0.05, 0.5, 4.2);
      place(gird, i * 2, d, 2.15, -1.0, seg + 0.05, 1.9, 0.35); place(gird, i * 2 + 1, d, -2.15, -1.0, seg + 0.05, 1.9, 0.35);
      place(rails, i * 2, d, 0.75, 0.08, seg + 0.05, 0.16, 0.12); place(rails, i * 2 + 1, d, -0.75, 0.08, seg + 0.05, 0.16, 0.12);
      place(third, i, d, 1.5, 0.1, seg + 0.05, 0.12, 0.2);
    }
    scene.add(deck, gird, rails, third);
    /* steel bents every 14 m, down to the street */
    const cols = [], beams = [];
    for (let d = 7; d < dPortal - 30; d += 14) { frame(d, fr); if (fr.P.y > 4) { cols.push(d); beams.push(d); } }
    const cm = new THREE.InstancedMesh(box, steel, cols.length * 2), bm = new THREE.InstancedMesh(box, steel, beams.length);
    cols.forEach((d, i) => {
      frame(d, fr); const h = fr.P.y - 2.2;
      for (const k of [0, 1]) { tmp.copy(fr.P).addScaledVector(fr.S, k ? 2.6 : -2.6); tmp.y = h / 2; cm.setMatrixAt(i * 2 + k, m4.compose(tmp, q4.identity(), sc.set(0.9, h, 0.9))); }
      place(bm, i, d, 0, -2.4, 0.9, 0.9, 6.6);
    });
    scene.add(cm, bm);
  }

  /* ---------- buildings: one instanced box per tower, windows drawn per pixel (cyan, some gold), fogged ---------- */
  const facade = (extra = 0) => new THREE.ShaderMaterial({ fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uWall: { value: col(0x161437) }, uRoof: { value: col(0x0e0c26) }, uCyan: { value: hdr(C.cyan, 1.0) }, uGold: { value: hdr(C.gold, 1.1) }, uHaze: { value: C.haze }, uBoost: { value: extra } }]),
    vertexShader: `attribute vec3 aSeed; varying vec3 vP; varying vec3 vN; varying vec3 vS;
      #include <fog_pars_vertex>
      void main(){ mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
        m = m * instanceMatrix;
        #endif
        vec4 wp = m * vec4(position, 1.0); vP = wp.xyz; vN = normalize(mat3(m) * normal); vS = aSeed;
        vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uWall, uRoof, uCyan, uGold, uHaze; uniform float uBoost; varying vec3 vP; varying vec3 vN; varying vec3 vS;
      #include <fog_pars_fragment>
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main(){
        vec3 N = normalize(vN); vec3 c;
        if (N.y > 0.5) c = uRoof;
        else {
          float u = abs(N.x) > 0.5 ? vP.z : vP.x; vec2 cell = vec2(u / 3.2, vP.y / 3.7); vec2 id = floor(cell), f = fract(cell);
          float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.24, f.y) * step(f.y, 0.76);
          float lit = step(h21(id + vS.x * 17.0 + N.x * 3.1 + N.z * 7.7), vS.y + uBoost) * step(4.0, vP.y);
          vec3 wc = mix(uCyan, uGold, step(h21(id.yx + vS.x * 3.0), vS.z)) * (0.45 + 0.8 * h21(id * 1.7 + vS.x)) * (1.0 + uBoost * 1.5);
          vec3 wall = uWall * (0.75 + 0.25 * step(0.5, f.y)) + uHaze * 0.12 * exp(-vP.y / 25.0);
          vec3 near = mix(wall, wc, win * lit);
          float aa = fwidth(cell.x) + fwidth(cell.y);
          vec3 far = wall + wc * (vS.y + uBoost) * 0.36;
          c = mix(near, far, smoothstep(0.35, 0.9, aa));
        }
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
      }` });
  const portalF = frame(dPortal, {}), P0 = portalF.P.clone(), T0 = portalF.T.clone(), S0 = portalF.S.clone();
  const towerAt = P0.clone().addScaledVector(T0, 78); towerAt.y = 0;
  const near = (x, z) => { let best = 1e9, bi = 0; for (let i = 0; i <= SAMPLES; i += 2) { const p = pts[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) { best = d; bi = i; } } return [Math.sqrt(best), bi]; };
  {
    const list = [];
    for (let gx = -640; gx <= 560; gx += 20) for (let gz = -560; gz <= 520; gz += 20) {
      const x = gx + (rnd() - 0.5) * 4, z = gz + (rnd() - 0.5) * 4, w = 9 + rnd() * 8, dd = 9 + rnd() * 8;
      const [dist, bi] = near(x, z); if (dist < 13) continue;
      const tw = Math.hypot(x - towerAt.x, z - towerAt.z); if (tw < 56) continue;
      const fi = frame(bi / SAMPLES * L, {}), side = (x - fi.P.x) * fi.S.x + (z - fi.P.z) * fi.S.z;
      /* the camera rides on the +side: keep that side low so the train stays in view */
      if (side > 0 && side < 58 && bi / SAMPLES * L < dPortal + 10) continue;
      if (side > 58 && side < 165 && bi / SAMPLES * L < D0 + 110) continue; /* the opening shot's camera rides over this block */
      if (Math.hypot(x - P0.x, z - P0.z) < 40) continue;
      let h = side > 0 && dist < 170 ? 6 + rnd() * 12 : 16 + rnd() * rnd() * 70;
      h += 90 * Math.exp(-tw / 140) * rnd();
      const low = side > 0 && dist < 170;
      list.push([x, z, w, dd, h, rnd(), low ? 0.05 + rnd() * 0.1 : 0.1 + rnd() * 0.22, rnd() < 0.5 ? 0.12 : 0.26]);
    }
    const bm = new THREE.InstancedMesh(box, facade(), list.length), seed = new Float32Array(list.length * 3);
    list.forEach(([x, z, w, d, h, s1, s2, s3], i) => { bm.setMatrixAt(i, m4.compose(tmp.set(x, h / 2, z), q4.identity(), sc.set(w, h, d))); seed.set([s1, s2, s3], i * 3); });
    bm.geometry = box.clone(); bm.geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 3));
    scene.add(bm);
    /* wooden water tanks on some of the mid-rise roofs, the New York skyline's tell */
    const tops = list.filter(([, , w, d, h]) => h > 14 && h < 70 && w > 10 && d > 10).filter(() => rnd() < 0.16);
    const woodM = new THREE.MeshStandardMaterial({ color: 0x2c2434, roughness: 0.85 });
    const tank = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.6, 1.6, 3.2, 12), woodM, tops.length), lid = new THREE.InstancedMesh(new THREE.ConeGeometry(1.8, 1.4, 12), woodM, tops.length);
    const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 2.2, 0.18), steel, tops.length * 4);
    tops.forEach(([x, z, w, d, h], i) => {
      const ox = x + (rnd() - 0.5) * w * 0.4, oz = z + (rnd() - 0.5) * d * 0.4;
      tank.setMatrixAt(i, m4.compose(tmp.set(ox, h + 3.8, oz), q4.identity(), sc.set(1, 1, 1))); lid.setMatrixAt(i, m4.compose(tmp.set(ox, h + 6.1, oz), q4.identity(), sc.set(1, 1, 1)));
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b], j) => legs.setMatrixAt(i * 4 + j, m4.compose(tmp.set(ox + a * 1.1, h + 1.1, oz + b * 1.1), q4.identity(), sc.set(1, 1, 1))));
    });
    scene.add(tank, lid, legs);
  }
  /* street lights: gold points on the avenue grid */
  {
    const p = [], c = [];
    for (let gx = -650; gx <= 570; gx += 20) for (let gz = -570; gz <= 530; gz += 5) { if (rnd() < 0.55) continue; p.push(gx, 0.4, gz); const b = 0.6 + rnd() * 0.8, k = rnd() < 0.8; c.push(k ? C.gold.r * b : C.cyan.r * b, k ? C.gold.g * b : C.cyan.g * b, k ? C.gold.b * b : C.cyan.b * b); }
    for (let gz = -570; gz <= 530; gz += 20) for (let gx = -650; gx <= 570; gx += 5) { if (rnd() < 0.55) continue; p.push(gx, 0.4, gz); const b = 0.6 + rnd() * 0.8; c.push(C.gold.r * b, C.gold.g * b, C.gold.b * b); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: true, depthWrite: false, transparent: true, opacity: 0.9 })));
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ color: 0x0b0a20 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  /* ---------- the tax town tower and the tunnel portal under it ---------- */
  const glow = { v: title ? 1 : 0.35, burst: 0, flare: 0 };
  {
    const tiers = [[46, 70, 46], [34, 58, 34], [24, 44, 24]], seed = new Float32Array(9), tm = new THREE.InstancedMesh(box, facade(0), 3); let y = 0;
    tm.material.uniforms.uBoost.value = 0.25; tm.userData.f = tm.material;
    tiers.forEach(([w, h, d], i) => { tm.setMatrixAt(i, m4.compose(tmp.set(towerAt.x, y + h / 2, towerAt.z), q4.identity(), sc.set(w, h, d))); seed.set([0.3 + i * 0.2, 0.55, 0.7], i * 3); y += h; });
    tm.geometry = box.clone(); tm.geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 3)); scene.add(tm);
    glow.tower = tm.material;
    const crownM = new THREE.LineBasicMaterial({ color: hdr(C.gold, 2.2), fog: false });
    y = 0; for (const [w, h, d] of tiers) { y += h; const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.4, 1.2, d + 0.4)), crownM); e.position.set(towerAt.x, y - 0.6, towerAt.z); scene.add(e); }
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.6, 34, 8), steel); spire.position.set(towerAt.x, y + 17, towerAt.z); scene.add(spire);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: hdr(col(0xff6a5a), 4), fog: false })); tip.position.set(towerAt.x, y + 34.5, towerAt.z); scene.add(tip);
    const beacon = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), glowMat(hdr(C.gold, 1), 0.7)); beacon.position.set(towerAt.x, y + 4, towerAt.z); glow.beacon = beacon; scene.add(beacon);
  }
  {
    /* the portal: a stone face with an arched opening, gold trim, and the light inside */
    const sh = new THREE.Shape(); sh.moveTo(-16, -1); sh.lineTo(16, -1); sh.lineTo(16, 13); sh.lineTo(-16, 13); sh.lineTo(-16, -1);
    const hole = new THREE.Path(); hole.moveTo(-4.4, -1); hole.lineTo(4.4, -1); hole.lineTo(4.4, 5.6); hole.absarc(0, 5.6, 4.4, 0, Math.PI, false); hole.lineTo(-4.4, -1); sh.holes.push(hole);
    const face = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 5, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0x1b1934, roughness: 0.9, metalness: 0.1 }));
    const corn = new THREE.Mesh(new THREE.BoxGeometry(32.6, 0.35, 0.3), new THREE.MeshBasicMaterial({ color: hdr(C.gold, 2.4) })); corn.position.set(0, 12.2, -0.2);
    const trimPts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; trimPts.push(new V3(Math.cos(a) * 4.8, 5.6 + Math.sin(a) * 4.8, -0.15)); }
    const trim = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(4.8, -1, -0.15), ...trimPts, new V3(-4.8, -1, -0.15)]), new THREE.LineBasicMaterial({ color: hdr(C.gold, 3), fog: false }));
    const lightM = new THREE.ShaderMaterial({ fog: false,
      uniforms: { uG: { value: 0.35 }, uT: { value: 0 }, uGold: { value: C.gold }, uCyan: { value: C.cyan } },
      vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uG, uT; uniform vec3 uGold, uCyan; varying vec2 vU;
        void main(){ vec2 p = vU - vec2(0.5, 0.42); float r = length(p * vec2(1.0, 0.9));
          vec3 c = mix(uCyan * 0.55, uGold, smoothstep(0.6, 0.18, r)); c = mix(c, vec3(1.0, 0.97, 0.9), smoothstep(0.22, 0.0, r)); c *= 0.55 + 0.45 * smoothstep(0.75, 0.0, r);
          gl_FragColor = vec4(c * (0.35 + 1.25 * uG), 1.0); }` });
    const light = new THREE.Mesh(new THREE.PlaneGeometry(9, 11), lightM); light.position.set(0, 4.5, 2.5);
    const g = new THREE.Group(); g.add(face, trim, light, corn);
    /* local: x across the track, y up, -z toward the oncoming train */
    basis.makeBasis(new V3().crossVectors(T0.clone().setY(0).normalize(), UP).normalize(), UP, T0.clone().setY(0).normalize().negate()); g.quaternion.setFromRotationMatrix(basis);
    g.position.copy(P0).setY(P0.y - 1.2); scene.add(g);
    /* side walls of the cutting the train dives through */
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), glowMat(hdr(C.gold, 1), 1)); halo.position.copy(P0).addScaledVector(T0, -3).setY(P0.y + 5); scene.add(halo);
    const halo2 = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), glowMat(hdr(C.cyan, 1), 0.35)); halo2.position.copy(halo.position).addScaledVector(T0, 2); scene.add(halo2);
    glow.light = lightM; glow.halo = halo; glow.halo2 = halo2;
    glow.pl = new THREE.PointLight(C.gold, 0, 120, 2); glow.pl.position.copy(P0).addScaledVector(T0, -4).setY(P0.y + 5); scene.add(glow.pl);
    /* sodium lamps down the ramp */
    const lamps = []; for (let d = dPortal - 118; d < dPortal - 52; d += 12) lamps.push(d);
    const lm = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: hdr(C.gold, 3.2) }), lamps.length * 2);
    lamps.forEach((d, i) => { place(lm, i * 2, d, 3.6, 4.2, 0.5, 0.25, 0.5); place(lm, i * 2 + 1, d, -3.6, 4.2, 0.5, 0.25, 0.5); });
    const posts = new THREE.InstancedMesh(box, steel, lamps.length * 2);
    lamps.forEach((d, i) => { place(posts, i * 2, d, 3.6, 2.1, 0.18, 4.2, 0.18); place(posts, i * 2 + 1, d, -3.6, 2.1, 0.18, 4.2, 0.18); });
    scene.add(lm, posts);
  }

  /* searchlights sweeping from the tower's crown, a shockwave ring off the portal when the train goes in, drifting motes */
  const beamM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide, uniforms: { uK: { value: 0 }, uC: { value: hdr(C.gold, 1) } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform float uK; uniform vec3 uC; varying vec2 vU; void main(){ gl_FragColor = vec4(uC * pow(vU.y, 3.0) * 0.12 * uK, 1.0); }" });
  const crownY = 172, beams = [0, 1].map(i => { const b = new THREE.Mesh(new THREE.ConeGeometry(18, 420, 16, 1, true), beamM); b.geometry.translate(0, -210, 0); const piv = new THREE.Group(); piv.position.set(towerAt.x, crownY, towerAt.z); piv.add(b); scene.add(piv); return piv; });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: hdr(C.gold, 3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  ring.position.copy(P0).addScaledVector(T0, -2).setY(P0.y + 4.5); ring.lookAt(ring.position.clone().sub(T0)); scene.add(ring);
  const NM = 260, motes = (() => { const p = new Float32Array(NM * 3); for (let i = 0; i < NM; i++) p.set([(rnd() - 0.5) * 60, rnd() * 30, (rnd() - 0.5) * 60], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, color: hdr(C.gold, 1.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.copy(P0).addScaledVector(T0, -24); scene.add(m); return m; })();

  /* ---------- stations: a platform, canopy, lamps and a sign on the far side of the track ---------- */
  const signTex = (name, sub) => {
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 192; const x = cv.getContext("2d");
    x.fillStyle = "#111"; x.fillRect(0, 0, 1024, 192); x.fillStyle = "#fff"; x.fillRect(0, 22, 1024, 6);
    x.font = '700 92px "Helvetica Neue", Inter, Arial, sans-serif'; x.textBaseline = "middle"; x.fillText(name, 40, 98);
    x.font = '700 34px "Helvetica Neue", Inter, Arial, sans-serif'; x.fillStyle = "rgba(255,255,255,0.75)"; x.fillText(sub, 44, 160);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const NAMES = ["Individuals", "Businesses", "Representation"], counts = (window.__introCounts || [0, 0, 0]);
  const stations = stopD.map((sd, k) => {
    const dc = sd - 20, g = { lamps: null, sign: null, pl: null, on: false, at: 0 };
    const deck = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: 0x3a3656, roughness: 0.8 }), 3);
    place(deck, 0, dc, -4.9, -0.2, 46, 0.5, 4.6); place(deck, 1, dc, -4.9, 5.45, 47, 0.3, 5.6); place(deck, 2, dc, -7.3, 1.2, 46, 2.4, 0.15);
    const posts = new THREE.InstancedMesh(box, steel, 6); for (let i = 0; i < 6; i++) place(posts, i, dc + (i - 2.5) * 8.6, -6.9, 2.7, 0.25, 5.4, 0.25);
    /* the lamp strip along the canopy's front edge, which the camera sees over the train's roof */
    const n = 12, lamps = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    for (let i = 0; i < n; i++) { place(lamps, i, dc + (i - (n - 1) / 2) * 3.85, -2.05, 5.22, 3.3, 0.34, 0.16); lamps.setColorAt(i, col(0x2a2840)); }
    const edge = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: col(0x2a2840) })); place({ setMatrixAt: (_, m) => edge.matrix.copy(m) }, 0, dc, -2.72, 0.07, 46, 0.06, 0.36); edge.matrixAutoUpdate = false;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.44), new THREE.MeshBasicMaterial({ map: signTex(NAMES[k], `Part ${k + 1}${counts[k] ? " · " + counts[k] + " questions" : ""}`), color: col(0x555555), side: THREE.DoubleSide }));
    frame(dc, fr); sign.position.copy(fr.P).addScaledVector(fr.S, -4.2).addScaledVector(UP, 6.85);
    basis.makeBasis(fr.T, UP, fr.S); sign.quaternion.setFromRotationMatrix(basis);
    const pl = new THREE.PointLight(C.gold, 0, 40, 2); pl.position.copy(fr.P).addScaledVector(fr.S, -3.4).addScaledVector(UP, 4.6);
    scene.add(deck, posts, lamps, edge, sign, pl);
    Object.assign(g, { lamps, sign, pl, edge, n, dc });
    return g;
  });
  const LAMP_OFF = col(0x2a2840), LAMP_ON = hdr(C.gold, 1.7);
  const lightStation = (k, now) => { const g = stations[k]; if (g.on) return; g.on = true; g.at = now; };
  function stationFrame(now) {
    for (const g of stations) {
      if (!g.on) continue;
      const age = (now - g.at) / 1000; if (age > 1.2 && g.settled) continue;
      for (let i = 0; i < g.n; i++) {
        const a = age - i * 0.035, fl = reduce ? 1 : a < 0 ? 0 : a < 0.3 ? (Math.sin(a * 90 + i * 7) > 0.2 ? 1 : 0.15) : 1;
        g.lamps.setColorAt(i, tmpC.copy(LAMP_OFF).lerp(LAMP_ON, fl));
      }
      g.lamps.instanceColor.needsUpdate = true;
      const k = Math.min(1, age / 0.5);
      g.edge.material.color.copy(LAMP_OFF).lerp(hdr(C.amber, 1.2), k);
      g.sign.material.color.setScalar(0.33 + 0.77 * k);
      g.pl.intensity = 280 * k;
      g.settled = age > 1.2;
    }
  }
  const tmpC = new THREE.Color();

  /* ---------- the train: four older-style stainless cars (rounded roof, fluted sides, door pairs) carrying graffiti ---------- */
  const CAR = 10.2, GAP = 0.7, NCAR = 4;
  const steelM = new THREE.MeshStandardMaterial({ color: 0xb8bcc8, metalness: 0.75, roughness: 0.45 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x14141e, roughness: 0.9 });
  const wheelM = new THREE.MeshStandardMaterial({ color: 0x2a2a33, metalness: 0.7, roughness: 0.4 });
  const trainMats = [steelM, wheelM];
  const cars = [], sideMats = [];
  let headCone = null, headSpot = null;
  const tex = (cv, srgb = true) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const roofGeo = new THREE.CylinderGeometry(1.4, 1.4, CAR, 24, 1, true, 0, Math.PI), capGeo = new THREE.CircleGeometry(1.4, 24, 0, Math.PI);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16);
  for (let k = 0; k < NCAR; k++) {
    const g = new THREE.Group();
    for (const sd of [1, -1]) {
      /* plain steel until the graffiti is painted (paintTrain, below) */
      const m = new THREE.MeshStandardMaterial({ color: 0xc8ccd6, metalness: 0.7, roughness: 0.35, emissive: new THREE.Color(2.2, 2.2, 2.2), emissiveMap: null });
      const side = new THREE.Mesh(new THREE.PlaneGeometry(CAR, 3.0), m); side.position.set(0, 2.2, sd * 1.4); if (sd < 0) side.rotation.y = Math.PI; g.add(side);
      sideMats.push({ m, car: k, flip: sd < 0 }); trainMats.push(m);
    }
    const roof = new THREE.Mesh(roofGeo, steelM); roof.rotation.z = Math.PI / 2; roof.scale.set(0.32, 1, 1); roof.position.y = 3.7; g.add(roof);
    for (const e of [1, -1]) { const cap = new THREE.Mesh(capGeo, steelM); cap.scale.set(1, 0.32, 1); cap.position.set(e * CAR / 2, 3.7, 0); cap.rotation.y = e * Math.PI / 2; g.add(cap); }
    for (const ax of [-3.2, 0, 3.2]) { const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 1.3), steelM); ac.position.set(ax, 4.1, 0); g.add(ac); }
    for (const e of [1, -1]) {
      const kind = k === 0 && e > 0 ? "front" : k === NCAR - 1 && e < 0 ? "rear" : "inner", d = IntroArt.end(kind);
      const em = new THREE.MeshStandardMaterial({ map: tex(d.map), emissiveMap: tex(d.em), emissive: new THREE.Color(kind === "inner" ? 0 : 3, kind === "inner" ? 0 : 3, kind === "inner" ? 0 : 3), metalness: 0.6, roughness: 0.35 });
      const endM = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.0), em); endM.position.set(e * (CAR / 2 + 0.01), 2.2, 0); endM.rotation.y = e * Math.PI / 2; g.add(endM); trainMats.push(em);
    }
    const under = new THREE.Mesh(new THREE.BoxGeometry(CAR - 1.2, 0.55, 2.3), darkM); under.position.y = 0.45; g.add(under);
    const wheels = new THREE.InstancedMesh(wheelGeo, wheelM, 8); let wi = 0;
    for (const bx of [-3.6, 3.6]) { const truck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 2.5), darkM); truck.position.set(bx, 0.3, 0); g.add(truck);
      for (const wx of [-0.8, 0.8]) for (const wz of [-1.05, 1.05]) wheels.setMatrixAt(wi++, m4.compose(tmp.set(bx + wx, 0.3, wz), q4.setFromAxisAngle(tmp2.set(1, 0, 0), Math.PI / 2), sc.set(1, 1, 1))); }
    g.add(wheels);
    if (k === 0) {
      const spot = new THREE.SpotLight(0xfff1d6, 900, 90, 0.42, 0.6, 1.6); headSpot = spot; spot.position.set(CAR / 2, 1.6, 0); spot.target.position.set(CAR / 2 + 20, -1, 0); g.add(spot, spot.target);
      const coneM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uC: { value: col(0xfff1d6) } },
        vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform vec3 uC; varying vec2 vU; void main(){ gl_FragColor = vec4(uC * pow(vU.y, 2.0) * 0.16, 1.0); }" });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 26, 20, 1, true), coneM); cone.rotation.z = Math.PI / 2; cone.position.set(CAR / 2 + 13, 1.4, 0); g.add(cone); headCone = cone;
    }
    scene.add(g); cars.push(g);
  }
  /* an anamorphic streak on the headlights, strongest when the train faces the camera */
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(22, 0.9), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uK: { value: 0 } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform float uK; varying vec2 vU; void main(){ float x = abs(vU.x - 0.5) * 2.0, y = abs(vU.y - 0.5) * 2.0; float a = pow(1.0 - x, 3.0) * pow(1.0 - y, 2.0); gl_FragColor = vec4(vec3(0.75, 0.9, 1.4) * a * uK, 1.0); }" }));
  streak.renderOrder = 5; scene.add(streak);
  /* paint the graffiti one car side per frame, so the ride never stalls; the first station waits for it */
  async function paintTrain() {
    let buddy = null;
    try { const im = new Image(); im.src = "art/buddy-bust.webp"; await im.decode(); buddy = im; } catch (e) {}
    const scale = coarse ? 0.5 : 0.75;
    for (let i = 0; i < sideMats.length; i++) {
      await new Promise(r => setTimeout(r, 16));
      if (dead) return;
      try { const { m, car, flip } = sideMats[i], a = IntroArt.side(car, flip, buddy, scale); m.map = tex(a.map); m.emissiveMap = tex(a.em); m.color.set(0xffffff); m.metalness = 0.45; m.roughness = 0.42; m.needsUpdate = true; } catch (e) {}
      Boot.set("paint", (i + 1) / sideMats.length);
    }
  }
  const fa = {}, fb = {};
  function placeTrain(dl) {
    for (let k = 0; k < NCAR; k++) {
      const dc = dl - CAR / 2 - k * (CAR + GAP), g = cars[k];
      g.visible = dc - CAR / 2 < dPortal + 2;
      if (!g.visible) continue;
      frame(dc + 3.8, fa); frame(dc - 3.8, fb);
      tmp.subVectors(fa.P, fb.P).normalize();
      const s = new V3().crossVectors(tmp, UP).normalize(), u = new V3().crossVectors(s, tmp);
      basis.makeBasis(tmp, u, s); g.quaternion.setFromRotationMatrix(basis);
      g.position.addVectors(fa.P, fb.P).multiplyScalar(0.5).addScaledVector(u, 0.2);
    }
  }

  /* ---------- sparks off the third rail and wheels, and the glowing trail behind the train ---------- */
  const NS = 700, sp = { p: new Float32Array(NS * 3), v: new Float32Array(NS * 3), life: new Float32Array(NS), max: new Float32Array(NS), next: 0 };
  const spPos = new Float32Array(NS * 6), spCol = new Float32Array(NS * 6);
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3)); spGeo.setAttribute("color", new THREE.BufferAttribute(spCol, 3));
  const sparks = new THREE.LineSegments(spGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sparks.frustumCulled = false; scene.add(sparks);
  function emit(at, fwd, side, speed, n) {
    for (let j = 0; j < n; j++) {
      const i = sp.next; sp.next = (sp.next + 1) % NS;
      sp.p.set([at.x, at.y, at.z], i * 3);
      const f = speed * (0.25 + Math.random() * 0.5), sd = (Math.random() * 1.4 - 0.3) * (2 + speed * 0.08), up = 1 + Math.random() * 5;
      sp.v.set([fwd.x * f + side.x * sd, up, fwd.z * f + side.z * sd], i * 3);
      sp.life[i] = sp.max[i] = 0.22 + Math.random() * 0.5;
    }
  }
  function sparkFrame(dt, speed) {
    const drag = Math.exp(-2.4 * dt), k = 0.03 + speed * 0.0006;
    for (let i = 0; i < NS; i++) {
      const o = i * 3, o6 = i * 6;
      if (sp.life[i] <= 0) { spCol.fill(0, o6, o6 + 6); continue; }
      sp.life[i] -= dt;
      sp.v[o] *= drag; sp.v[o + 2] *= drag; sp.v[o + 1] -= 18 * dt;
      sp.p[o] += sp.v[o] * dt; sp.p[o + 1] += sp.v[o + 1] * dt; sp.p[o + 2] += sp.v[o + 2] * dt;
      const a = Math.max(0, sp.life[i] / sp.max[i]);
      spPos[o6] = sp.p[o]; spPos[o6 + 1] = sp.p[o + 1]; spPos[o6 + 2] = sp.p[o + 2];
      spPos[o6 + 3] = sp.p[o] - sp.v[o] * k; spPos[o6 + 4] = sp.p[o + 1] - sp.v[o + 1] * k; spPos[o6 + 5] = sp.p[o + 2] - sp.v[o + 2] * k;
      spCol[o6] = 3.2 * a; spCol[o6 + 1] = 2.2 * a; spCol[o6 + 2] = 0.8 * a;
      spCol[o6 + 3] = 1.4 * a * a; spCol[o6 + 4] = 0.35 * a * a; spCol[o6 + 5] = 0.7 * a * a;
    }
    spGeo.attributes.position.needsUpdate = spGeo.attributes.color.needsUpdate = true;
  }
  const TR = 48, trGeo = new THREE.BufferGeometry(), trPos = new Float32Array((TR + 1) * 2 * 3), trCol = new Float32Array((TR + 1) * 2 * 3), trIdx = [];
  for (let i = 0; i < TR; i++) { const a = i * 2; trIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  trGeo.setIndex(trIdx); trGeo.setAttribute("position", new THREE.BufferAttribute(trPos, 3)); trGeo.setAttribute("color", new THREE.BufferAttribute(trCol, 3));
  const trail = new THREE.Mesh(trGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  trail.frustumCulled = false; scene.add(trail);
  function trailFrame(tailD, t, speed) {
    const len = 30 + speed * 0.9, amp = Math.min(1.6, 0.4 + speed * 0.012);
    for (let i = 0; i <= TR; i++) {
      const f = i / TR, d = Math.min(tailD - f * len, dPortal + 1); frame(Math.max(0, d), fr);
      const wob = Math.sin(f * 22 - t * 9) * 0.35 * f + Math.sin(f * 7 + t * 4) * 0.25, h = (0.25 + f * amp);
      const base = tmp.copy(fr.P).addScaledVector(fr.S, 1.5 + wob * 0.6).addScaledVector(UP, 0.25);
      trPos.set([base.x, base.y, base.z, base.x, base.y + h, base.z], i * 6);
      const a = Math.pow(1 - f, 1.4) * (d >= dPortal ? 0 : 1), g = 1 - f;
      const r = (1.9 * g + 1.3 * (1 - g)) * a, gg = (1.3 * g + 0.35 * (1 - g)) * a, b = (0.45 * g + 1.2 * (1 - g)) * a;
      trCol.set([r, gg, b, r * 0.1, gg * 0.1, b * 0.1], i * 6);
    }
    trGeo.attributes.position.needsUpdate = trGeo.attributes.color.needsUpdate = true;
  }

  /* ---------- light and the env map that gives the stainless cars their indigo and gold reflections ---------- */
  scene.add(new THREE.HemisphereLight(0x4a3d8c, 0x0b0a24, 0.9));
  const moonLight = new THREE.DirectionalLight(0xb9c6ff, 0.9); scene.add(moonLight, moonLight.target);
  {
    const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));
    const blob = (c, k, x, y, z, s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8), new THREE.MeshBasicMaterial({ color: hdr(c, k), side: THREE.DoubleSide })); m.position.set(x, y, z); es.add(m); };
    blob(C.gold, 3, 30, 2, 20, 7); blob(C.cyan, 2, -30, 4, -15, 6); blob(col(0xdfe6ff), 3, -10, 30, 25, 8);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose();
  }
  /* the stainless cars reflect a real night sky: Poly Haven's Dresden Station Night (CC0), cut to 512 by 256 in art/ */
  let trainEnv = null;
  import("three/addons/loaders/RGBELoader.js").then(({ RGBELoader }) => new RGBELoader().loadAsync("art/intro-env.hdr")).then(t => {
    if (dead) return; const pm = new THREE.PMREMGenerator(renderer); trainEnv = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
    for (const m of trainMats) { m.envMap = trainEnv; m.envMapIntensity = m === steelM ? 0.22 : 0.45; m.needsUpdate = true; }
  }).catch(() => {}).finally(() => Boot.done("env"));

  /* ---------- post: bloom, then grain and vignette ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.42, 0.72);
  /* rays run before bloom, so they only pick up the truly bright core, not the bloom haze */
  /* light rays from a bright point (the portal, the moon) and a zoom blur at top speed, in one pass that costs nothing when off */
  const rays = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uRays: { value: 0 }, uZoom: { value: 0 } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uC; uniform float uRays, uZoom; varying vec2 vU;
      void main(){ vec4 c = texture2D(tDiffuse, vU);
        if (uRays > 0.001 || uZoom > 0.001) {
          vec2 d = vU - uC; vec3 r = vec3(0.0), z = vec3(0.0);
          for (int i = 1; i <= 12; i++) { float t = float(i) / 12.0; vec3 sR = texture2D(tDiffuse, vU - d * t * 0.42).rgb; r += max(sR - 2.2, 0.0) * (1.0 - t);
            z += texture2D(tDiffuse, vU - (vU - 0.5) * t * 0.06).rgb; }
          c.rgb += r / 12.0 * uRays * 3.0; c.rgb = mix(c.rgb, z / 12.0, clamp(uZoom, 0.0, 0.85));
        }
        gl_FragColor = c; }` });
  composer.addPass(rays); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grain = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uCA: { value: 0 } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uT, uCA; uniform vec2 uRes; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec4 c = texture2D(tDiffuse, vU); vec2 q = vU - 0.5;
        if (uCA > 0.0001) { c.r = texture2D(tDiffuse, vU + q * uCA).r; c.b = texture2D(tDiffuse, vU - q * uCA).b; }
        q.x *= uRes.x / uRes.y;
        float v = smoothstep(1.05, 0.25, length(q * vec2(0.8, 1.0))); c.rgb *= mix(0.42, 1.0, v);
        c.rgb += (h(vU * uRes + fract(uT) * 100.0) - 0.5) * 0.045; gl_FragColor = c; }` });
  composer.addPass(grain);

  /* ---------- camera rigs ---------- */
  const A = {}, B = {}, Cc = {};
  const camP = new V3(), camL = new V3(), p1 = new V3(), l1 = new V3(), p2 = new V3(), l2 = new V3(), p3 = new V3(), l3 = new V3(), pH = new V3(), lH = new V3();
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  frame(D0 + 40, A); const wideBase = A.P.clone(), wideS = A.S.clone(), wideT = A.T.clone();
  pH.copy(P0).addScaledVector(T0, -44).addScaledVector(S0, 5); pH.y = P0.y + 4.5;
  lH.copy(P0).addScaledVector(T0, 10); lH.y = P0.y + 8;
  /* the moon sits in the opening shot's sky */
  { const c = wideBase.clone().addScaledVector(wideS, 130).setY(44), dir = wideBase.clone().sub(c).setY(0).normalize(); moon.position.copy(c).addScaledVector(dir, 3200).setY(400); moon.lookAt(c); moonHalo.position.copy(moon.position).addScaledVector(dir, 20); moonHalo.lookAt(c); moonLight.position.copy(moon.position); moonLight.target.position.copy(wideBase); }
  /* eight shots, cut on the story clock. A station shot holds while the train waits there for its part to load */
  const SHOTS = [1.8, 3.0, 4.8, 7.0, 9.6, 12.6, 14.0];
  const shotAt = s => { let i = 0; while (i < SHOTS.length && s >= SHOTS[i]) i++; return i; };
  const dPass = dAt(1.45);   /* the cold open's camera stands where the train passes at 1.45s */
  function rig(s, rt, out) {
    const dl = dAt(s), n = shotAt(s), port = vw < vh;
    out.fovK = 0; out.rays = 0; out.zoom = 0; out.ca = 0; out.focus = null; out.bloomK = 1;
    if (n === 0) {          /* 1 cold open: rail level, the headlight swells and the train blasts past the lens */
      frame(dPass, A); out.p.copy(A.P).addScaledVector(A.S, 1.95).addScaledVector(UP, 0.65);
      frame(Math.min(dl, dPass - 3), B); out.l.copy(B.P).addScaledVector(UP, 1.8); out.bloomK = 0.7;
    } else if (n === 1) {   /* 2 crane reveal: rise up and back over the train toward the skyline and the moon */
      const k = sm(SHOTS[0], SHOTS[1], s); frame(Math.max(0, dl - 55), A); frame(dl + 40, B);
      out.p.copy(A.P).addScaledVector(A.S, 30 + k * 30).addScaledVector(UP, 10 + k * 42); out.l.copy(B.P).addScaledVector(UP, 8 + k * 6);
      out.rays = 0.5 * k; out.focus = moon.position;
    } else if (n === 2) {   /* 3 Individuals: on the platform, the train roars in under the canopy lamps */
      const dc = stopD[0] - 20; frame(dc + 27, A); frame(Math.max(0, dl - 8), B);
      out.p.copy(A.P).addScaledVector(A.S, -5.4).addScaledVector(UP, 1.6); out.l.copy(B.P).addScaledVector(B.S, -1.5).addScaledVector(UP, 2.2); out.bloomK = 0.55;
    } else if (n === 3) {   /* 4 Businesses: drone straight down as the canopy lamps chase on */
      const dc = stopD[1] - 20, k = sm(SHOTS[2], SHOTS[3], s); frame(dc, A);
      out.p.copy(A.P).addScaledVector(UP, (port ? 52 : 40) - k * 8).addScaledVector(A.S, -8).addScaledVector(A.T, -14 + k * 10); out.l.copy(A.P).addScaledVector(A.S, -2).addScaledVector(A.T, k * 6);
    } else if (n === 4) {   /* 5 Representation: cab view from the lead car, the last station rushes in */
      frame(dl + 0.4, A); frame(dl + 40, B); out.p.copy(A.P).addScaledVector(UP, 2.7); out.l.copy(B.P).addScaledVector(UP, 2.2); out.fovK = 0.6;
    } else if (n === 5) {   /* 6 the dive: beside the lead car, wide lens, the tower looms */
      const k = sm(SHOTS[4], SHOTS[5], s); frame(Math.min(dl - 14, dPortal - 40), A); frame(Math.min(dl + 50, L), B);
      out.p.copy(A.P).addScaledVector(A.S, -4.2).addScaledVector(UP, 4.6); out.l.copy(B.P).setY(B.P.y + 3).lerp(tmp.copy(towerAt).setY(90), 0.35 + k * 0.4);
      out.fovK = 1; out.zoom = 0.35 * k; out.ca = 0.012 * k;
    } else if (n === 6) {   /* 7 portal burst: close on the portal as the train dives in */
      out.p.copy(P0).addScaledVector(T0, -30).addScaledVector(S0, 6).setY(P0.y + 3.5); out.l.copy(P0).setY(P0.y + 6);
      out.rays = 0.2 + glow.burst * 1.2; out.focus = glowAt; out.ca = 0.01 * glow.burst;
    } else {                /* 8 Tap to Start: a slow push-in on the glowing portal under the tower */
      const k = reduce || title ? 0 : Math.min(1, (s - SHOTS[6]) / 10);
      out.p.copy(pH).lerp(tmp.copy(P0).addScaledVector(T0, -26).addScaledVector(S0, 3).setY(P0.y + 4), k * 0.4); out.l.copy(lH);
      if (!reduce) { out.p.x += Math.sin(rt * 0.21) * 0.8; out.p.y += Math.sin(rt * 0.17) * 0.3; }
      out.rays = 0.18; out.focus = glowAt;
    }
  }
  const glowAt = P0.clone().setY(P0.y + 5);
  const view = { p: new V3(), l: new V3(), fovK: 0, rays: 0, zoom: 0, ca: 0, focus: null, bloomK: 1 };

  /* ---------- size, adaptive pixel ratio ---------- */
  let vw = 1, vh = 1, needResize = false;
  function resize() {
    vw = Math.max(1, I.el.clientWidth); vh = Math.max(1, I.el.clientHeight);
    renderer.setPixelRatio(dpr); renderer.setSize(vw, vh, false); composer.setPixelRatio(dpr); composer.setSize(vw, vh);
    bloom.resolution.set(vw / 2, vh / 2); grain.uniforms.uRes.value.set(vw * dpr, vh * dpr);
    camera.aspect = vw / vh;
  }
  const baseFov = () => { const a = vw / vh, h = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(64) / 2) / a); return Math.min(84, Math.max(42, THREE.MathUtils.radToDeg(h))); };
  /* a resize clears the canvas, so it waits for the start of the next frame, which then draws at once (no blank frame) */
  const onResize = () => { needResize = true; };
  window.addEventListener("resize", onResize); resize();

  /* ---------- the loop ---------- */
  let s = title ? 15 : 0, rate = 1, last = performance.now(), t0 = last, raf = 0, dead = false, phase = "", flareAt = 0, ft = [], lastStation = -1, lastWait = null;
  const dpr0 = dpr;
  const setPhase = p => { if (p !== phase) { phase = p; I.phase(p); } };
  function tick(now) {
    if (dead) return;
    raf = reduce ? 0 : requestAnimationFrame(tick);
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw), rt = (now - t0) / 1000; last = now;
    if (needResize) { needResize = false; resize(); }
    for (let k = 0; k < 3; k++) if (Boot.lit(k)) lightStation(k, now);
    /* the story clock: the train brakes into a dark station and waits there until its part has loaded */
    if (!title) {
      const k = stations.findIndex((g, i) => !g.on && stopD[i] > dAt(s) - 1);
      let target = 1;
      if (k >= 0) { target = Math.min(1, Math.max(0, (sStations[k] - s) / 1.1)); }
      rate += (target - rate) * Math.min(1, dt * 5);
      s += dt * rate;
      if (k >= 0 && s > sStations[k]) s = sStations[k];
      const dl = dAt(s), next = stopD.findIndex(sd => sd > dl - 4);
      const ni = next < 0 ? 2 : next, w = k >= 0 && k === next && sStations[k] - s < 0.6;
      if (ni !== lastStation || w !== lastWait) { lastStation = ni; lastWait = w; I.station(ni, w); }
      setPhase(s < SHOTS[0] ? "wide" : s < SHOTS[4] ? "stations" : s < SHOTS[6] ? "dive" : "hero");
    } else setPhase("hero");
    const dl = dAt(s), speed = speedAt(s) * rate;
    if (s < sPortal + 1.2) {
      placeTrain(dl);
      if (!reduce) {
        const busy = s > 10 ? 0.55 : 0.12;
        for (let k = 0; k < NCAR; k++) {
          if (!cars[k].visible) continue;
          for (const off of [3.6, -3.6]) if (Math.random() < busy * (speed / 40)) {
            frame(dl - CAR / 2 - k * (CAR + GAP) + off, fa);
            if (fa.P.distanceToSquared(P0) < 30) continue;
            emit(tmp.copy(fa.P).addScaledVector(fa.S, Math.random() < 0.6 ? 1.5 : 0.75).addScaledVector(UP, 0.3), fa.T, fa.S, speed, 3 + (Math.random() * (s > 10 ? 10 : 5)) | 0);
          }
        }
        trailFrame(dl - NCAR * (CAR + GAP), rt, speed);
      }
    } else { cars.forEach(c => (c.visible = false)); trail.visible = false; }
    if (!reduce) sparkFrame(dt, speed);
    stationFrame(now);
    /* the portal glow builds through the dive, bursts as the train goes in, then pulses slowly */
    /* the burst fades with the story clock (it used to hold its peak, which left the portal shot washed out) */
    glow.burst = !title && s > sPortal ? Math.exp(-(s - sPortal) * 2.2) : glow.burst * 0.9;
    const build = title ? 1 : 0.35 + 0.65 * sm(9.5, 13.4, s), pulse = reduce ? 1 : 1 + 0.12 * Math.sin(rt * 1.7);
    const fl = flareAt ? Math.min(1, (now - flareAt) / 600) : 0, flk = fl * fl;
    const g = build * pulse + glow.burst * 1.2 + flk * 6;
    glow.light.uniforms.uG.value = g; glow.halo.material.uniforms.uK.value = 0.07 * g; glow.halo2.material.uniforms.uK.value = 0.02 * g;
    glow.pl.intensity = 60 * g; glow.tower.uniforms.uBoost.value = 0.04 + 0.12 * build + flk;
    bloom.strength = 0.7 + 0.2 * build + glow.burst * 0.5 + flk * 4;
    rig(s, rt, view);
    if (!reduce && shotAt(s) === 5) { const j = 0.06 * (speed / 60); view.p.x += (Math.random() - 0.5) * j; view.p.y += (Math.random() - 0.5) * j; }
    camera.position.copy(view.p); camera.lookAt(view.l);
    camera.fov = baseFov() + view.fovK * 10; camera.updateProjectionMatrix();
    glow.halo.lookAt(camera.position); glow.halo2.lookAt(camera.position); glow.beacon.lookAt(camera.position);
    if (headCone) headCone.visible = shotAt(s) !== 0; /* the cold open's camera stands inside the beam */
    if (headSpot) headSpot.intensity = shotAt(s) === 0 ? 260 : 900;
    bloom.strength *= view.bloomK;
    /* headlight streak: on the lead car's nose, facing the camera, bright only when the train faces us */
    if (cars[0].visible) { tmp.set(CAR / 2 + 0.3, 1.6, 0); cars[0].localToWorld(tmp); streak.position.copy(tmp); streak.quaternion.copy(camera.quaternion);
      tmp2.set(1, 0, 0).applyQuaternion(cars[0].quaternion); const face = tmp2.dot(tmp.sub(camera.position).normalize() .negate()); streak.material.uniforms.uK.value = Math.pow(Math.max(0, face), 6) * 0.55; streak.visible = true; }
    else streak.visible = false;
    /* searchlights, the shockwave ring, motes */
    const beamK = title ? 1 : sm(SHOTS[4], SHOTS[5], s); beamM.uniforms.uK.value = beamK;
    beams.forEach((b, i) => { b.rotation.order = "YXZ"; b.rotation.z = Math.PI - 0.42; b.rotation.y = (reduce ? 0.6 : rt * 0.32) + i * Math.PI; b.visible = beamK > 0.01; });
    const rk = s - sPortal; ring.visible = !title && rk > 0 && rk < 1.3; if (ring.visible) { ring.scale.setScalar(1 + rk * 34); ring.material.opacity = Math.pow(1 - rk / 1.3, 2) * 0.9; }
    motes.material.opacity = (title ? 1 : sm(SHOTS[5], SHOTS[6], s)) * 0.55; if (!reduce) { motes.rotation.y = rt * 0.02; motes.position.y = Math.sin(rt * 0.2) * 0.8; }
    /* post: rays toward the focus point (when it's on screen), zoom blur and the chromatic edge at top speed */
    let ry = view.rays;
    if (ry > 0 && view.focus) { tmp.copy(view.focus).project(camera); if (tmp.z > 1 || Math.abs(tmp.x) > 1.3 || Math.abs(tmp.y) > 1.3) ry = 0; else rays.uniforms.uC.value.set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5); }
    rays.uniforms.uRays.value = reduce ? Math.min(ry, 0.5) : ry; rays.uniforms.uZoom.value = reduce ? 0 : view.zoom; grain.uniforms.uCA.value = reduce ? 0 : view.ca;
    grain.uniforms.uT.value = reduce ? 0 : rt;
    composer.render(dt);
    /* hold 60fps on a phone: if steady frames run long, step the pixel ratio down, at most twice. One-off stalls (the town
       building, the bank arriving) and the first two seconds don't count */
    if (!reduce && rt > 2 && raw < 0.1) { ft.push(raw); if (ft.length >= 60) { const avg = ft.reduce((a, b) => a + b, 0) / ft.length; ft = []; if (avg > 0.021 && dpr > Math.max(1, dpr0 - 0.5)) { dpr = Math.max(1, dpr - 0.25); needResize = true; } } }
  }
  const frameOnce = () => { if (!dead) requestAnimationFrame(tick); };
  if (reduce) { Boot.on(frameOnce); window.addEventListener("resize", frameOnce); }
  document.addEventListener("visibilitychange", () => { if (dead || reduce) return; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } });

  if (!I.attach({
    canvas: renderer.domElement,
    flare() { flareAt = performance.now(); },
    dispose() {
      dead = true; cancelAnimationFrame(raf); window.removeEventListener("resize", onResize);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); });
      scene.environment && scene.environment.dispose(); composer.dispose && composer.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  })) { renderer.dispose(); return; } /* too late: the overlay already gave up on 3D */
  if (I.current === "hero" && !title) { title = true; s = 15; } /* the overlay already moved on to Tap to Start */
  paintTrain();
  if (/[?&]introseek/.test(location.search)) window.__introSeek = x => { s = x; rate = 1; }; /* for screenshots and tests */
  raf = requestAnimationFrame(tick);
})();
