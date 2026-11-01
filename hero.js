// Hero scene: an ornithopter on a test stand (original design, not from any film).
// Flapping kinematics, stroboscope imprints of the wing beat, a wing-to-wing clearance
// dimension with limits, and a run timeline. Product palette (dp-ui tokens).
// Illustration of product concepts — not an aerodynamic simulation.
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const C = {
  body: 0xd8d5cb, bodyEdge: 0xc0bdb2, frame: 0xb4b2a9, dark: 0x4a4842,
  accent: 0x534ab7, past: 0x8a887f, ground: 0xefede7, grid: 0xd3d1c7,
  ok: '#0F6E56', bad: '#A32D2D',
};
let LIMIT_MM = 12;               // wing clearance limit, set from the beat below
const BODY_Y = 1.0;

const host = document.getElementById('hero3d');
const canvas = host.querySelector('canvas');
const plaque = host.querySelector('.plaque');
const head = host.querySelector('.tl-head');
const stepLabel = host.querySelector('.tl-step');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  host.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
camera.position.set(2.15, 1.45, 2.7);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.78, 0);
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.4;
controls.autoRotate = !reduce;
controls.autoRotateSpeed = 0.4;

scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d5cb, 1.15));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(2.5, 5, 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5 });
scene.add(sun);

const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 64),
  new THREE.ShadowMaterial({ opacity: 0.13 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(5, 40, C.grid, C.grid);
grid.material.transparent = true; grid.material.opacity = 0.28;
grid.position.y = 0.001;
scene.add(grid);

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, ...o });
const shade = m => { m.castShadow = true; m.receiveShadow = true; return m; };

// Test stand: base plate + mast holding the fuselage
const standMat = mat(C.frame);
const base = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.06, 48), standMat));
base.position.y = 0.03; scene.add(base);
const mast = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, BODY_Y - 0.12, 16), standMat));
mast.position.y = (BODY_Y - 0.12) / 2 + 0.06; scene.add(mast);

// Fuselage: elongated capsule with a cockpit and a tail
const ship = new THREE.Group();
ship.position.y = BODY_Y;
scene.add(ship);
const hull = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.9, 8, 24), mat(C.body)));
hull.rotation.z = Math.PI / 2; ship.add(hull);
const cockpit = shade(new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.dark, { roughness: 0.2, metalness: 0.3 })));
cockpit.position.set(0.5, 0.03, 0); cockpit.rotation.z = -0.35; ship.add(cockpit);
const tail = shade(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 20), mat(C.bodyEdge)));
tail.rotation.z = Math.PI / 2; tail.position.set(-0.78, 0.02, 0); ship.add(tail);
const fin = shade(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.012), mat(C.bodyEdge)));
fin.position.set(-0.9, 0.1, 0); ship.add(fin);

// Wing shape: long rounded blade with a few ribs (dragonfly-like)
function wingGeometry(len, chord) {
  const s = new THREE.Shape();
  s.moveTo(0, -chord * 0.35);
  s.bezierCurveTo(len * 0.35, -chord * 0.6, len * 0.85, -chord * 0.45, len, 0);
  s.bezierCurveTo(len * 0.85, chord * 0.45, len * 0.35, chord * 0.55, 0, chord * 0.35);
  s.closePath();
  const g = new THREE.ShapeGeometry(s, 24);
  g.rotateX(-Math.PI / 2);        // lie in the XZ plane, span along +X
  g.rotateY(-Math.PI / 2);        // span along -Z (to the side)
  return g;
}
const WING_LEN = 0.95, WING_CHORD = 0.2;
const wingGeo = wingGeometry(WING_LEN, WING_CHORD);
const ribsGeo = (() => {
  const p = [];
  for (let i = 1; i <= 6; i++) {
    const z = -WING_LEN * i / 7, c = WING_CHORD * 0.32 * (1 - i / 9);
    p.push(new THREE.Vector3(-c, 0, z), new THREE.Vector3(c, 0, z));
  }
  p.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -WING_LEN));
  return new THREE.BufferGeometry().setFromPoints(p);
})();

// Four wings: front/rear pair, left/right. Each wing hinges at the hull side.
const WINGS = [
  { x: 0.22, side: 1, phase: 0 }, { x: 0.22, side: -1, phase: 0 },
  { x: -0.18, side: 1, phase: 0.18 }, { x: -0.18, side: -1, phase: 0.18 },
];
function makeWing(material, ribMat) {
  const pivot = new THREE.Group();
  const blade = new THREE.Mesh(wingGeo, material);
  blade.castShadow = true;
  pivot.add(blade);
  if (ribMat) pivot.add(new THREE.LineSegments(ribsGeo, ribMat));
  return pivot;
}
const flap = (phase) => 0.62 * Math.sin(phase * Math.PI * 2);   // stroke angle, rad

const liveWingMat = mat(0xcfccc2, { transparent: true, opacity: 0.92, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.15 });
const ribMat = new THREE.LineBasicMaterial({ color: C.accent });
const live = WINGS.map(w => {
  const p = makeWing(liveWingMat, ribMat);
  p.position.set(w.x, 0.08, 0.1 * w.side);
  p.scale.z = w.side;
  ship.add(p);
  const hinge = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 16), mat(C.accent, { roughness: 0.35 })));
  hinge.rotation.z = Math.PI / 2; hinge.position.copy(p.position); ship.add(hinge);
  return { pivot: p, w };
});
function setWing(pivot, w, phase) { pivot.rotation.x = w.side * flap(phase + w.phase); }

// Stroboscope: imprints of the right front + rear wings over half a beat, past -> accent
const IMPRINTS = 8;
const pastCol = new THREE.Color(C.past), nowCol = new THREE.Color(C.accent);
for (let i = 0; i < IMPRINTS; i++) {
  const t = i / (IMPRINTS - 1);
  const m = new THREE.MeshBasicMaterial({ color: pastCol.clone().lerp(nowCol, t), transparent: true, opacity: 0.08 + 0.22 * t, side: THREE.DoubleSide, depthWrite: false });
  [WINGS[0], WINGS[2]].forEach(w => {
    const g = makeWing(m, null);
    g.position.set(w.x, 0.08, 0.1 * w.side);
    setWing(g, w, 0.25 + 0.5 * t - w.phase);
    ship.add(g);
  });
}

// Wing-tip trajectory of the right front wing
const tipLocal = new THREE.Vector3(0, 0, -WING_LEN);
const trajPts = [];
for (let i = 0; i <= 64; i++) {
  const a = flap(i / 64);
  trajPts.push(new THREE.Vector3(WINGS[0].x, 0.08 + Math.sin(a) * WING_LEN, 0.1 + Math.cos(a) * WING_LEN).add(ship.position));
}
const traj = new THREE.Line(new THREE.BufferGeometry().setFromPoints(trajPts),
  new THREE.LineDashedMaterial({ color: C.accent, dashSize: 0.03, gapSize: 0.025, transparent: true, opacity: 0.5 }));
traj.computeLineDistances();
scene.add(traj);

// Clearance dimension between right front and right rear wing trailing/leading edges (mid-span)
const dimMat = new THREE.LineBasicMaterial({ color: 0x0f6e56 });
const dimGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
scene.add(new THREE.Line(dimGeom, dimMat));
const tickGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
scene.add(new THREE.LineSegments(tickGeom, dimMat));

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 1 ? 50 : 34;     // narrow screens: step back so the wings fit
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);
resize();

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);

const clock = new THREE.Clock();
let phase = 0.1;
const a = new THREE.Vector3(), b = new THREE.Vector3(), mid = new THREE.Vector3(), scr = new THREE.Vector3();
const frontEdge = new THREE.Vector3(-WING_CHORD * 0.28, 0, -WING_LEN * 0.55);  // trailing edge of front wing
const rearEdge = new THREE.Vector3(WING_CHORD * 0.28, 0, -WING_LEN * 0.55);    // leading edge of rear wing

// Calibrate the limit so the verdict turns red on part of the beat (the illustration should show both states)
{
  let lo = Infinity, hi = 0;
  for (let i = 0; i < 120; i++) {
    live.forEach(({ pivot, w }) => setWing(pivot, w, i / 120));
    ship.updateMatrixWorld(true);
    a.copy(frontEdge).applyMatrix4(live[0].pivot.matrixWorld);
    b.copy(rearEdge).applyMatrix4(live[2].pivot.matrixWorld);
    const mm = a.distanceTo(b) * 1000 * 0.12;
    lo = Math.min(lo, mm); hi = Math.max(hi, mm);
  }
  LIMIT_MM = lo + (hi - lo) * 0.3;
  plaque.dataset.limit = LIMIT_MM.toFixed(1);
}

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!reduce) phase = (phase + dt * 0.35) % 1;
  live.forEach(({ pivot, w }) => setWing(pivot, w, phase));
  ship.updateMatrixWorld(true);

  a.copy(frontEdge).applyMatrix4(live[0].pivot.matrixWorld);
  b.copy(rearEdge).applyMatrix4(live[2].pivot.matrixWorld);
  const gapM = Math.max(0, a.distanceTo(b));
  const mm = gapM * 1000 * 0.12;                 // illustrative scale
  const okNow = mm >= LIMIT_MM;
  const col = okNow ? C.ok : C.bad;
  dimMat.color.set(col);
  dimGeom.setFromPoints([a, b]);
  const n = new THREE.Vector3(0, 0.03, 0);
  tickGeom.setFromPoints([a.clone().sub(n), a.clone().add(n), b.clone().sub(n), b.clone().add(n)]);

  mid.copy(a).add(b).multiplyScalar(0.5);
  scr.copy(mid).project(camera);
  const x = (scr.x * 0.5 + 0.5) * host.clientWidth, y = (-scr.y * 0.5 + 0.5) * host.clientHeight;
  plaque.style.transform = `translate(${Math.round(x + 16)}px, ${Math.round(y - 28)}px)`;
  plaque.querySelector('.v').textContent = mm.toFixed(1).replace('.', ',') + ' mm';
  const verdict = plaque.querySelector('.verdict');
  verdict.textContent = okNow ? '✓ in limits' : '⚠ below limit';
  verdict.style.color = col;
  plaque.style.borderLeftColor = col;

  head.style.left = (phase * 100).toFixed(2) + '%';
  stepLabel.textContent = 'step ' + Math.round(3000 + phase * 1200);

  controls.update();
  renderer.render(scene, camera);
}
frame();
host.classList.add('ready');
