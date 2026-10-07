// The cast, as puppets: the Knight and the Dragon built as jointed figures that take a pose.
// A pose is a flat set of numbers (joint angles in radians, root position); anything left out is 0.
// Poses are blended between keys, so every frame is a pure function of time.
import * as THREE from 'three';
import { V, toon, glow, mesh, rbox, ball, warp, limb, spike, fan, scallop, shadows, NO_INK } from './_toon';
import { clamp, ease, lerp } from '../engine/util';

export type Pose = Record<string, number>;
export type Key = [t: number, pose: Pose, easeFn?: (x: number) => number];
/** The pose at time t on a track of keys (each key's ease shapes the move arriving at it). */
export function poseAt(t: number, keys: Key[]): Pose {
  if (t <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i]!;
    if (t > b[0]) continue;
    const a = keys[i - 1]!, k = (b[2] ?? ease.inOutCubic)(clamp((t - a[0]) / Math.max(1e-4, b[0] - a[0])));
    return mix(a[1], b[1], k);
  }
  return keys[keys.length - 1]![1];
}
export function mix(a: Pose, b: Pose, k: number): Pose {
  const o: Pose = {};
  for (const n of new Set([...Object.keys(a), ...Object.keys(b)])) o[n] = lerp(a[n] ?? 0, b[n] ?? 0, k);
  return o;
}
export const add = (a: Pose, b: Pose): Pose => { const o = { ...a }; for (const n in b) o[n] = (o[n] ?? 0) + b[n]!; return o; };

// ================================================================== the Knight
/** Knight poses. Angles: a*x arm forward, a*z arm out, e* elbow bend, t* thigh forward, k* knee bend, sw* sword in the hand. */
export const KP = {
  stand: { aRz: 0.14, aLz: 0.16, aLx: 0.15, eL: 0.6, eR: 0.08 } as Pose,
  sit: { y: -0.78, tR: 1.45, tL: 1.5, kR: 1.45, kL: 1.4, torsoX: 0.42, headX: 0.38, aRx: 0.8, eR: 0.75, aLx: 0.85, eL: 0.7, aRz: 0.1, aLz: 0.1, swX: 1.1, swZ: 1.2 } as Pose,
  kneel: { y: -0.62, tR: 1.5, kR: 1.55, tL: -0.1, kL: 1.5, torsoX: 0.4, headX: 0.42, aRx: 0.75, eR: 0.5, aLx: 0.3, eL: 0.4, aLz: 0.2 } as Pose,
  lie: { y: 0.36, pitch: 1.5, aRx: 2.7, aRz: 0.5, eR: 0.5, aLx: 2.5, aLz: 0.6, eL: 0.6, headX: -0.2, tR: 0.1, tL: -0.1, kL: 0.3 } as Pose,
  guard: { y: -0.1, tR: -0.3, tL: 0.4, kR: 0.35, kL: 0.4, torsoX: 0.12, torsoY: 0.4, aLx: 1.05, eL: 0.95, aLz: -0.2, aRx: -0.35, aRz: 0.5, eR: 0.7, swX: 1.9 } as Pose,
  windup: { y: -0.05, tR: -0.35, tL: 0.45, kR: 0.3, kL: 0.4, torsoX: -0.15, torsoY: 0.6, aLx: 0.7, eL: 0.9, aRx: 2.75, aRz: 0.3, eR: 0.7, swX: 0.5 } as Pose,
  slash: { y: -0.2, tR: -0.5, tL: 0.75, kR: 0.4, kL: 0.75, torsoX: 0.45, torsoY: -0.5, aLx: 0.2, eL: 0.8, aLz: 0.4, aRx: 0.75, aRz: -0.3, eR: 0.1, swX: 0.2 } as Pose,
  raise: { aRx: 3.05, aRz: 0.05, eR: 0.04, aLx: 0.15, aLz: 0.3, eL: 0.5, torsoX: -0.1, headX: -0.35, tR: -0.1, tL: 0.12 } as Pose,
  brace: { y: -0.25, tR: -0.45, tL: 0.6, kR: 0.5, kL: 0.65, torsoX: 0.3, aRx: 1.5, eR: 0.15, aLx: 1.4, eL: 0.4, aLz: -0.3, headX: 0.1, swX: 1.3 } as Pose,
  thrown: { y: 0.6, pitch: -0.9, tR: 0.9, tL: 0.6, kR: 0.8, kL: 0.5, aRx: 1.8, aRz: 0.9, aLx: 1.6, aLz: 0.9, eR: 0.5, eL: 0.5, headX: 0.3 } as Pose,
  hold: { aRx: 1.25, eR: 0.9, aRz: 0.1, swX: 2.0, aLz: 0.16, aLx: 0.15, eL: 0.6 } as Pose,
};
/** A step of the walk: p is the phase in strides (one stride = two steps). */
export function walk(p: number, amp = 1): Pose {
  const s = Math.sin(p * Math.PI * 2), c = Math.cos(p * Math.PI * 2);
  return { tR: 0.55 * s * amp, tL: -0.55 * s * amp, kR: 0.7 * Math.max(0, -c) * amp + 0.08, kL: 0.7 * Math.max(0, c) * amp + 0.08, aRx: -0.35 * s * amp, aLx: 0.2 * s * amp + 0.15, eR: 0.25, eL: 0.6, aRz: 0.14, aLz: 0.16, y: -0.05 * Math.abs(c) * amp, torsoX: 0.1 * amp, torsoY: 0.1 * s * amp };
}

export interface Knight {
  root: THREE.Group; sword: THREE.Group; shield: THREE.Group; cape: THREE.Mesh; eyes: THREE.Mesh[]; helm: THREE.Group;
  /** Armour that is buckled on in Gathering (popped in one by one). */
  armour: THREE.Object3D[];
  blade: THREE.Mesh; aura: THREE.Group; bladeLight: THREE.PointLight;
  set(p: Pose): void;
  /** The thread of light in the blade: 0 dark, 1 the steady thread, 2+ ablaze. */
  power(k: number, t: number): void;
}

export function makeKnight(): Knight {
  const metal = (c: number, spec = 0.9) => toon(c, { spec, shine: 26, detail: 'metal', detailAmount: 0.55, detailScale: 2.2, rim: 0.5 });
  const steel = metal(0x8fa3c8), steelLight = metal(0xb2c2de, 1), steelDark = metal(0x64749a, 0.6);
  const cloth = toon(0x2f4dc0, { detail: 'cloth', detailAmount: 1, detailScale: 1.4, side: THREE.DoubleSide });
  const leather = toon(0x7a4f34), dark = toon(0x171a26);
  const blueMat = new THREE.MeshBasicMaterial({ color: 0x5fd0ff, fog: false });
  const G = (p: THREE.Vector3, parent: THREE.Object3D) => { const g = new THREE.Group(); g.position.copy(p); parent.add(g); return g; };
  const root = new THREE.Group();
  const hips = G(V(0, 1.7, 0), root);
  hips.add(mesh(new THREE.CylinderGeometry(0.46, 0.64, 0.7, 20, 1, true), cloth, V(0, -0.04, 0)));
  hips.add(mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.13, 18), leather, V(0, 0.3, 0)));
  hips.add(mesh(rbox(0.18, 0.18, 0.06, 0.03), steelLight, V(0, 0.3, 0.49)));
  const armour: THREE.Object3D[] = [];
  const legs: { thigh: THREE.Group; knee: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const thigh = G(V(s * 0.3, -0.02, 0), hips);
    thigh.add(limb(V(0, 0, 0), V(0.02 * s, -0.62, 0), 0.27, 0.215, steel));
    const knee = G(V(0.02 * s, -0.65, 0), thigh);
    knee.add(mesh(ball(0.21), steelLight, V(0, 0, 0.07), undefined, V(1, 0.9, 1.08)));
    knee.add(mesh(rbox(0.05, 0.2, 0.22, 0.02), steel, V(s * 0.21, 0, 0.02)));
    knee.add(limb(V(0, -0.04, 0), V(0, -0.83, 0), 0.215, 0.165, steel));
    knee.add(mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.07, 18), steelLight, V(0, -0.7, 0)));
    knee.add(mesh(warp(rbox(0.38, 0.24, 0.66, 0.1), (p) => { if (p.z > 0) { p.y *= 1 - 0.4 * (p.z / 0.33); p.x *= 1 - 0.25 * (p.z / 0.33); } }), steelDark, V(0, -0.92, 0.09)));
    legs.push({ thigh, knee });
    const tas = mesh(warp(rbox(0.44, 0.5, 0.1, 0.045), (p) => { p.z -= 0.5 * p.x * p.x; }), steelLight, V(s * 0.29, 0.02, 0.3), [0.12, s * 0.2, 0]);
    hips.add(tas); armour.push(tas);
  }
  const torso = G(V(0, 0.3, 0), hips);
  torso.add(mesh(new THREE.CylinderGeometry(0.46, 0.44, 0.16, 20), steelDark, V(0, 0.1, 0), undefined, V(1, 1, 0.78)));
  torso.add(mesh(warp(rbox(1.04, 0.92, 0.68, 0.22, 6), (p) => {
    const k = (p.y + 0.46) / 0.92; p.x *= 0.76 + 0.34 * k; p.z *= 0.86 + 0.2 * k;
    if (p.z > 0) p.z += 0.11 * (1 - Math.min(1, Math.abs(p.x) / 0.32)) * (0.4 + 0.6 * k);
  }), steel, V(0, 0.45, 0)));
  torso.add(mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.2, 18), steelDark, V(0, 0.93, 0)));
  // cape
  const cg = new THREE.PlaneGeometry(1.5, 2.5, 18, 26);
  warp(cg, (p) => {
    const u = p.x / 0.75, k = (1.25 - p.y) / 2.5;
    const tear = k > 0.86 ? 0.24 * Math.abs(Math.sin(u * 9.3 + 0.6) * Math.sin(u * 4.1)) : 0;
    p.set(u * (0.6 + 0.5 * k), -2.85 * k + 0.45 * k * k + tear, -0.05 - 0.75 * Math.pow(k, 1.5) + 0.1 * Math.sin(u * 6 + k * 5) * k + 0.05 * Math.sin(u * 13 + 1.7) * k - 0.12 * (1 - u * u) * (1 - k));
  });
  const capeG = G(V(0, 0.9, -0.27), torso);
  const cape = mesh(cg, cloth);
  capeG.add(cape);
  torso.add(mesh(rbox(1.26, 0.1, 0.16, 0.04), steelDark, V(0, 0.9, -0.27)));
  // great helm
  const head = G(V(0, 1.0, 0), torso), helm = new THREE.Group(), hy = 0.38;
  helm.add(mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.76, 28), steelLight, V(0, hy, 0)));
  helm.add(mesh(new THREE.SphereGeometry(0.45, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), steelLight, V(0, hy + 0.38, 0), undefined, V(1, 0.42, 1)));
  helm.add(mesh(new THREE.CylinderGeometry(0.515, 0.515, 0.07, 18), steel, V(0, hy - 0.38, 0)));
  helm.add(mesh(new THREE.CylinderGeometry(0.462, 0.462, 0.05, 18), steel, V(0, hy + 0.36, 0)));
  helm.add(mesh(new THREE.CylinderGeometry(0.476, 0.492, 0.15, 24, 1, true, -0.95, 1.9), dark, V(0, hy + 0.07, 0)));
  helm.add(mesh(new THREE.CylinderGeometry(0.486, 0.506, 0.58, 6, 1, true, -0.075, 0.15), steel, V(0, hy - 0.03, 0)));
  helm.add(mesh(rbox(0.07, 0.06, 0.62, 0.025), steel, V(0, hy + 0.545, -0.02)));
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) helm.add(mesh(ball(0.022, 8, 6), dark, V(Math.sin(s * (0.28 + i * 0.13)) * 0.494, hy - 0.18 - (i % 2) * 0.07, Math.cos(0.28 + i * 0.13) * 0.494)));
  const eyes: THREE.Mesh[] = [];
  for (const s of [-1, 1]) { const e = mesh(ball(0.052, 12, 10), blueMat, V(Math.sin(s * 0.42) * 0.47, hy + 0.07, Math.cos(0.42) * 0.47), undefined, V(1, 1.15, 0.6)); eyes.push(e); helm.add(e); }
  helm.scale.setScalar(1.16);
  head.add(helm);
  // arms
  const arms: { arm: THREE.Group; elbow: THREE.Group; hand: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const arm = G(V(s * 0.74, 0.56, 0.02), torso);
    const p1 = mesh(ball(0.39, 24, 16), steelLight, V(0, 0.14, 0), [0, 0, -s * 0.28], V(1.14, 0.82, 1.12));
    const p2 = mesh(ball(0.32, 24, 16), steel, V(s * 0.12, -0.1, 0), [0, 0, -s * 0.52], V(1.0, 0.7, 1.06));
    arm.add(p1, p2); armour.push(p1, p2);
    arm.add(limb(V(0, 0, 0), V(0, -0.55, 0), 0.165, 0.155, steelDark));
    const elbow = G(V(0, -0.55, 0), arm);
    elbow.add(mesh(ball(0.185), steelLight));
    elbow.add(limb(V(0, 0, 0), V(0, -0.48, 0), 0.155, 0.175, steel));
    const hand = G(V(0, -0.5, 0), elbow);
    hand.add(mesh(rbox(0.25, 0.24, 0.25, 0.09), steelLight));
    arms.push({ arm, elbow, hand });
  }
  // greatsword: the grip sits in the right hand, the blade runs on from the forearm (swX 0)
  const sword = G(V(0, 0, 0.02), arms[0]!.hand);
  const bs = new THREE.Shape();
  bs.moveTo(-0.11, -0.2); bs.lineTo(0.11, -0.2); bs.lineTo(0.085, -1.36); bs.lineTo(0, -1.7); bs.lineTo(-0.085, -1.36); bs.closePath();
  const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.024, bevelSize: 0.032, bevelSegments: 1 });
  bg.translate(0, 0, -0.006);
  sword.add(mesh(bg, toon(0xe2e9f4, { spec: 1, shine: 60, rim: 0.6 })));
  const blade = mesh(rbox(0.016, 1.0, 0.07, 0.007), blueMat, V(0, -0.75, 0));
  sword.add(blade);
  sword.add(mesh(warp(rbox(0.74, 0.09, 0.12, 0.04), (p) => { p.y -= 0.1 * (p.x / 0.37) ** 2; }), steelDark, V(0, -0.16, 0)));
  sword.add(mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.36, 12), leather, V(0, 0.02, 0)));
  sword.add(mesh(ball(0.085), steelLight, V(0, 0.24, 0), undefined, V(1, 0.9, 1)));
  // the blaze around the blade (hidden until the power wakes): lobes of blue flame, and its light
  const aura = new THREE.Group();
  const fl1 = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2f8dff).multiplyScalar(1.1), fog: false }), fl2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfefff).multiplyScalar(1.5), fog: false });
  for (let i = 0; i < 12; i++) { aura.add(mesh(ball(0.13, 12, 8), fl1, V(0, -0.3 - i * 0.13, 0), undefined, V(1, 1.6, 0.7))); aura.add(mesh(ball(0.06, 10, 8), fl2, V(0, -0.3 - i * 0.13, 0.02), undefined, V(1, 1.5, 0.7))); }
  aura.visible = false;
  sword.add(aura);
  const bladeLight = new THREE.PointLight(0x4fc3ff, 0, 5, 1.6);
  bladeLight.position.set(0, -0.8, 0.3);
  sword.add(bladeLight);
  // shield on the left forearm
  const shield = makeShield();
  shield.scale.setScalar(1.22); shield.position.set(0.1, -0.22, 0.24); shield.rotation.set(0.25, 0.3, 0.05);
  arms[1]!.elbow.add(shield);
  armour.push(shield);
  shadows(root);
  for (const e of eyes) e.castShadow = false;
  aura.traverse((c) => { c.castShadow = false; c.receiveShadow = false; });

  return {
    root, sword, shield, cape, eyes, helm, armour, blade, aura, bladeLight,
    set(p) {
      const g = (n: string) => p[n] ?? 0;
      root.position.set(g('x'), g('y') + (p.lift ?? 0), g('z'));
      root.rotation.set(g('pitch'), g('yaw'), g('roll'), 'YXZ');
      hips.rotation.set(g('hipsX'), 0, 0);
      torso.rotation.set(g('torsoX'), g('torsoY'), g('torsoZ'));
      head.rotation.set(g('headX'), g('headY'), 0);
      legs[0]!.thigh.rotation.x = -g('tR'); legs[0]!.knee.rotation.x = g('kR');
      legs[1]!.thigh.rotation.x = -g('tL'); legs[1]!.knee.rotation.x = g('kL');
      arms[0]!.arm.rotation.set(-g('aRx'), 0, -g('aRz')); arms[0]!.elbow.rotation.x = -g('eR');
      arms[1]!.arm.rotation.set(-g('aLx'), 0, g('aLz')); arms[1]!.elbow.rotation.x = -g('eL');
      sword.rotation.set(-g('swX'), 0, g('swZ'));
      capeG.rotation.set(g('capeX'), 0, g('capeZ'));
    },
    power(k, t) {
      blueMat.color.set(0x5fd0ff).multiplyScalar(clamp(k, 0, 1) * 1.9 + 0.25 + Math.max(0, k - 1) * 0.5);
      bladeLight.intensity = 0.5 * clamp(k, 0, 1) + 2.5 * Math.max(0, k - 1);
      aura.visible = k > 1.02;
      if (aura.visible) aura.children.forEach((c, i) => {
        const j = i >> 1, w = Math.sin(t * 11 + j * 1.7) * Math.sin(t * 7.3 + j);
        c.position.x = 0.07 * w * (1 + j * 0.08); c.scale.setScalar((i % 2 ? 1 : 1.25) * (0.75 + 0.35 * Math.sin(t * 9 + j * 2.1)) * Math.min(1, k - 1));
        c.scale.y *= 1.6;
      });
    },
  };
}

/** The shield: a heater shield of bare steel with a raised rim; `crest` puts the emblem's blue on its face. */
export function makeShield() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0.62); s.lineTo(0.5, 0.62); s.lineTo(0.5, 0.1);
  s.quadraticCurveTo(0.46, -0.48, 0, -0.78); s.quadraticCurveTo(-0.46, -0.48, -0.5, 0.1); s.closePath();
  const g = new THREE.Group();
  g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.05, bevelSegments: 3, curveSegments: 16 }), toon(0x7f8dab, { spec: 0.6, shine: 26, detail: 'metal', detailAmount: 0.5, detailScale: 2.2 })));
  g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 16 }), toon(0xbcc9de, { spec: 0.9, shine: 22, detail: 'metal', detailAmount: 0.7, detailScale: 1.8 }), V(0, 0.01, 0.07), undefined, V(0.84, 0.84, 1)));
  for (const [x, y] of [[-0.4, 0.5], [0.4, 0.5], [0, -0.6], [-0.4, 0.05], [0.4, 0.05]] as const) g.add(mesh(ball(0.035, 8, 6), toon(0xd6deea, { spec: 1, shine: 20 }), V(x, y, 0.1)));
  return shadows(g);
}

// ================================================================== the Dragon
/** Dragon poses. n0..n5 bend the neck joint by joint (forward is positive), neckYaw swings it, headYaw/headPitch aim the head. */
export const DP = {
  loom: { n0: 0.75, n1: -0.55, n2: -0.45, n3: 0.3, n4: 0.75, n5: 0.75, neckYaw: 0.2, headYaw: -0.45, headPitch: 0.25, jaw: 0.25, wingL: 0.1, wingR: 0.1 } as Pose,
  roar: { n0: 0.6, n1: -0.6, n2: -0.5, n3: -0.1, n4: 0.4, n5: 0.35, neckYaw: 0.1, headYaw: -0.2, headPitch: -0.5, jaw: 0.85, wingL: 0.45, wingR: 0.45 } as Pose,
  strike: { n0: 0.8, n1: 0.0, n2: 0.1, n3: 0.4, n4: 0.4, n5: 0.3, neckYaw: 0.05, headYaw: -0.1, headPitch: 0.0, jaw: 0.6, wingL: 0.3, wingR: 0.3 } as Pose,
  breathe: { n0: 0.5, n1: -0.3, n2: -0.1, n3: 0.4, n4: 0.6, n5: 0.5, neckYaw: 0.0, headYaw: 0.0, headPitch: 0.1, jaw: 0.95, wingL: 0.55, wingR: 0.55 } as Pose,
  fallen: { y: -1.6, pitch: 0.12, roll: 0.16, n0: 1.0, n1: 0.25, n2: 0.2, n3: 0.1, n4: -0.1, n5: -0.2, neckYaw: 0.22, headYaw: -0.3, headPitch: -0.2, jaw: 0.1, wingL: -0.55, wingR: -0.75 } as Pose,
  bow: { y: -1.6, pitch: 0.12, roll: 0.1, n0: 1.05, n1: 0.25, n2: 0.2, n3: 0.1, n4: -0.1, n5: -0.2, neckYaw: 0.0, headYaw: 0.0, headPitch: -0.4, jaw: 0.02, wingL: -0.6, wingR: -0.6 } as Pose,
  flying: { n0: 0.9, n1: 0.2, n2: 0.2, n3: 0.2, n4: 0.2, n5: 0.2, headPitch: 0.3, jaw: 0.5 } as Pose,
};

export interface Dragon {
  root: THREE.Group; head: THREE.Group; fire: THREE.Group; fireLight: THREE.PointLight; eyeMat: THREE.MeshBasicMaterial; chest: THREE.Mesh;
  set(p: Pose): void;
  /** The breath: k 0..1 how far the stream reaches. */
  breath(k: number, t: number): void;
}

export function makeDragon(): Dragon {
  const sc = (c: number) => toon(c, { detail: 'scale', detailAmount: 0.7, detailScale: 0.55, spec: 0.3, shine: 18, rim: 0.28, rimColor: 0xffc487 });
  const scale = sc(0x3a4a8c), scaleLight = sc(0x4c5ea6);
  const belly = toon(0xe0b070, { detail: 'cloth', detailAmount: 0.8, detailScale: 0.8 });
  const bone = toon(0xf4e6c4, { spec: 0.5, shine: 30 }), hornDark = toon(0x6a5870, { spec: 0.4, shine: 30 });
  const membrane = toon(0xc8373f, { detail: 'cloth', detailAmount: 1, detailScale: 0.22, side: THREE.DoubleSide, emissive: 0x7a1410, emissiveIntensity: 0.35 });
  const mouth = toon(0x9a2420, { emissive: 0xff5a18, emissiveIntensity: 0.7 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc23a).multiplyScalar(3.2), fog: false });
  const G = (p: THREE.Vector3, parent: THREE.Object3D) => { const g = new THREE.Group(); g.position.copy(p); parent.add(g); return g; };

  // ---- head (snout along +z)
  const head = new THREE.Group();
  const taperZ = (len: number, sx: number, sy: number) => (p: THREE.Vector3) => { const k = (p.z + len / 2) / len; p.x *= 1 - (1 - sx) * k; p.y *= 1 - (1 - sy) * k; };
  head.add(mesh(warp(rbox(1.9, 1.3, 2.1, 0.32, 6), taperZ(2.1, 0.66, 0.74)), scale));
  head.add(mesh(warp(rbox(1.2, 0.78, 2.3, 0.26, 6), (p) => { taperZ(2.3, 0.58, 0.62)(p); p.y += 0.08 * Math.sin((p.z + 1.15) * 1.3); }), scaleLight, V(0, -0.06, 1.95)));
  for (const s of [-1, 1]) {
    head.add(mesh(ball(0.08, 12, 10), toon(0x1c2040), V(s * 0.22, 0.14, 3.05), undefined, V(0.8, 0.6, 1.6)));
    head.add(mesh(warp(rbox(0.86, 0.3, 1.25, 0.12), (p) => { p.y += 0.16 * (p.z / 0.62); }), scaleLight, V(s * 0.62, 0.52, 0.72), [0, s * 0.22, -s * 0.34]));
    head.add(mesh(ball(0.15, 14, 10), eyeMat, V(s * 0.72, 0.2, 0.86), undefined, V(0.55, 0.62, 1.2)));
    head.add(mesh(rbox(0.03, 0.26, 0.2, 0.01), toon(0x1a0c08), V(s * 0.8, 0.2, 0.9), [0, s * 0.5, 0]));
    const horn = (pts: THREE.Vector3[], r0: number, m: THREE.Material) => { for (let i = 0; i < pts.length - 1; i++) { const k0 = i / (pts.length - 1), k1 = (i + 1) / (pts.length - 1); head.add(limb(pts[i]!, pts[i + 1]!, lerp(r0, 0.035, k0), lerp(r0, 0.035, k1), m, { seg: 10 })); } };
    horn([V(s * 0.62, 0.52, -0.6), V(s * 0.95, 1.05, -1.5), V(s * 1.25, 1.75, -2.5), V(s * 1.3, 2.6, -3.3), V(s * 1.12, 3.4, -3.8), V(s * 0.9, 4.0, -3.95)], 0.3, bone);
    horn([V(s * 0.9, -0.05, -0.7), V(s * 1.5, 0.1, -1.5), V(s * 1.85, 0.45, -2.3), V(s * 1.9, 0.95, -2.9)], 0.2, hornDark);
    for (let i = 0; i < 3; i++) head.add(spike(V(s * (0.92 - i * 0.03), -0.3 - i * 0.03, -0.1 + i * 0.5), V(s * 1, -0.35, -0.5), 0.75 - i * 0.14, 0.14, hornDark));
    for (let i = 0; i < 9; i++) head.add(spike(V(s * (0.52 - i * 0.03), -0.34 + 0.012 * i, 1.05 + i * 0.24), V(s * 0.12, -1, 0.1), i === 7 ? 0.5 : 0.3 - (i % 2) * 0.07, 0.07, bone, 6));
  }
  for (let i = 0; i < 4; i++) head.add(spike(V(0, 0.6 - i * 0.02, 0.3 - i * 0.42), V(0, 1, -0.55), 0.62 + i * 0.12, 0.17, hornDark));
  for (let i = 0; i < 3; i++) head.add(spike(V(0, 0.34, 1.5 + i * 0.5), V(0, 1, -0.25), 0.26, 0.09, hornDark));
  const jaw = G(V(0, -0.52, -0.55), head);
  jaw.add(mesh(warp(rbox(1.15, 0.36, 3.2, 0.14, 6), taperZ(3.2, 0.5, 0.7)), scale, V(0, -0.16, 1.6)));
  jaw.add(mesh(warp(rbox(0.9, 0.08, 2.7, 0.03), taperZ(2.7, 0.5, 1)), mouth, V(0, 0.03, 1.5)));
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) jaw.add(spike(V(s * (0.46 - i * 0.028), 0, 1.1 + i * 0.26), V(s * 0.1, 1, 0.05), i === 6 ? 0.44 : 0.26 - (i % 2) * 0.06, 0.065, bone, 6));
  jaw.add(spike(V(0, -0.3, 0.8), V(0, -1, -0.4), 0.5, 0.14, hornDark));
  head.add(mesh(warp(rbox(0.9, 0.08, 2.6, 0.03), taperZ(2.6, 0.5, 1)), mouth, V(0, -0.42, 1.55)));
  const throat = mesh(ball(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff8a2a).multiplyScalar(2.2), fog: false }), V(0, -0.62, 0.15), undefined, V(1, 0.7, 1.4));
  head.add(throat);
  // the breath: a stream of flame lobes out of the mouth, red at the edge, gold inside, white at the core
  const fire = G(V(0, -0.75, 2.4), head);
  const fm = [0xf0301a, 0xff7a14, 0xffc02e, 0xffe890].map((c, i) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.92 + i * 0.06), fog: false }));
  for (let i = 0; i < 26; i++) for (let j = 0; j < 4; j++) { const m = mesh(ball(1, 12, 8), fm[Math.max(0, Math.min(3, 3 - Math.floor((i / 25) * 3.4 + (j - 1.5) * 0.5)))]!); m.userData = { i, j }; m.castShadow = false; fire.add(m); }
  fire.visible = false;
  const fireLight = new THREE.PointLight(0xff8a3a, 30, 30, 1.5);
  fireLight.position.set(0, -0.9, 1.8);
  head.add(fireLight);

  // ---- body
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  body.add(mesh(ball(3.1, 28, 20), scale, V(0, 4.3, -11.2), [0.25, 0, 0], V(1.15, 0.92, 1.9)));
  const chest = mesh(ball(1, 24, 16), belly, V(0, 3.5, -8.7), [0.5, 0, 0], V(2.2, 2.3, 1.6));
  body.add(chest);
  for (let i = 0; i < 5; i++) body.add(spike(V(0, 6.9 - i * 0.12, -9.6 - i * 1.5), V(0, 1, -0.4), 1.5 - i * 0.12, 0.34, hornDark));
  const tail = G(V(0, 3.6, -15), body);
  const tp = [V(0, 0, 0), V(1.5, -1.2, -4), V(4, -2.2, -7), V(7.5, -2.7, -8.5), V(11, -2.9, -8)];
  for (let i = 0; i < tp.length - 1; i++) tail.add(limb(tp[i]!, tp[i + 1]!, lerp(1.6, 0.18, i / 4), lerp(1.6, 0.18, (i + 1) / 4), scale, { seg: 12 }));
  tail.add(spike(tp[4]!, V(1, 0.1, 0.3), 1.6, 0.5, hornDark));
  const wings: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const sh = V(s * 2.3, 4.6, -8.4), el = V(s * 4.0, 2.9, -6.3), wr = V(s * 3.7, 0.5, -4.2);
    body.add(limb(sh, el, 1.15, 0.8, scale)); body.add(limb(el, wr, 0.75, 0.55, scaleLight));
    for (let i = -1; i <= 1; i++) { const toe = V(wr.x + i * 0.62, 0.28, wr.z + 1.25); body.add(limb(wr, toe, 0.36, 0.26, scale)); body.add(spike(toe, V(i * 0.1, -0.25, 1), 0.85, 0.2, bone, 8)); }
    const wing = G(V(s * 1.9, 6.6, -9.6), body), o = V(s * 1.9, 6.6, -9.6), R = (v: THREE.Vector3) => v.sub(o);
    const elbow = R(V(s * 6.4, 10.6, -10.4)), wrist = R(V(s * 9.6, 15.6, -9.2));
    const tips = [V(s * 12.2, 21.6, -8.6), V(s * 18.4, 17.4, -8.0), V(s * 19.2, 9.8, -8.8), V(s * 14.0, 3.6, -10.2), V(s * 5.2, 2.6, -12.2)].map(R);
    wing.add(limb(V(), elbow, 0.62, 0.46, scale)); wing.add(limb(elbow, wrist, 0.44, 0.34, scale));
    wing.add(spike(wrist, V(s * 0.2, 1, 0.3), 1.5, 0.22, bone, 8));
    for (let i = 0; i < 4; i++) { const from = i < 3 ? wrist : elbow, mid = from.clone().lerp(tips[i]!, 0.55).add(V(0, 0.5, 0.25)); wing.add(limb(from, mid, 0.3, 0.17, scale, { seg: 8 })); wing.add(limb(mid, tips[i]!, 0.17, 0.05, scale, { seg: 8 })); }
    for (let i = 0; i < 4; i++) { const apex = i < 2 ? wrist : elbow; wing.add(fan(apex, scallop(tips[i]!, tips[i + 1]!, apex, 0.2, 12), membrane)); }
    wing.add(fan(elbow, [wrist, tips[2]!], membrane));
    wing.add(fan(V(), [elbow, tips[4]!, R(V(s * 1.6, 3.4, -12.5))], membrane));
    wings.push(wing);
  }
  // ---- neck: six joints, each segment running up its own +y; the back of the neck is -z
  const neckBase = G(V(0, 5.0, -8.6), body);
  const L = [2.3, 2.1, 2.0, 1.9, 1.8, 1.6], joints: THREE.Group[] = [];
  let parent: THREE.Object3D = neckBase;
  for (let i = 0; i < 6; i++) {
    const j: THREE.Group = G(V(0, i ? L[i - 1]! : 0, 0), parent), r0 = lerp(1.7, 0.86, i / 6), r1 = lerp(1.7, 0.86, (i + 1) / 6);
    j.add(limb(V(), V(0, L[i]!, 0), r0, r1, scale, { seg: 14 }));
    for (const u of [0.2, 0.65]) j.add(spike(V(0, L[i]! * u, -r0 * 0.86), V(0, 0.5, -1), 1.3 - 0.1 * i, 0.3 - 0.02 * i, hornDark));
    for (const u of [0.25, 0.75]) j.add(mesh(ball(1, 16, 10), belly, V(0, L[i]! * u, r0 * 0.6), undefined, V(r0 * 0.74, L[i]! * 0.34, r0 * 0.5)));
    joints.push(j); parent = j;
  }
  const headYaw = G(V(0, L[5]! + 0.3, 0), parent);
  head.position.set(0, 0, 0.55);
  headYaw.add(head);
  shadows(root);
  fire.traverse((c) => { c.castShadow = false; c.receiveShadow = false; });

  const BASE = [0.35, 0, 0, 0, 0, 0];
  return {
    root, head, fire, fireLight, eyeMat, chest,
    set(p) {
      const g = (n: string) => p[n] ?? 0;
      root.position.set(g('x'), g('y'), g('z'));
      root.rotation.set(g('pitch'), g('yaw'), g('roll'), 'YXZ');
      neckBase.rotation.y = g('neckYaw');
      for (let i = 0; i < 6; i++) joints[i]!.rotation.x = BASE[i]! + g(`n${i}`);
      headYaw.rotation.z = g('headYaw');
      head.rotation.x = -Math.PI / 2 + 0.3 + g('headPitch');
      jaw.rotation.x = 0.1 + g('jaw') * 0.75;
      wings[0]!.rotation.z = -g('wingL'); wings[1]!.rotation.z = g('wingR');
      wings[0]!.rotation.y = -g('fold'); wings[1]!.rotation.y = g('fold');
      tail.rotation.y = g('tail');
    },
    breath(k, t) {
      fire.visible = k > 0.01;
      fireLight.intensity = 30 + 220 * k;
      if (!fire.visible) return;
      for (const c of fire.children) {
        const { i, j } = c.userData as { i: number; j: number }, u = i / 25;
        const reach = u * k * 12.5, w = Math.sin(t * 13 + i * 1.9 + j) * Math.cos(t * 8.3 + i * 0.7);
        const r = (0.28 + u * 0.95) * (0.75 + 0.35 * Math.sin(t * 17 + i * 2.3 + j * 1.3)) * Math.min(1, k * 3) * (u > k * 1.02 ? 0 : 1);
        const ang = j * 1.57 + i * 0.8 + t * 3, off = (0.15 + u * 0.75) * (j ? 1 : 0);
        c.position.set(w * u * 0.6 + Math.cos(ang) * off, Math.cos(t * 11 + i) * u * 0.4 + Math.sin(ang) * off, reach + j * 0.2);
        c.scale.set(r, r, r * 1.5);
      }
    },
  };
}
void glow; void NO_INK;
