// The Knight: plain battered plate, a great helm with a cross-shaped sight, no crest and no colours.
// A big helm and broad shoulders: a figure that reads at phone size.
// Built standing at the origin, feet on y = 0, facing +z. Sword in the right hand (the knight's right is -x),
// point resting on the ground; the blank shield on the left arm.
import * as THREE from 'three';
import { V, toon, glow, mesh, rbox, ball, warp, limb, shadows } from './_toon';

export interface KnightParts { root: THREE.Group; sword: THREE.Group; shield: THREE.Group; cape: THREE.Mesh; eyes: THREE.Mesh[]; bladeLight: THREE.PointLight; height: number }

export function buildKnight(o: { glow?: number } = {}): KnightParts {
  const power = o.glow ?? 1;
  const metal = (c: number, spec = 0.9) => toon(c, { spec, shine: 26, detail: 'metal', detailAmount: 0.55, detailScale: 2.2, rim: 0.5 });
  const steel = metal(0x8fa3c8), steelLight = metal(0xb2c2de, 1), steelDark = metal(0x64749a, 0.6);
  const cloth = toon(0x2f4dc0, { detail: 'cloth', detailAmount: 1, detailScale: 1.4, side: THREE.DoubleSide });
  const leather = toon(0x7a4f34);
  const dark = toon(0x171a26);
  const blue = glow(0x5fd0ff, 2.4 * power);
  const root = new THREE.Group();
  const add = (o3: THREE.Object3D) => { root.add(o3); return o3; };
  const ring = (r: number, h: number, p: THREE.Vector3, m: THREE.Material = steelLight) => add(mesh(new THREE.CylinderGeometry(r, r, h, 18), m, p));

  for (const s of [-1, 1]) {
    // legs: sabaton, greave, knee cop with its fin, cuisse
    add(mesh(warp(rbox(0.38, 0.24, 0.66, 0.1), (p) => { if (p.z > 0) { p.y *= 1 - 0.4 * (p.z / 0.33); p.x *= 1 - 0.25 * (p.z / 0.33); } }), steelDark, V(s * 0.31, 0.12, 0.09)));
    add(limb(V(s * 0.31, 0.22, 0), V(s * 0.33, 1.0, 0), 0.165, 0.215, steel));
    ring(0.185, 0.07, V(s * 0.312, 0.34, 0));
    add(mesh(ball(0.21), steelLight, V(s * 0.33, 1.05, 0.07), undefined, V(1, 0.9, 1.08)));
    add(mesh(rbox(0.05, 0.2, 0.22, 0.02), steel, V(s * 0.54, 1.05, 0.02)));
    add(limb(V(s * 0.33, 1.08, 0), V(s * 0.29, 1.7, 0), 0.215, 0.27, steel));
    // tasset: a plate hung from the belt over each thigh
    add(mesh(warp(rbox(0.44, 0.5, 0.1, 0.045), (p) => { p.z -= 0.5 * p.x * p.x; }), steelLight, V(s * 0.29, 1.72, 0.3), [0.12, s * 0.2, 0]));
    // shoulder: two lapped plates with a raised edge
    add(mesh(ball(0.39, 24, 16), steelLight, V(s * 0.74, 2.7, 0), [0, 0, -s * 0.28], V(1.14, 0.82, 1.12)));
    add(mesh(ball(0.32, 24, 16), steel, V(s * 0.86, 2.46, 0.02), [0, 0, -s * 0.52], V(1.0, 0.7, 1.06)));
  }
  // sword arm: hanging, hand on the grip of the planted sword
  const sA = V(-0.74, 2.56, 0.02), eA = V(-0.98, 2.02, 0.1), hA = V(-1.0, 1.6, 0.44);
  add(limb(sA, eA, 0.165, 0.155, steelDark)); add(mesh(ball(0.185), steelLight, eA)); add(mesh(rbox(0.05, 0.2, 0.2, 0.02), steel, V(-1.19, 2.02, 0.06)));
  add(limb(eA, hA, 0.155, 0.175, steel)); add(mesh(rbox(0.25, 0.24, 0.25, 0.09), steelLight, hA));
  // shield arm: forearm brought forward behind the shield
  const sB = V(0.74, 2.56, 0.02), eB = V(1.0, 2.04, 0.06), hB = V(0.86, 1.78, 0.5);
  add(limb(sB, eB, 0.165, 0.155, steelDark)); add(mesh(ball(0.185), steelLight, eB));
  add(limb(eB, hB, 0.155, 0.175, steel)); add(mesh(rbox(0.25, 0.24, 0.25, 0.09), steelLight, hB));

  // hips: a cloth skirt under the plates, belt and buckle
  add(mesh(new THREE.CylinderGeometry(0.46, 0.64, 0.7, 20, 1, true), cloth, V(0, 1.66, 0)));
  ring(0.49, 0.13, V(0, 2.0, 0), leather);
  add(mesh(rbox(0.18, 0.18, 0.06, 0.03), steelLight, V(0, 2.0, 0.49)));
  // breastplate: wider at the shoulders, a ridge down the front, a plackart band at the waist
  add(mesh(warp(rbox(1.04, 0.92, 0.68, 0.22, 6), (p) => {
    const k = (p.y + 0.46) / 0.92; p.x *= 0.76 + 0.34 * k; p.z *= 0.86 + 0.2 * k;
    if (p.z > 0) p.z += 0.11 * (1 - Math.min(1, Math.abs(p.x) / 0.32)) * (0.4 + 0.6 * k);
  }), steel, V(0, 2.45, 0)));
  add(mesh(new THREE.CylinderGeometry(0.46, 0.44, 0.16, 20), steelDark, V(0, 2.1, 0), undefined, V(1, 1, 0.78)));
  ring(0.33, 0.2, V(0, 2.93, 0), steelDark);
  // great helm: a barrel with a domed top, a cross-shaped sight, a low ridge over the crown
  const hy = 3.36, helm = new THREE.Group();
  helm.add(mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.76, 28), steelLight, V(0, hy, 0)));
  helm.add(mesh(new THREE.SphereGeometry(0.45, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), steelLight, V(0, hy + 0.38, 0), undefined, V(1, 0.42, 1)));
  helm.add(mesh(new THREE.CylinderGeometry(0.515, 0.515, 0.07, 18), steel, V(0, hy - 0.38, 0)));
  helm.add(mesh(new THREE.CylinderGeometry(0.462, 0.462, 0.05, 18), steel, V(0, hy + 0.36, 0)));
  helm.add(mesh(new THREE.CylinderGeometry(0.476, 0.492, 0.15, 24, 1, true, -0.95, 1.9), dark, V(0, hy + 0.07, 0)));           // sight
  helm.add(mesh(new THREE.CylinderGeometry(0.486, 0.506, 0.58, 6, 1, true, -0.075, 0.15), steel, V(0, hy - 0.03, 0)));         // nasal bar
  helm.add(mesh(rbox(0.07, 0.06, 0.62, 0.025), steel, V(0, hy + 0.545, -0.02)));
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) helm.add(mesh(ball(0.022, 8, 6), dark, V(Math.sin(s * (0.28 + i * 0.13)) * 0.494, hy - 0.18 - (i % 2) * 0.07, Math.cos(0.28 + i * 0.13) * 0.494))); // breaths
  const eyes: THREE.Mesh[] = [];
  for (const s of [-1, 1]) { const e = mesh(ball(0.052, 12, 10), blue, V(Math.sin(s * 0.42) * 0.47, hy + 0.07, Math.cos(0.42) * 0.47), undefined, V(1, 1.15, 0.6)); eyes.push(e); helm.add(e); }
  helm.scale.setScalar(1.16); helm.position.y = -(hy - 0.38) * 0.16; helm.rotation.y = -0.12;
  add(helm);

  // cape: from the shoulders, lifted to one side by the wind, torn along the hem
  const cg = new THREE.PlaneGeometry(1.5, 2.5, 18, 26);
  warp(cg, (p) => {
    const u = p.x / 0.75, k = (1.25 - p.y) / 2.5;                 // k: 0 at the shoulders, 1 at the hem
    const x = u * (0.6 + 0.55 * k) + 0.7 * k * k;
    const z = -0.32 - 1.1 * Math.pow(k, 1.5) + 0.1 * Math.sin(u * 6 + k * 5) * k + 0.05 * Math.sin(u * 13 + 1.7) * k - 0.12 * (1 - u * u) * (1 - k);
    const tear = k > 0.86 ? 0.24 * Math.abs(Math.sin(u * 9.3 + 0.6) * Math.sin(u * 4.1)) : 0;
    p.set(x, 2.9 - 2.85 * k + 0.6 * k * k + tear, z);
  });
  const cape = mesh(cg, cloth);
  add(cape);
  add(mesh(rbox(1.26, 0.1, 0.16, 0.04), steelDark, V(0, 2.9, -0.27)));

  // greatsword: blade, the thread of light in its fuller, down-swept guard, grip, pommel. Its origin is the point.
  const sword = new THREE.Group();
  const bs = new THREE.Shape();
  bs.moveTo(-0.11, 1.5); bs.lineTo(0.11, 1.5); bs.lineTo(0.085, 0.34); bs.lineTo(0, 0); bs.lineTo(-0.085, 0.34); bs.closePath();
  const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.024, bevelSize: 0.032, bevelSegments: 1 });
  bg.translate(0, 0, -0.006);
  sword.add(mesh(bg, toon(0xe2e9f4, { spec: 1, shine: 60, rim: 0.6 })));
  sword.add(mesh(rbox(0.016, 1.0, 0.07, 0.007), blue, V(0, 0.95, 0)));
  sword.add(mesh(warp(rbox(0.74, 0.09, 0.12, 0.04), (p) => { p.y -= 0.1 * (p.x / 0.37) ** 2; }), steelDark, V(0, 1.54, 0)));
  sword.add(mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.36, 12), leather, V(0, 1.76, 0)));
  sword.add(mesh(ball(0.085), steelLight, V(0, 1.98, 0), undefined, V(1, 0.9, 1)));
  sword.position.set(-1.0, -0.12, 0.47); sword.rotation.set(0.02, 0.5, 0);
  add(sword);
  const bladeLight = new THREE.PointLight(0x4fc3ff, 0.5 * power, 2.2, 1.8);
  bladeLight.position.set(-1.0, 0.9, 0.8);
  add(bladeLight);

  const shield = buildShield();
  shield.scale.setScalar(1.22); shield.position.set(1.06, 1.72, 0.66); shield.rotation.set(-0.06, 0.52, -0.05);
  add(shield);

  shadows(root);
  for (const e of eyes) e.castShadow = false;
  return { root, sword, shield, cape, eyes, bladeLight, height: hy + 0.6 };
}

/** The blank shield: a heater shield of bare steel with a raised rim. Lies in its own xy plane, top edge up, face to +z. */
export function buildShield() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0.62); s.lineTo(0.5, 0.62); s.lineTo(0.5, 0.1);
  s.quadraticCurveTo(0.46, -0.48, 0, -0.78); s.quadraticCurveTo(-0.46, -0.48, -0.5, 0.1); s.closePath();
  const g = new THREE.Group();
  g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.05, bevelSegments: 3, curveSegments: 16 }), toon(0x7f8dab, { spec: 0.6, shine: 26, detail: 'metal', detailAmount: 0.5, detailScale: 2.2 })));
  g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 16 }), toon(0xbcc9de, { spec: 0.9, shine: 22, detail: 'metal', detailAmount: 0.7, detailScale: 1.8 }), V(0, 0.01, 0.07), undefined, V(0.84, 0.84, 1)));
  for (const [x, y] of [[-0.4, 0.5], [0.4, 0.5], [0, -0.6], [-0.4, 0.05], [0.4, 0.05]] as const) g.add(mesh(ball(0.035, 8, 6), toon(0xd6deea, { spec: 1, shine: 20 }), V(x, y, 0.1)));
  return shadows(g);
}
