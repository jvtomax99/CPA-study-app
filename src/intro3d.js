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
  } catch (e) { Boot.done("three"); Boot.done("post"); I.no3d(); return; }
  if (!I.el.isConnected) return;

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

  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), sc = new V3(), tmp = new V3(), basis = new THREE.Matrix4();
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
  const LAMP_OFF = col(0x2a2840), LAMP_ON = hdr(C.gold, 2.6);
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
      g.edge.material.color.copy(LAMP_OFF).lerp(hdr(C.amber, 1.8), k);
      g.sign.material.color.setScalar(0.33 + 0.77 * k);
      g.pl.intensity = 900 * k;
      g.settled = age > 1.2;
    }
  }
  const tmpC = new THREE.Color();

  /* ---------- the train: four generic stainless cars ---------- */
  const steelTex = (() => {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 64; const x = cv.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, "#c9cede"); g.addColorStop(0.5, "#aab0c4"); g.addColorStop(1, "#7d8399"); x.fillStyle = g; x.fillRect(0, 0, 512, 64);
    x.fillStyle = "rgba(40,44,70,0.35)"; for (let i = 0; i < 64; i++) x.fillRect(i * 8, 40, 1, 24); /* lower fluting */
    x.fillStyle = "rgba(30,32,52,0.6)"; for (const dx of [70, 210, 290, 430]) x.fillRect(dx, 4, 1.5, 56); /* door seams */
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const winTex = (() => {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 32; const x = cv.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, 512, 32);
    x.fillStyle = "#fff"; for (const [a, b] of [[14, 62], [86, 118], [130, 196], [214, 238], [262, 286], [304, 370], [382, 414], [438, 496]]) x.fillRect(a, 3, b - a, 26);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const bodyM = new THREE.MeshStandardMaterial({ map: steelTex, metalness: 0.75, roughness: 0.32 });
  const roofM = new THREE.MeshStandardMaterial({ color: 0x8a90a8, metalness: 0.7, roughness: 0.45 });
  const underM = new THREE.MeshStandardMaterial({ color: 0x121222, roughness: 0.9 });
  const winM = new THREE.MeshBasicMaterial({ map: winTex, color: hdr(C.cyan, 2.1), fog: true });
  const CAR = 10.2, GAP = 0.7, NCAR = 4;
  const cars = [];
  for (let k = 0; k < NCAR; k++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(CAR, 2.9, 2.75), bodyM); body.position.y = 2.15;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(CAR - 0.2, 0.3, 2.45), roofM); roof.position.y = 3.72;
    const under = new THREE.Mesh(new THREE.BoxGeometry(CAR - 1.4, 0.7, 2.3), underM); under.position.y = 0.5;
    g.add(body, roof, under);
    for (const sd of [1, -1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(CAR - 0.6, 0.85), winM); w.position.set(0, 2.55, sd * 1.39); if (sd < 0) w.rotation.y = Math.PI; g.add(w); }
    if (k === 0) {
      const hl = new THREE.MeshBasicMaterial({ color: hdr(col(0xfff1d6), 7) });
      for (const sd of [0.85, -0.85]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.4), hl); h.position.set(CAR / 2 + 0.03, 1.55, sd); g.add(h); }
      const cab = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.9), new THREE.MeshBasicMaterial({ color: hdr(C.cyan, 0.9) })); cab.position.set(CAR / 2 + 0.02, 2.6, 0); cab.rotation.y = Math.PI / 2; g.add(cab);
      const amb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.16), new THREE.MeshBasicMaterial({ color: hdr(C.amber, 5) })); amb.position.set(CAR / 2 + 0.03, 3.35, 0.9); g.add(amb);
      const spot = new THREE.SpotLight(0xfff1d6, 900, 90, 0.42, 0.6, 1.6); spot.position.set(CAR / 2, 1.6, 0); spot.target.position.set(CAR / 2 + 20, -1, 0); g.add(spot, spot.target);
      const coneM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uC: { value: col(0xfff1d6) } },
        vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform vec3 uC; varying vec2 vU; void main(){ gl_FragColor = vec4(uC * pow(vU.y, 2.0) * 0.16, 1.0); }" });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 26, 20, 1, true), coneM); cone.rotation.z = Math.PI / 2; cone.position.set(CAR / 2 + 13, 1.4, 0); g.add(cone);
    }
    if (k === NCAR - 1) { const rm = new THREE.MeshBasicMaterial({ color: hdr(col(0xff3b3b), 4) }); for (const sd of [0.95, -0.95]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.25), rm); r.position.set(-CAR / 2 - 0.03, 1.55, sd); g.add(r); } }
    scene.add(g); cars.push(g);
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

  /* ---------- post: bloom, then grain and vignette ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.42, 0.72); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grain = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uT; uniform vec2 uRes; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec4 c = texture2D(tDiffuse, vU); vec2 q = vU - 0.5; q.x *= uRes.x / uRes.y;
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
  function rig(s, rt, out) {
    const dl = dAt(s);
    const wk = vw < vh ? 0.72 : 0.8;
    p1.copy(wideBase).addScaledVector(wideS, 130 * wk).addScaledVector(wideT, -70 * wk + s * 9).setY(48 * wk - s * 1.5);
    frame(Math.max(0, dl - 22), B); l1.copy(B.P).setY(B.P.y + 2);
    frame(dl + 16, B); p2.copy(B.P).addScaledVector(B.S, vw < vh ? 26 : 34).addScaledVector(UP, 10 + Math.sin(rt * 0.3) * 0.8);
    frame(Math.max(0, dl - 14), Cc); l2.copy(Cc.P).addScaledVector(Cc.S, -3).setY(Cc.P.y + 2.6);
    frame(Math.min(dl - 22, dPortal - 40), B); p3.copy(B.P).addScaledVector(B.S, 5.5).addScaledVector(UP, 5);
    frame(Math.min(dl + 20, L), Cc); l3.copy(Cc.P).setY(Cc.P.y + 2.5).lerp(lH, sm(10.5, 12.8, s) * 0.6);
    out.p.copy(p1).lerp(p2, sm(1.5, 3.0, s)).lerp(p3, sm(9.5, 11.0, s)).lerp(pH, sm(12.3, 13.9, s));
    out.l.copy(l1).lerp(l2, sm(1.5, 3.0, s)).lerp(l3, sm(9.5, 11.0, s)).lerp(lH, sm(12.3, 13.9, s));
    if (s >= 13.9) { out.p.x += Math.sin(rt * 0.21) * (reduce ? 0 : 1.6); out.p.y += Math.sin(rt * 0.17) * (reduce ? 0 : 0.6); }
    out.fovK = sm(10, 11.5, s) * (1 - sm(12.6, 13.9, s));
  }
  const view = { p: new V3(), l: new V3(), fovK: 0 };

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
      setPhase(s < 2 ? "wide" : s < 10 ? "stations" : s < 13.6 ? "dive" : "hero");
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
    if (!title && s > sPortal) glow.burst = Math.max(glow.burst, Math.exp(-(s - sPortal) * 2.2)); else glow.burst *= 0.9;
    const build = title ? 1 : 0.35 + 0.65 * sm(9.5, 13.4, s), pulse = reduce ? 1 : 1 + 0.12 * Math.sin(rt * 1.7);
    const fl = flareAt ? Math.min(1, (now - flareAt) / 600) : 0, flk = fl * fl;
    const g = build * pulse + glow.burst * 1.2 + flk * 6;
    glow.light.uniforms.uG.value = g; glow.halo.material.uniforms.uK.value = 0.07 * g; glow.halo2.material.uniforms.uK.value = 0.02 * g;
    glow.pl.intensity = 60 * g; glow.tower.uniforms.uBoost.value = 0.04 + 0.12 * build + flk;
    bloom.strength = 0.7 + 0.2 * build + glow.burst * 0.5 + flk * 4;
    rig(s, rt, view);
    if (!reduce && s > 10 && s < 13.6) { const j = 0.05 * (speed / 60); view.p.x += (Math.random() - 0.5) * j; view.p.y += (Math.random() - 0.5) * j; }
    camera.position.copy(view.p); camera.lookAt(view.l);
    camera.fov = baseFov() + view.fovK * 10; camera.updateProjectionMatrix();
    glow.halo.lookAt(camera.position); glow.halo2.lookAt(camera.position); glow.beacon.lookAt(camera.position);
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
  if (/[?&]introseek/.test(location.search)) window.__introSeek = x => { s = x; rate = 1; }; /* for screenshots and tests */
  raf = requestAnimationFrame(tick);
})();
