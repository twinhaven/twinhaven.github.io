// Hero showcase: three machines on test stands — a 6-axis arm, a SCARA and a hexapod.
// Each shows stroboscope imprints, a trajectory and a clearance dimension with limits,
// over a run timeline. Original geometry (no third-party models). Product palette (dp-ui tokens).
// Illustration of product concepts (kinematics, stroboscope, measurements) — not a recorded simulation.
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const MM = 100;   // illustrative scale: scene units -> mm on the plaque
const C = {
  body: 0xd8d5cb, edge: 0xc0bdb2, frame: 0xb4b2a9, dark: 0x4a4842, fixture: 0xe6e3db,
  accent: 0x534ab7, past: 0x8a887f, grid: 0xd3d1c7, ok: '#0F6E56', bad: '#A32D2D',
};

const host = document.getElementById('hero3d');
const canvas = host.querySelector('canvas');
const plaque = host.querySelector('.plaque');
const caption = host.querySelector('.caption');
const lane = host.querySelector('canvas.lane');
const lctx = lane.getContext('2d');
const tabs = [...host.querySelectorAll('[data-scene]')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
catch (e) { host.classList.add('no-webgl'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
const controls = new OrbitControls(camera, canvas);
Object.assign(controls, { enableDamping: true, enableZoom: false, enablePan: false, minPolarAngle: 0.45, maxPolarAngle: 1.42, autoRotate: !reduce, autoRotateSpeed: 0.35 });

scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d5cb, 1.15));
const sun = new THREE.DirectionalLight(0xffffff, 1.55);
sun.position.set(2.5, 5, 2.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5 });
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.ShadowMaterial({ opacity: 0.14 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(5, 40, C.grid, C.grid);
grid.material.transparent = true; grid.material.opacity = 0.28; grid.position.y = 0.001; scene.add(grid);

// ---------- helpers ----------
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.12, ...o });
const solid = { link: std(C.body), joint: std(C.accent, { roughness: 0.32 }), dark: std(C.dark, { roughness: 0.3, metalness: 0.3 }), frame: std(C.frame), edge: std(C.edge) };
function ghostSet(t) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.past).lerp(new THREE.Color(C.accent), t), transparent: true, opacity: 0.07 + 0.2 * t, depthWrite: false });
  return { link: m, joint: m, dark: m, frame: m, edge: m, ghost: true };
}
function mesh(geo, m) { const o = new THREE.Mesh(geo, m); if (!m.transparent) { o.castShadow = true; o.receiveShadow = true; } return o; }
const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r, h, m, seg = 32) => mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
const sph = (r, m) => mesh(new THREE.SphereGeometry(r, 24, 16), m);
function at(o, x, y, z) { o.position.set(x, y, z); return o; }
function boxNearest(p, center, half) {
  return new THREE.Vector3(
    THREE.MathUtils.clamp(p.x, center.x - half.x, center.x + half.x),
    THREE.MathUtils.clamp(p.y, center.y - half.y, center.y + half.y),
    THREE.MathUtils.clamp(p.z, center.z - half.z, center.z + half.z));
}
function dashed(points, opacity = 0.55) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: C.accent, dashSize: 0.03, gapSize: 0.022, transparent: true, opacity }));
  l.computeLineDistances(); return l;
}

// ---------- machine 1: 6-axis arm ----------
function makeArm(M) {
  const g = new THREE.Group();
  if (!M.ghost) { g.add(at(cyl(0.26, 0.08, M.frame), 0, 0.04, 0)); }
  const j1 = new THREE.Group(); j1.position.y = 0.08; g.add(j1);
  if (!M.ghost) { const turret = cyl(0.17, 0.22, M.link); turret.position.y = 0.11; j1.add(turret); }
  const j2 = new THREE.Group(); j2.position.set(0.06, 0.3, 0); j1.add(j2);
  const m2 = cyl(0.11, 0.26, M.joint); m2.rotation.x = Math.PI / 2; j2.add(m2);
  const upper = box(0.13, 0.72, 0.15, M.link); upper.position.y = 0.36; j2.add(upper);
  const j3 = new THREE.Group(); j3.position.y = 0.72; j2.add(j3);
  const m3 = cyl(0.09, 0.22, M.joint); m3.rotation.x = Math.PI / 2; j3.add(m3);
  const fore = box(0.6, 0.11, 0.12, M.link); fore.position.x = 0.3; j3.add(fore);
  const j5 = new THREE.Group(); j5.position.x = 0.6; j3.add(j5);
  const m5 = cyl(0.06, 0.16, M.joint); m5.rotation.x = Math.PI / 2; j5.add(m5);
  const wrist = box(0.16, 0.08, 0.09, M.edge); wrist.position.x = 0.08; j5.add(wrist);
  const tool = new THREE.Group(); tool.position.x = 0.16; j5.add(tool);
  const flange = cyl(0.05, 0.04, M.dark); flange.rotation.z = Math.PI / 2; tool.add(flange);
  [-1, 1].forEach(s => { const f = box(0.1, 0.02, 0.025, M.dark); f.position.set(0.07, 0, 0.035 * s); tool.add(f); });
  const tip = new THREE.Object3D(); tip.position.x = 0.13; tool.add(tip);
  return { root: g, set(p) { const a = p * Math.PI * 2; j1.rotation.y = 0.85 * Math.sin(a); j2.rotation.z = -0.45 + 0.22 * Math.sin(a + 0.7); j3.rotation.z = -0.35 + 0.3 * Math.sin(a * 2 + 0.3); j5.rotation.z = -0.75 + 0.3 * Math.sin(a + 1.4); }, tip };
}
const ARM = {
  key: 'arm', frags: [['approach', 0.02, 0.3], ['place', 0.3, 0.55], ['return', 0.6, 0.95]], caption: 'Test cell · 6-axis arm · pick and place', label: 'tool ↔ fixture',
  cam: { pos: [2.6, 1.6, 2.75], target: [0.35, 0.36, 0] },
  build(group) {
    const live = makeArm(solid); group.add(live.root);
    // Place the fixture where the tool passes close (a near miss) and no other link touches it
    const fixH = new THREE.Vector3(0.12, 0.15, 0.13);
    const fixC = (() => {
      const pr = makeArm(solid), N = 120, tips = [], links = [];
      const marks = [pr.tip];
      pr.root.traverse(o => { if (o.isMesh) marks.push(o); });
      const v = new THREE.Vector3();
      for (let i = 0; i < N; i++) {
        pr.set(i / N); pr.root.updateMatrixWorld(true);
        tips.push(pr.tip.getWorldPosition(new THREE.Vector3()));
        pr.root.traverse(o => { if (o.isMesh && o.geometry) {
          o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox, sz = bb.getSize(new THREE.Vector3());
          const steps = d => (d === Math.max(sz.x, sz.y, sz.z) ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1]);
          for (const fx of steps(sz.x)) for (const fy of steps(sz.y)) for (const fz of steps(sz.z))
            links.push(v.set(bb.min.x + sz.x * fx, bb.min.y + sz.y * fy, bb.min.z + sz.z * fz).applyMatrix4(o.matrixWorld).clone());
        } });
      }
      const distBox = (p, c) => p.distanceTo(boxNearest(p, c, fixH));
      let best = null;
      for (let x = 0.55; x <= 1.25; x += 0.025) for (let z = -0.55; z <= 0.55; z += 0.025) {
        const c = new THREE.Vector3(x, fixH.y, z);
        let tipMin = Infinity, linkMin = Infinity;
        for (const p of tips) tipMin = Math.min(tipMin, distBox(p, c));
        if (tipMin < 0.025 || tipMin > 0.06) continue;
        for (const p of links) { linkMin = Math.min(linkMin, distBox(p, c)); if (linkMin < 0.012) break; }
        if (linkMin < 0.012) continue;
        const score = Math.abs(tipMin - 0.035);
        if (!best || score < best.score) best = { c, score };
      }
      window.__fixture = best ? 'fit' : 'fallback';
      return best ? best.c : new THREE.Vector3(1.1, fixH.y, 0.35);
    })();
    const fixture = box(fixH.x * 2, fixH.y * 2, fixH.z * 2, std(C.fixture)); fixture.position.copy(fixC); group.add(fixture);
    for (let i = 0; i < 6; i++) { const t = i / 5, gh = makeArm(ghostSet(t)); gh.set(0.08 + 0.42 * t); group.add(gh.root); }
    const probe = makeArm(solid); const pts = [], v = new THREE.Vector3();
    for (let i = 0; i <= 120; i++) { probe.set(i / 120); probe.root.updateMatrixWorld(true); probe.tip.getWorldPosition(v); pts.push(v.clone()); }
    group.add(dashed(pts));
    if (new URLSearchParams(location.search).has('debug')) window.__armCheck = () => {
      // every vertex of every live mesh, over the whole cycle: inside the fixture?
      let minD = Infinity, inside = 0; const v = new THREE.Vector3();
      for (let i = 0; i < 240; i++) { live.set(i / 240); live.root.updateMatrixWorld(true);
        live.root.traverse(o => { if (!o.isMesh) return; const pos = o.geometry.attributes.position;
          for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
            const d = v.distanceTo(boxNearest(v, fixC, fixH)); if (d === 0) inside++; minD = Math.min(minD, d); } }); }
      return { minDistanceMm: +(minD * 1000).toFixed(1), verticesInside: inside };
    };
    return { update(p) { live.set(p); live.root.updateMatrixWorld(true); const a = live.tip.getWorldPosition(new THREE.Vector3()); return [a, boxNearest(a, fixC, fixH)]; } };
  },
};

// ---------- machine 2: SCARA ----------
function makeScara(M) {
  const g = new THREE.Group();
  if (!M.ghost) { g.add(at(box(0.42, 0.06, 0.42, M.frame), 0, 0.03, 0)); }
  if (!M.ghost) { const col = cyl(0.11, 0.66, M.link); col.position.y = 0.39; g.add(col); }
  const t1 = new THREE.Group(); t1.position.y = 0.74; g.add(t1);
  if (!M.ghost) t1.add(cyl(0.12, 0.1, M.joint));
  const l1 = box(0.56, 0.08, 0.16, M.link); l1.position.x = 0.28; t1.add(l1);
  const t2 = new THREE.Group(); t2.position.set(0.56, 0.06, 0); t1.add(t2);
  t2.add(cyl(0.1, 0.1, M.joint));
  const l2 = box(0.46, 0.07, 0.13, M.link); l2.position.x = 0.23; t2.add(l2);
  const quill = new THREE.Group(); quill.position.x = 0.46; t2.add(quill);
  quill.add(cyl(0.05, 0.12, M.edge));
  const shaft = cyl(0.022, 0.5, M.dark, 16); quill.add(shaft);
  const tip = new THREE.Object3D(); quill.add(tip);
  return { root: g, set(p) { const a = p * Math.PI * 2; t1.rotation.y = 0.9 * Math.sin(a); t2.rotation.y = 1.25 * Math.sin(a * 2 + 0.6); const dip = 0.12 * (0.5 - 0.5 * Math.cos(a * 4)); shaft.position.y = -0.15 - dip; tip.position.y = -0.4 - dip; }, tip, t2 };
}
const SCARA = {
  key: 'scara', frags: [['pick', 0.05, 0.28], ['move', 0.3, 0.68], ['place', 0.72, 0.95]], caption: 'Test cell · SCARA · fast planar moves', label: 'quill ↔ post',
  cam: { pos: [2.2, 1.65, 2.35], target: [0.25, 0.2, 0] },
  build(group) {
    const live = makeScara(solid); group.add(live.root);
    const postC = new THREE.Vector3(0.72, 0.22, -0.18), postH = new THREE.Vector3(0.05, 0.22, 0.05);
    const post = box(postH.x * 2, postH.y * 2, postH.z * 2, std(C.fixture)); post.position.copy(postC); group.add(post);
    for (let i = 0; i < 8; i++) { const t = i / 7, gh = makeScara(ghostSet(t)); gh.set(0.05 + 0.4 * t); group.add(gh.root); }
    const probe = makeScara(solid); const pts = [], v = new THREE.Vector3();
    for (let i = 0; i <= 160; i++) { probe.set(i / 160); probe.root.updateMatrixWorld(true); probe.tip.getWorldPosition(v); pts.push(v.clone()); }
    group.add(dashed(pts));
    return { update(p) { live.set(p); live.root.updateMatrixWorld(true); const a = live.tip.getWorldPosition(new THREE.Vector3()); return [a, boxNearest(a, postC, postH)]; } };
  },
};

// ---------- machine 3: hexapod on a stand ----------
const BODY_Y = 0.42, COXA = 0.1, FEMUR = 0.2, TIBIA = 0.3, FOOT_R = 0.022;
function makeHexapod(M, onlyLeg = -1) {
  const g = new THREE.Group();
  if (!M.ghost) {
    g.add(at(cyl(0.3, 0.04, M.frame), 0, 0.02, 0));
    g.add(at(cyl(0.025, BODY_Y - 0.06, M.frame, 12), 0, (BODY_Y - 0.06) / 2 + 0.04, 0));
  }
  const body = new THREE.Group(); body.position.y = BODY_Y; g.add(body);
  if (onlyLeg < 0) {
    const shell = mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 6), M.link); body.add(shell);
    const top = mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.05, 6), M.edge); top.position.y = 0.065; body.add(top);
    const eye = sph(0.035, M.dark); eye.position.set(0.19, 0.03, 0); body.add(eye);
  }
  const legs = [];
  for (let i = 0; i < 6; i++) {
    if (onlyLeg >= 0 && i !== onlyLeg) { legs.push(null); continue; }
    const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const mount = new THREE.Group(); mount.rotation.y = -ang; mount.position.set(Math.cos(ang) * 0.2, 0, Math.sin(ang) * 0.2); body.add(mount);
    const coxa = new THREE.Group(); mount.add(coxa);
    coxa.add(cyl(0.03, 0.06, M.joint, 16));
    const cl = box(COXA, 0.035, 0.04, M.link); cl.position.x = COXA / 2; coxa.add(cl);
    const femur = new THREE.Group(); femur.position.x = COXA; coxa.add(femur);
    const fj = cyl(0.026, 0.06, M.joint, 16); fj.rotation.x = Math.PI / 2; femur.add(fj);
    const fl = box(FEMUR, 0.035, 0.035, M.link); fl.position.x = FEMUR / 2; femur.add(fl);
    const tibia = new THREE.Group(); tibia.position.x = FEMUR; femur.add(tibia);
    const tj = cyl(0.022, 0.05, M.joint, 16); tj.rotation.x = Math.PI / 2; tibia.add(tj);
    const tl = box(0.028, TIBIA, 0.028, M.edge); tl.position.y = -TIBIA / 2; tibia.add(tl);
    const foot = sph(FOOT_R, M.dark); foot.position.y = -TIBIA; tibia.add(foot);
    legs.push({ coxa, femur, tibia, foot, phase0: (i % 2) * 0.5 });
  }
  return { root: g, legs, set(p) {
    legs.forEach(l => { if (!l) return; const q = (p + l.phase0) % 1, a = q * Math.PI * 2;
      l.coxa.rotation.y = 0.32 * Math.cos(a);
      const lift = q < 0.5 ? Math.sin(q * 2 * Math.PI) : 0;
      l.femur.rotation.z = 0.32 + 0.38 * lift;
      l.tibia.rotation.z = -0.32 - 0.15 * lift; });
  } };
}
const HEX = {
  key: 'hexapod', frags: [['swing', 0.0, 0.5], ['stance', 0.5, 1.0]], caption: 'Test stand · hexapod · tripod gait', label: 'leg ↔ leg',
  cam: { pos: [1.65, 1.0, 1.85], target: [0, 0.12, 0] },
  build(group) {
    const live = makeHexapod(solid); group.add(live.root);
    for (let i = 0; i < 8; i++) { const t = i / 7, gh = makeHexapod(ghostSet(t), 0); gh.set(0.04 + 0.44 * t); group.add(gh.root); }
    const probe = makeHexapod(solid, 0); const pts = [], v = new THREE.Vector3();
    for (let i = 0; i <= 96; i++) { probe.set(i / 96); probe.root.updateMatrixWorld(true); probe.legs[0].foot.getWorldPosition(v); pts.push(v.clone()); }
    group.add(dashed(pts));
    return { update(p) { live.set(p); live.root.updateMatrixWorld(true); const a = live.legs[0].foot.getWorldPosition(new THREE.Vector3()), b = live.legs[1].foot.getWorldPosition(new THREE.Vector3()); const d = b.clone().sub(a).normalize().multiplyScalar(FOOT_R); return [a.add(d), b.sub(d)]; } };
  },
};

// ---------- scene switching ----------
const MACHINES = { arm: ARM, scara: SCARA, hexapod: HEX };
const built = {};
const SAMPLES = 240, DURATION = 7.2, STEPS = 3600;   // the illustrated run: 7.2 s, 3600 steps
const dimMat = new THREE.LineBasicMaterial({ color: 0x0f6e56 });
const dimGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
scene.add(new THREE.Line(dimGeom, dimMat));
const endGeom = new THREE.BufferGeometry(); const ends = new THREE.Points(endGeom, new THREE.PointsMaterial({ color: 0x0f6e56, size: 6, sizeAttenuation: false }));
scene.add(ends);
let current = null;

function ensure(key) {
  if (built[key]) return built[key];
  const m = MACHINES[key], group = new THREE.Group(); scene.add(group);
  const api = m.build(group);
  let lo = Infinity, hi = 0; const series = [];
  for (let i = 0; i <= SAMPLES; i++) { const [a, b] = api.update(i / SAMPLES); const mm = a.distanceTo(b) * MM; series.push(mm); lo = Math.min(lo, mm); hi = Math.max(hi, mm); }
  const limit = lo + (hi - lo) * 0.28;
  let exc = 0; for (let i = 1; i <= SAMPLES; i++) if (series[i] < limit && series[i - 1] >= limit) exc++;
  return (built[key] = { m, group, api, limit, series, lo, hi, exc });
}
function show(key, user = false) {
  Object.values(built).forEach(b => { b.group.visible = false; });
  current = ensure(key); current.group.visible = true;
  caption.textContent = current.m.caption;
  plaque.querySelector('.k').textContent = current.m.label;
  camera.position.set(...current.m.cam.pos); controls.target.set(...current.m.cam.target);
  tabs.forEach(t => t.setAttribute('aria-pressed', String(t.dataset.scene === key)));
  if (user) userPicked = true;
}
let userPicked = false;
tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.scene, true)));
canvas.addEventListener('pointerdown', () => { userPicked = true; });

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = camera.aspect < 1 ? 50 : 34; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host); resize();
let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);

const start = new URLSearchParams(location.search).get('scene');
show(MACHINES[start] ? start : 'arm');

// ---------- run timeline (mini lane in the style of the product timeline) ----------
const L = { bg: '#fcfbf8', grid: '#e2e0d8', text: '#6e6c64', ink: '#2a2925', graph: '#185FA5', fill: 'rgba(220,233,245,.75)',
  limit: '#A32D2D', ok: '#0F6E56', strob: '#2f7d6b', accent: '#534AB7', head: '#534AB7' };
function fmtNum(v) { return (v >= 100 ? v.toFixed(0) : v.toFixed(1)).replace('.', ','); }
function drawLane(p) {
  const dpr = Math.min(devicePixelRatio, 2), W = lane.clientWidth, H = lane.clientHeight;
  if (lane.width !== Math.round(W * dpr) || lane.height !== Math.round(H * dpr)) { lane.width = Math.round(W * dpr); lane.height = Math.round(H * dpr); }
  const g = lctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const x0 = 12, x1 = W - 12, xw = x1 - x0, X = t => x0 + t * xw;
  const cur = current;
  g.font = '500 10.5px "IBM Plex Mono", ui-monospace, monospace'; g.textBaseline = 'middle';

  // grid (seconds)
  g.strokeStyle = L.grid; g.lineWidth = 1;
  for (let s = 0; s <= DURATION + 1e-6; s += 0.5) { const x = Math.round(X(s / DURATION)) + 0.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H - 18); g.stroke(); }

  // row 0: fragments (named pieces of the run)
  cur.m.frags.forEach(([name, f0, f1]) => {
    g.fillStyle = 'rgba(206,203,246,.55)'; g.strokeStyle = '#7F77DD'; roundRect(g, X(f0), 4, X(f1) - X(f0), 11, 3); g.fill(); g.stroke();
    g.fillStyle = '#2C2570'; g.fillText(name, X(f0) + 5, 9.8);
  });
  // row 1: stroboscope clip with imprints (the ghosts' interval)
  const cy = 24, c0 = 0.06, c1 = 0.52;
  g.fillStyle = L.strob; g.globalAlpha = 0.9; roundRect(g, X(c0), cy - 5, X(c1) - X(c0), 10, 3); g.fill(); g.globalAlpha = 1;
  g.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { const x = X(c0 + (c1 - c0) * (i + 0.5) / 8); g.beginPath(); g.arc(x, cy, 2.4, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = L.text; g.fillText('stroboscope', X(c1) + 6, cy);

  // row 2: dimension graph — window fill, value line, limit, excursions
  const gy0 = 34, gy1 = 80, lo = cur.lo, hi = cur.hi, pad = (hi - lo) * 0.12;
  const Y = v => gy1 - (v - (lo - pad)) / ((hi + pad) - (lo - pad)) * (gy1 - gy0);
  g.fillStyle = L.fill; g.fillRect(X(0), gy0, xw, gy1 - gy0);
  const ly = Math.round(Y(cur.limit)) + 0.5;
  g.strokeStyle = L.limit; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(0), ly); g.lineTo(X(1), ly); g.stroke(); g.setLineDash([]);
  g.strokeStyle = L.graph; g.lineWidth = 1.6; g.beginPath();
  cur.series.forEach((v, i) => { const x = X(i / SAMPLES), y = Y(v); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
  // red zone between the graph and the limit where the value is out of limits
  g.fillStyle = 'rgba(163,45,45,.16)';
  for (let i = 1; i <= SAMPLES; i++) { const a = cur.series[i - 1], b = cur.series[i];
    if (a < cur.limit || b < cur.limit) { const xa = X((i - 1) / SAMPLES), xb = X(i / SAMPLES);
      g.beginPath(); g.moveTo(xa, ly); g.lineTo(xa, Y(Math.min(a, cur.limit))); g.lineTo(xb, Y(Math.min(b, cur.limit))); g.lineTo(xb, ly); g.closePath(); g.fill(); } }
  // min marker
  let mi = 0; cur.series.forEach((v, i) => { if (v < cur.series[mi]) mi = i; });
  const mx = X(mi / SAMPLES), my = Y(cur.series[mi]);
  g.fillStyle = L.limit; g.beginPath(); g.arc(mx, my, 3, 0, Math.PI * 2); g.fill();
  g.fillStyle = L.text; const mt = 'min ' + fmtNum(cur.series[mi]), mtw = g.measureText(mt).width;
  g.fillText(mt, mx + 6 + mtw > X(1) ? mx - 6 - mtw : mx + 6, Math.min(my + 2, gy1 - 4));
  // violation segments (red, below the limit)
  g.strokeStyle = L.limit; g.lineWidth = 2.2;
  for (let i = 1; i <= SAMPLES; i++) { const a = cur.series[i - 1], b = cur.series[i];
    if (a < cur.limit || b < cur.limit) { g.beginPath(); g.moveTo(X((i - 1) / SAMPLES), Y(a)); g.lineTo(X(i / SAMPLES), Y(b)); g.stroke(); } }
  g.lineWidth = 1;
  // excursion chip
  const chip = `⚠ ${cur.exc} excursion${cur.exc === 1 ? '' : 's'} · ≥ ${fmtNum(cur.limit)}`;
  g.font = '500 10.5px "IBM Plex Mono", ui-monospace, monospace';
  const cw = g.measureText(chip).width + 12;
  g.fillStyle = '#fff'; g.strokeStyle = '#E0B9A8'; roundRect(g, X(1) - cw - 4, gy0 + 3, cw, 15, 3); g.fill(); g.stroke();
  g.fillStyle = L.limit; g.fillText(chip, X(1) - cw + 2, gy0 + 10.5);
  g.fillStyle = L.text; g.fillText(cur.m.label, X(0) + 4, gy0 + 9);

  // row 3: verdict line — green, red where out of limits
  const vy = 92;
  for (let i = 1; i <= SAMPLES; i++) { g.fillStyle = cur.series[i] < cur.limit ? L.limit : L.ok; g.fillRect(X((i - 1) / SAMPLES), vy - 2, xw / SAMPLES + 0.6, 4); }

  // ruler
  const ry = H - 9;
  g.fillStyle = L.text;
  for (let s = 0; s <= DURATION + 1e-6; s += 1) { const x = X(s / DURATION); g.fillText(s === 0 ? '0' : s.toFixed(1).replace('.', ',') + ' s', x + 3, ry); }

  // playhead + value chip + time chip
  const hx = Math.round(X(p)) + 0.5, v = cur.series[Math.round(p * SAMPLES)];
  g.strokeStyle = L.head; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx, 2); g.lineTo(hx, H - 18); g.stroke(); g.lineWidth = 1;
  const vt = fmtNum(v), vw = g.measureText(vt).width + 10, ok = v >= cur.limit;
  const vy0 = Y(v) < gy0 + 22 ? Y(v) + 6 : Y(v) - 8;
  g.fillStyle = '#fff'; g.strokeStyle = ok ? '#BFE3D6' : '#E0B9A8'; roundRect(g, hx + 4, vy0, vw, 15, 3); g.fill(); g.stroke();
  g.fillStyle = ok ? L.ok : L.limit; g.fillText(vt, hx + 9, vy0 + 7.5);
  const tt = `${(p * DURATION).toFixed(1).replace('.', ',')} s · step ${Math.round(p * STEPS)}`;
  const tw = g.measureText(tt).width + 12, tx = Math.min(Math.max(hx - tw / 2, 2), W - tw - 2);
  g.fillStyle = '#fff'; g.strokeStyle = L.head; roundRect(g, tx, H - 17, tw, 15, 3); g.fill(); g.stroke();
  g.fillStyle = L.ink; g.fillText(tt, tx + 6, H - 9.5);
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

const clock = new THREE.Clock();
let phase = 0.15, sinceSwitch = 0;
const order = ['arm', 'scara', 'hexapod'];
const mid = new THREE.Vector3(), scr = new THREE.Vector3();

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!reduce) { phase = (phase + dt * 0.12) % 1; sinceSwitch += dt; }
  if (!userPicked && !reduce && sinceSwitch > 12) { sinceSwitch = 0; show(order[(order.indexOf(current.m.key) + 1) % order.length]); }

  const [a, b] = current.api.update(phase);
  const mm = a.distanceTo(b) * MM, okNow = mm >= current.limit, col = okNow ? C.ok : C.bad;
  dimMat.color.set(col); ends.material.color.set(col);
  dimGeom.setFromPoints([a, b]); endGeom.setFromPoints([a, b]);

  mid.copy(a).add(b).multiplyScalar(0.5); scr.copy(mid).project(camera);
  const x = (scr.x * 0.5 + 0.5) * host.clientWidth, y = (-scr.y * 0.5 + 0.5) * host.clientHeight;
  const px = Math.min(Math.max(x + 16, 8), host.clientWidth - 170);
  const laneTop = host.clientHeight - 12 - lane.clientHeight - 8;
  plaque.style.transform = `translate(${Math.round(px)}px, ${Math.round(Math.min(Math.max(y - 30, 44), laneTop - 66))}px)`;
  plaque.querySelector('.v').textContent = (mm >= 100 ? mm.toFixed(0) : mm.toFixed(1)).replace('.', ',') + ' mm';
  const verdict = plaque.querySelector('.verdict');
  verdict.textContent = okNow ? '✓ in limits' : '⚠ below limit';
  verdict.style.color = col; plaque.style.borderLeftColor = col;

  drawLane(phase);

  controls.update();
  renderer.render(scene, camera);
}
frame();
host.classList.add('ready');
