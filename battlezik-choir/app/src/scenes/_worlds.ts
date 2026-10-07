// The film's places: the ruined hall (Dawn to Gathering), the road (March), the arena (Battle to Glory)
// and the open sky (the emblem). Each is one Stage; the light of a place changes by swapping its Look.
import * as THREE from 'three';
import { mulberry32 } from '../engine/util';
import { Stage, V, toon, mesh, rbox, ball, spike, foliage, puff, softDot, shadows, NO_INK, type Look } from './_toon';
import { makeKnight, makeDragon, makeShield, KP, type Knight, type Dragon } from './_cast';

const lens = { ink: '#c9a0e6', inkStrength: 0.95, focus: 10, aperture: 140, maxBlur: 26, farBlur: 3.5 };
export const LOOKS = {
  dawn: { zenith: '#5d86e0', horizon: '#ffd9bd', ground: '#c9b8d8', sunDir: V(0.72, 0.24, -0.62), sunColor: '#ffd3a0', sunIntensity: 3.3, sunDisc: 8,
    skyFill: '#8f9ef5', groundFill: '#d9b08c', fill: 1.6, cloudLit: '#fff0e0', cloudShade: '#a59be0', cloud: 0.12, fog: '#f0d8cc', fogNear: 50, fogFar: 420, ...lens } as Look,
  storm: { zenith: '#39446e', horizon: '#8e9ab8', ground: '#5d6680', sunDir: V(-0.5, 0.5, 0.5), sunColor: '#c7d0e8', sunIntensity: 2.1, sunDisc: 0,
    skyFill: '#7f8cc8', groundFill: '#6f7890', fill: 1.75, cloudLit: '#a9b3cf', cloudShade: '#4d587c', cloud: 0.8, fog: '#8e9ab8', fogNear: 40, fogFar: 300, ...lens } as Look,
  day: { zenith: '#2a6ee0', horizon: '#dff0fb', ground: '#9cc3e6', sunDir: V(-0.6, 0.55, 0.45), sunColor: '#fff1d4', sunIntensity: 3.4, sunDisc: 0,
    skyFill: '#8fa4ff', groundFill: '#e0c69a', fill: 1.95, cloudLit: '#ffffff', cloudShade: '#8d9fe2', cloud: 0.16, fog: '#d3e6f6', fogNear: 60, fogFar: 520, ...lens } as Look,
  sunset: { zenith: '#3a3fa8', horizon: '#ffbb74', ground: '#d99a6a', sunDir: V(0.74, 0.3, -0.6), sunColor: '#ffc487', sunIntensity: 3.6, sunDisc: 10,
    skyFill: '#8580f0', groundFill: '#d4895c', fill: 1.7, cloudLit: '#ffe0b8', cloudShade: '#9076cf', cloud: 0.34, fog: '#f3c39c', fogNear: 70, fogFar: 520, ...lens, ink: '#d6a0d0' } as Look,
  dusk: { zenith: '#101030', horizon: '#3b3470', ground: '#1a1830', sunDir: V(0.74, 0.3, -0.6), sunColor: '#8f8fd8', sunIntensity: 1.5, sunDisc: 0,
    skyFill: '#3f4494', groundFill: '#2a2444', fill: 1.15, cloudLit: '#565aa6', cloudShade: '#23234f', cloud: 0.3, fog: '#22204a', fogNear: 40, fogFar: 300, ...lens, ink: '#9a80d0' } as Look,
  glory: { zenith: '#3554c8', horizon: '#ffd27a', ground: '#e0a060', sunDir: V(0.6, 0.34, -0.72), sunColor: '#ffd9a0', sunIntensity: 4.0, sunDisc: 14,
    skyFill: '#93a0ff', groundFill: '#e0a070', fill: 1.9, cloudLit: '#fff0c8', cloudShade: '#a886d8', cloud: 0.36, fog: '#ffd9a8', fogNear: 80, fogFar: 520, ...lens, ink: '#d6a0d0' } as Look,
};

const stoneMat = (c: number, scale = 1.1, amt = 0.7) => toon(c, { detail: 'stone', detailAmount: amt, detailScale: scale });
const leafMat = (c: number) => toon(c, { detail: 'leaf', detailAmount: 0.7, detailScale: 0.9 });
const WOOD = () => toon(0x8a5a36);

/** Far country shared by the outdoor places: hills, a wood, blue mountains. */
function country(sc: THREE.Scene, rnd: () => number, y0: number, green = true, station = false) {
  const hill = green ? [toon(0x86c85a), toon(0x74b85a), toon(0x8fcf74)] : [toon(0x7f8f86), toon(0x6f8078), toon(0x8c9a8e)];
  for (let i = 0; i < 14; i++) { const a = -3 + i * 0.46, r = station ? 105 + rnd() * 50 : 130 + rnd() * 90, s = station ? 28 + rnd() * 24 : 40 + rnd() * 40; sc.add(mesh(ball(1, 24, 12), hill[i % 3]!, V(Math.sin(a) * r, -s * 0.62 + y0, -Math.cos(a) * r), undefined, V(s * 1.6, s, s * 1.2))); }
  if (station) return;
  for (let i = 0; i < 26; i++) {
    const a = -3.1 + i * 0.24 + (rnd() - 0.5) * 0.1, r = 560 + rnd() * 120, h = 50 + rnd() * 70;
    sc.add(mesh(new THREE.ConeGeometry(h * (1.3 + rnd() * 0.6), h, 6), toon(green ? 0x86a6e6 : 0x7f8cb8, { flat: true }), V(Math.sin(a) * r, h / 2 - 20 + y0, -Math.cos(a) * r), [0, rnd() * 3, 0]));
  }
}
function flames(n: number, s: number) {
  const g = new THREE.Group(), m = [0xff5a1e, 0xffa02a, 0xffe07a].map((c, i) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5 + i), fog: false }));
  for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { const c = mesh(new THREE.ConeGeometry(0.22 * s * (1 - j * 0.28), 0.9 * s * (1 - j * 0.2), 8), m[j]!, V(Math.cos(i * 2.4) * 0.16 * s, 0.45 * s, Math.sin(i * 2.4) * 0.16 * s)); c.userData = { i, j, h: 0.45 * s }; g.add(c); }
  return g;
}
/** Make a fire's tongues lick: k is how high it burns (0..1+). */
export function flicker(g: THREE.Group, t: number, k: number) {
  for (const c of g.children) {
    const { i, j, h } = c.userData as { i: number; j: number; h: number };
    const s = Math.max(0.02, k * (0.75 + 0.35 * Math.sin(t * 9 + i * 2.1 + j) * Math.sin(t * 5.3 + i)));
    c.scale.set(0.8 + 0.2 * s, s, 0.8 + 0.2 * s); c.position.y = h * s; c.rotation.z = 0.25 * Math.sin(t * 7 + i * 1.3);
  }
}

// ================================================================== the ruined hall
export interface Hall { stage: Stage; knight: Knight; fire: THREE.Group; fireLight: THREE.PointLight; ember: THREE.Mesh; leanShield: THREE.Group; door: THREE.Mesh }
export function buildHall(): Hall {
  const S = new Stage(LOOKS.dawn), sc = S.scene, rnd = mulberry32(3);
  const st = [stoneMat(0xd9cdb8), stoneMat(0xcbbfac), stoneMat(0xe3d8c4), stoneMat(0xbfb4a4)];
  sc.add(mesh(new THREE.CircleGeometry(900, 48), toon(0x86c85a, { detail: 'grass', detailAmount: 1, detailScale: 0.7 }), V(0, -0.3, 0), [-Math.PI / 2, 0, 0]));
  for (let ix = -6; ix <= 6; ix++) for (let iz = -5; iz <= 7; iz++) {
    if (rnd() < 0.06) continue;
    const h = 0.2 + rnd() * 0.06;
    sc.add(mesh(rbox(1.46, h, 1.46, 0.04, 2), st[Math.floor(rnd() * 4)]!, V(ix * 1.5, h / 2 - 0.12, iz * 1.5), [0, (rnd() - 0.5) * 0.03, 0]));
  }
  // back wall: piers with tall openings between them, a lintel broken in the middle; a stub of side wall
  for (const [x, h] of [[-9, 8], [-5.4, 9.5], [-1.8, 9.5], [1.8, 7.2], [5.4, 9.5], [9, 6]] as const) {
    sc.add(mesh(rbox(1.5, h, 1.5, 0.08, 2), st[1]!, V(x, h / 2, -7)));
    sc.add(mesh(rbox(1.9, 0.5, 1.9, 0.08, 2), st[2]!, V(x, 0.25, -7)));
  }
  sc.add(mesh(rbox(9.2, 1.3, 1.6, 0.08, 2), st[0]!, V(-5.4, 10.1, -7)), mesh(rbox(3.6, 1.3, 1.6, 0.08, 2), st[0]!, V(5.6, 10.1, -7), [0, 0, -0.03]));
  sc.add(mesh(rbox(1.5, 5, 9, 0.08, 2), st[3]!, V(-9.6, 2.5, -2.4)), mesh(rbox(1.5, 2.2, 5, 0.08, 2), st[1]!, V(9.6, 1.1, -3.8)));
  const door = mesh(new THREE.PlaneGeometry(2.1, 8.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d8).multiplyScalar(1.6), fog: false, transparent: true, opacity: 0 }), V(0, 4.3, -7.2));
  door.layers.set(NO_INK); sc.add(door);
  // fallen drums and rubble
  sc.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.6, 14), st[2]!, V(-4.6, 0.62, 1.4), [Math.PI / 2, 0, 0.7]), mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.1, 14), st[0]!, V(-6.2, 0.55, -1.6)));
  for (let i = 0; i < 14; i++) sc.add(mesh(rbox(0.3 + rnd() * 0.7, 0.25 + rnd() * 0.4, 0.3 + rnd() * 0.6, 0.07), st[i % 4]!, V(-8 + rnd() * 16, 0.2, -5.6 + rnd() * 1.6), [rnd(), rnd() * 3, rnd()]));
  // ivy on the wall, a tree beyond it
  for (let i = 0; i < 9; i++) { const f = foliage(0.7 + rnd() * 0.6, leafMat([0x5fb244, 0x4f9f40][i % 2]!), i + 20); f.position.set([-5.4, 5.4, -9][i % 3]! + (rnd() - 0.5), 2 + rnd() * 6, -6.2); f.scale.z = 0.35; sc.add(f); }
  for (let i = 0; i < 5; i++) { const x = -16 + i * 8 + rnd() * 3, z = -14 - rnd() * 8; sc.add(mesh(new THREE.CylinderGeometry(0.4, 0.55, 6, 8), WOOD(), V(x, 3, z))); for (let j = 0; j < 3; j++) { const f = foliage(2.6 + rnd(), leafMat([0x5fb244, 0x74c452, 0x4f9f40][(i + j) % 3]!), i * 3 + j); f.position.set(x + (rnd() - 0.5) * 3, 6.5 + rnd() * 2, z + (rnd() - 0.5) * 2); sc.add(f); } }
  country(sc, rnd, -4);
  // the seat, the fire, the blank shield against a broken pier
  sc.add(mesh(rbox(1.3, 0.78, 1.0, 0.1, 2), st[3]!, V(0, 0.36, -0.42)));
  const fx = 1.5, fz = 1.5;
  for (let i = 0; i < 9; i++) sc.add(mesh(ball(0.17, 10, 8), st[i % 4]!, V(fx + Math.cos(i * 0.7) * 0.6, 0.12, fz + Math.sin(i * 0.7) * 0.6), undefined, V(1, 0.7, 1)));
  for (let i = 0; i < 4; i++) sc.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 8), toon(0x5a3a26), V(fx, 0.16, fz), [Math.PI / 2, 0, i * 0.8]));
  const fire = flames(4, 1); fire.position.set(fx, 0.12, fz); fire.traverse((c) => c.layers.set(0)); sc.add(fire);
  const ember = mesh(ball(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5fd0ff).multiplyScalar(3), fog: false }), V(fx - 0.18, 0.16, fz + 0.2));
  sc.add(ember);
  const fireLight = new THREE.PointLight(0xffa050, 14, 11, 1.6); fireLight.position.set(fx, 0.9, fz); sc.add(fireLight);
  sc.add(mesh(rbox(1.3, 1.5, 1.3, 0.08, 2), st[1]!, V(3.5, 0.75, -0.6), [0, 0.3, 0]));
  const leanShield = makeShield(); leanShield.scale.setScalar(1.22); leanShield.position.set(3.35, 0.98, 0.22); leanShield.rotation.set(-0.3, 0.3, 0.05); sc.add(leanShield);
  const knight = makeKnight(); knight.set(KP.sit); knight.shield.visible = false; sc.add(knight.root);
  shadows(sc); fire.traverse((c) => { c.castShadow = false; });
  S.aimSun(V(0, 2, 0), 18);
  return { stage: S, knight, fire, fireLight, ember, leanShield, door };
}

// ================================================================== the road
export const STN = 320; // stations of the road stand this far apart along x, out of sight of each other
export interface Road { stage: Stage; knight: Knight; wheel: THREE.Mesh; sparks: THREE.Points; doors: THREE.Group[]; gateGlow: THREE.Mesh; grindBlade: THREE.Group }
export function buildRoad(): Road {
  const S = new Stage(LOOKS.storm), sc = S.scene, rnd = mulberry32(11);
  const rock = [stoneMat(0x9aa0a8, 0.5), stoneMat(0x8a9098, 0.5), stoneMat(0xa9aeb4, 0.5)], pave = [stoneMat(0xc9c2b0), stoneMat(0xbdb6a4), stoneMat(0xd4cdbb)];
  const steelOld = toon(0x9aa6ba, { spec: 0.7, shine: 30, detail: 'metal', detailAmount: 0.8, detailScale: 2 });
  sc.add(mesh(new THREE.CircleGeometry(2600, 64), toon(0x7d9a6a, { detail: 'grass', detailAmount: 1, detailScale: 0.5 }), V(STN * 2.5, -0.2, 0), [-Math.PI / 2, 0, 0]));
  const at = (i: number) => i * STN;
  for (let s = 0; s < 6; s++) {                                        // each station gets its own distant country
    const g = new THREE.Scene(); country(g, rnd, s === 0 ? -30 : -6, s >= 4, true);
    while (g.children.length) { const c = g.children[0]!; c.position.x += at(s); sc.add(c); }
  }
  for (let i = 0; i < 40; i++) {                                       // mountains round the whole road
    const a = (i / 40) * Math.PI * 2 + rnd() * 0.1, r = 1750 + rnd() * 250, h = 220 + rnd() * 240;
    sc.add(mesh(new THREE.ConeGeometry(h * (1.2 + rnd() * 0.6), h, 6), toon(0x7f8cb8, { flat: true, fog: false }), V(STN * 2.5 + Math.sin(a) * r, h / 2 - 40, -Math.cos(a) * r), [0, rnd() * 3, 0]));
  }
  // 0. the ridge: a paved way along a crest, the mountain and its arena far ahead
  sc.add(mesh(ball(1, 32, 16), rock[0]!, V(0, -17.6, -2), undefined, V(70, 18, 16)));
  for (let i = -24; i <= 24; i++) sc.add(mesh(rbox(1.5, 0.3, 2.6 + rnd() * 0.3, 0.05, 2), pave[(i + 24) % 3]!, V(i * 1.56, 0.26 - 0.0009 * i * i * 1.56, 0), [0, (rnd() - 0.5) * 0.06, 0]));
  for (let i = 0; i < 16; i++) sc.add(mesh(ball(0.6 + rnd() * 1.2, 10, 8), rock[i % 3]!, V(-30 + rnd() * 60, 0.1, (rnd() < 0.5 ? -1 : 1) * (2.4 + rnd() * 3)), undefined, V(1, 0.7, 1)));
  sc.add(mesh(new THREE.ConeGeometry(70, 110, 7), rock[1]!, V(46, 30, -230)), mesh(new THREE.CylinderGeometry(20, 22, 12, 20, 1, true), stoneMat(0xe8d8bc, 0.2), V(46, 90, -230)));
  // 1. the old battlefield: broken swords and shields standing in the ground
  for (let i = 0; i < 46; i++) {
    const x = at(1) - 24 + rnd() * 48, z = -9 + rnd() * 7.5 - (rnd() < 0.25 ? -12 : 0), h = 0.8 + rnd() * 1.1, g = new THREE.Group();
    g.add(mesh(rbox(0.16, h, 0.035, 0.012), steelOld, V(0, h / 2, 0)), mesh(rbox(0.5, 0.07, 0.09, 0.03), toon(0x5a6274), V(0, h, 0)));
    if (rnd() < 0.6) g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), toon(0x6a4a34), V(0, h + 0.18, 0)));
    g.position.set(x, 0, z); g.rotation.set((rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5); sc.add(g);
  }
  for (let i = 0; i < 9; i++) { const sh = makeShield(); sh.position.set(at(1) - 20 + rnd() * 40, 0.4, -8 + rnd() * 6); sh.rotation.set(-0.6 - rnd() * 0.6, rnd() * 3, rnd() - 0.5); sc.add(sh); }
  for (let i = -20; i <= 20; i++) sc.add(mesh(rbox(1.5, 0.26, 2.4, 0.05, 2), pave[(i + 20) % 3]!, V(at(1) + i * 1.56, 0.02, 0)));
  // 2. the grindstone
  const gx = at(2);
  sc.add(mesh(rbox(0.3, 1.5, 0.3, 0.04), WOOD(), V(gx - 0.6, 0.75, 0)), mesh(rbox(0.3, 1.5, 0.3, 0.04), WOOD(), V(gx + 0.6, 0.75, 0)), mesh(rbox(2.2, 0.25, 1.4, 0.04), WOOD(), V(gx, 0.1, 0)));
  const wheel = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.34, 28), stoneMat(0xb8b2a6, 2.2, 1), V(gx, 1.5, 0), [0, 0, Math.PI / 2]);
  sc.add(wheel, mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 10), toon(0x5a6274), V(gx, 1.5, 0), [0, 0, Math.PI / 2]));
  const grindBlade = new THREE.Group();
  grindBlade.add(mesh(rbox(0.2, 1.9, 0.04, 0.014), toon(0xe2e9f4, { spec: 1, shine: 60 }), V(0, 0.95, 0)), mesh(rbox(0.016, 1.2, 0.07, 0.007), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5fd0ff).multiplyScalar(2.4), fog: false }), V(0, 0.9, 0)));
  grindBlade.position.set(gx, 2.42, 0.5); grindBlade.rotation.set(1.2, 0, 0.5); sc.add(grindBlade);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(120 * 3), 3));
  const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ map: softDot(), color: new THREE.Color(0x7fdcff).multiplyScalar(4), size: 0.09, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sparks.layers.set(NO_INK); sparks.frustumCulled = false; sc.add(sparks);
  // 3. the avenue of champions: colossal stone knights either side of the way, one clawed in half
  const statueMat = stoneMat(0xdedad2, 0.2, 0.9);
  for (let i = 0; i < 6; i++) {
    const k = makeKnight(); k.set(KP.stand); k.aura.visible = false; k.bladeLight.intensity = 0;
    k.root.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) m.material = statueMat; });
    const side = i % 2 ? 1 : -1, z = -6 - Math.floor(i / 2) * 15;
    const g = new THREE.Group(); g.add(k.root); g.scale.setScalar(6.5); g.position.set(at(3) + side * 13, 2, z); g.rotation.y = -side * 0.5;
    if (i === 3) { g.scale.y = 3.0; g.rotation.z = 0.1; }
    sc.add(g, mesh(rbox(9, 2.2, 9, 0.2, 2), pave[i % 3]!, V(at(3) + side * 13, 1, z)));
  }
  for (let i = -3; i <= 34; i++) sc.add(mesh(rbox(3.2, 0.26, 1.5, 0.05, 2), pave[(i + 3) % 3]!, V(at(3), 0.02, 6 - i * 1.56)));
  // 4. the summit: the arena ahead under a break in the cloud
  const wallM = [stoneMat(0xf0d6b4, 0.25, 0.6), stoneMat(0xe6c8a2, 0.25, 0.6)];
  const ring = (cx: number, cz: number, R: number, y0: number, gap: number) => {
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2; if (Math.abs(a - Math.PI) < gap) continue;
      const x = cx + Math.sin(a) * R, z = cz - Math.cos(a) * R, tiers = rnd() < 0.2 ? 1 : rnd() < 0.3 ? 3 : 2;
      for (let j = 0; j < tiers; j++) { sc.add(mesh(rbox(3.2, 8.6, 4.4, 0.2, 1), wallM[(i + j) % 2]!, V(x, y0 + 4.3 + j * 10.4, z), [0, -a, 0]), mesh(rbox(10.2, 1.8, 4.8, 0.2, 1), wallM[(i + j + 1) % 2]!, V(x, y0 + 9.5 + j * 10.4, z), [0, -a, 0])); }
    }
  };
  sc.add(mesh(ball(1, 32, 16), toon(0x86c85a), V(at(4), -30, -110), undefined, V(140, 44, 90)));
  ring(at(4), -120, 46, 12, 0);
  for (let i = 0; i <= 40; i++) sc.add(mesh(rbox(3.2, 0.26, 1.5, 0.05, 2), pave[i % 3]!, V(at(4) + Math.sin(i * 0.12) * 3, 0.02 + i * 0.28, 8 - i * 1.56)));
  for (let i = 0; i < 12; i++) { const f = foliage(1.6 + rnd() * 1.6, leafMat([0x5fb244, 0x74c452][i % 2]!), i + 50); f.position.set(at(4) + (i % 2 ? 1 : -1) * (5 + rnd() * 9), 1 + i * 0.3, 4 - i * 4); sc.add(f); }
  // 5. the stair and the gate
  const ox = at(5);
  for (let i = 0; i < 16; i++) sc.add(mesh(rbox(9, 0.5, 1.5, 0.05, 2), pave[i % 3]!, V(ox, 0.25 + i * 0.5, -i * 1.4)));
  sc.add(mesh(rbox(9, 0.5, 8, 0.05, 2), pave[0]!, V(ox, 7.75, -25)));
  for (const s of [-1, 1]) { sc.add(mesh(rbox(9, 26, 6, 0.3, 2), wallM[0]!, V(ox + s * 9.2, 13, -30)), mesh(rbox(3, 30, 7, 0.3, 2), wallM[1]!, V(ox + s * 5.6, 15, -30))); }
  sc.add(mesh(rbox(30, 8, 6, 0.3, 2), wallM[1]!, V(ox, 26, -30)));
  const doors: THREE.Group[] = [];
  for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(ox + s * 4.1, 8, -28.6); g.add(mesh(rbox(4.1, 14, 0.6, 0.1, 2), toon(0x8a5a36, { detail: 'cloth', detailAmount: 1, detailScale: 0.5 }), V(-s * 2.05, 7, 0))); for (let j = 0; j < 3; j++) g.add(mesh(rbox(4.2, 0.4, 0.75, 0.05), toon(0x5a6274, { spec: 0.6 }), V(-s * 2.05, 2 + j * 5, 0))); sc.add(g); doors.push(g); }
  const gateGlow = mesh(new THREE.PlaneGeometry(8.4, 14.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4dc).multiplyScalar(3), fog: false }), V(ox, 15, -29.6));
  gateGlow.layers.set(NO_INK); sc.add(gateGlow);
  const knight = makeKnight(); knight.set(KP.stand); sc.add(knight.root);
  shadows(sc);
  return { stage: S, knight, wheel, sparks, doors, gateGlow, grindBlade };
}

// ================================================================== the arena
export interface Arena { stage: Stage; knight: Knight; dragon: Dragon; lostShield: THREE.Group; lostSword: THREE.Group; dust: THREE.Sprite[]; pillar: THREE.Group; wedge: THREE.Mesh; crestShield: THREE.Mesh }
export function buildArena(): Arena {
  const S = new Stage(LOOKS.sunset), sc = S.scene, rnd = mulberry32(21);
  sc.add(mesh(new THREE.CircleGeometry(700, 64), toon(0xedc998, { detail: 'stone', detailAmount: 0.5, detailScale: 0.5 }), V(0, 0, 0), [-Math.PI / 2, 0, 0]));
  const wall = [stoneMat(0xf0d6b4, 0.25, 0.6), stoneMat(0xe6c8a2, 0.25, 0.6)], flag = [toon(0xd8423c, { side: THREE.DoubleSide }), toon(0x2f4dc0, { side: THREE.DoubleSide })];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, R = 70, x = Math.sin(a) * R, z = -8 - Math.cos(a) * R, tiers = rnd() < 0.18 ? 1 : rnd() < 0.35 ? 3 : 2;
    for (let j = 0; j < tiers; j++) { sc.add(mesh(rbox(3.2, 8.6, 4.4, 0.2, 1), wall[(i + j) % 2]!, V(x, 4.3 + j * 10.4, z), [0, -a, 0]), mesh(rbox(10.2, 1.8, 4.8, 0.2, 1), wall[(i + j + 1) % 2]!, V(x, 9.5 + j * 10.4, z), [0, -a, 0])); }
    if (i % 4 === 1) { const top = tiers * 10.4 + 5; sc.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 8, 6), WOOD(), V(x, top, z)), mesh(new THREE.PlaneGeometry(4.5, 2.6), flag[(i >> 2) % 2]!, V(x + 2.3, top + 2.4, z), [0, -a, 0])); }
  }
  for (let i = 0; i < 22; i++) sc.add(mesh(rbox(0.5 + rnd() * 1.6, 0.3 + rnd() * 0.9, 0.5 + rnd() * 1.3, 0.1), wall[i % 2]!, V((rnd() - 0.5) * 70, 0.25, -30 + rnd() * 62), [rnd(), rnd() * 3, rnd()]));
  const dragon = makeDragon(); dragon.root.scale.setScalar(1.6); sc.add(dragon.root);
  const knight = makeKnight(); sc.add(knight.root);
  // what the dragon knocks away
  const lostShield = makeShield(); lostShield.scale.setScalar(1.22); lostShield.visible = false; sc.add(lostShield);
  const lostSword = new THREE.Group();
  lostSword.add(mesh(rbox(0.2, 1.5, 0.04, 0.014), toon(0xe2e9f4, { spec: 1, shine: 60 }), V(0, -0.95, 0)), mesh(rbox(0.74, 0.09, 0.12, 0.04), toon(0x64749a), V(0, -0.16, 0)), mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 10), toon(0x7a4f34), V(0, 0.02, 0)));
  lostSword.visible = false; sc.add(lostSword);
  const crestShield = mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5fd0ff).multiplyScalar(2.2), fog: false }), V(0, -0.02, 0.11));
  crestShield.visible = false; knight.shield.add(crestShield);
  shadows(sc);
  const dust: THREE.Sprite[] = [];
  for (let i = 0; i < 26; i++) { const p = puff(0xf3d9b4, 0, 4, V(0, -10, 0)); sc.add(p); dust.push(p); }
  // the pillar of light, and the wedge that parts the dragon's fire
  const pillar = new THREE.Group();
  pillar.add(mesh(new THREE.CylinderGeometry(0.55, 0.3, 400, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfefff).multiplyScalar(3), fog: false, side: THREE.DoubleSide }), V(0, 200, 0)));
  pillar.add(mesh(new THREE.CylinderGeometry(2.0, 0.9, 400, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3f9dff).multiplyScalar(1.4), fog: false, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), V(0, 200, 0)));
  pillar.traverse((c) => c.layers.set(NO_INK)); pillar.visible = false; sc.add(pillar);
  const wedge = mesh(new THREE.ConeGeometry(2.6, 9, 14, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fd6ff).multiplyScalar(2.4), fog: false, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  wedge.layers.set(NO_INK); wedge.visible = false; sc.add(wedge);
  S.aimSun(V(0, 8, 0), 46);
  return { stage: S, knight, dragon, lostShield, lostSword, dust, pillar, wedge, crestShield };
}

// ================================================================== the open sky
export interface Sky { stage: Stage; logo: THREE.Mesh; sword: THREE.Group; halo: THREE.Sprite }
export async function buildSky(): Promise<Sky> {
  const S = new Stage(LOOKS.glory), sc = S.scene;
  const tex = await new THREE.TextureLoader().loadAsync('brand/logo.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  const logo = mesh(new THREE.PlaneGeometry(7.9, 10), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }), V(0, 0, 0));
  logo.layers.set(NO_INK); sc.add(logo);
  const sword = new THREE.Group();
  sword.add(mesh(rbox(0.9, 7.4, 0.14, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdff4ff).multiplyScalar(1.6), fog: false }), V(0, 0.6, 0)));
  sword.add(mesh(new THREE.ConeGeometry(0.45, 1.4, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdff4ff).multiplyScalar(1.6), fog: false }), V(0, 5.0, 0), [0, Math.PI / 4, 0], V(1, 1, 0.16)));
  sword.add(mesh(rbox(3.2, 0.4, 0.5, 0.1), toon(0x64749a, { spec: 0.8 }), V(0, -3.3, 0)), mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 12), toon(0x7a4f34), V(0, -4.2, 0)), mesh(ball(0.36), toon(0xb2c2de, { spec: 1 }), V(0, -5.1, 0)));
  sc.add(sword);
  const halo = puff(0x6fd0ff, 0.7, 26, V(0, 0, -1), true); sc.add(halo);
  return { stage: S, logo, sword, halo };
}
void spike;
