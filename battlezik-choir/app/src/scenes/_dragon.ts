// The Dragon: black-scaled, horned, with wings that close off the sky. Built from bold faceted forms.
// The head is modelled around its own origin (snout along +z); neck, body and wings are placed in the
// dragon's group, which stands on y = 0 and faces +z.
import * as THREE from 'three';
import { V, toon, glow, mesh, rbox, ball, warp, limb, chain, spike, fan, scallop, shadows } from './_toon';

export interface DragonParts { root: THREE.Group; head: THREE.Group; jaw: THREE.Group; fire: THREE.PointLight; eyes: THREE.Mesh[] }

export function buildDragon(o: { fire?: number } = {}): DragonParts {
  const sc = (c: number) => toon(c, { detail: 'scale', detailAmount: 0.7, detailScale: 0.55, spec: 0.3, shine: 18, rim: 0.28, rimColor: 0xffc487 });
  const scale = sc(0x3a4a8c), scaleLight = sc(0x4c5ea6);
  const belly = toon(0xe0b070, { detail: 'cloth', detailAmount: 0.8, detailScale: 0.8 });
  const bone = toon(0xf4e6c4, { spec: 0.5, shine: 30 });
  const hornDark = toon(0x6a5870, { spec: 0.4, shine: 30 });
  const membrane = toon(0xc8373f, { detail: 'cloth', detailAmount: 1, detailScale: 0.22, side: THREE.DoubleSide, emissive: 0x7a1410, emissiveIntensity: 0.35 });
  const mouth = toon(0x9a2420, { emissive: 0xff5a18, emissiveIntensity: 0.7 });
  const eyeGlow = glow(0xffc23a, 3.2);
  const fireGlow = glow(0xff8a2a, 2.6);
  void o;

  // ------------------------------------------------------------ head
  const head = new THREE.Group();
  const taperZ = (len: number, sx: number, sy: number) => (p: THREE.Vector3) => { const k = (p.z + len / 2) / len; p.x *= 1 - (1 - sx) * k; p.y *= 1 - (1 - sy) * k; };
  head.add(mesh(warp(rbox(1.9, 1.3, 2.1, 0.32, 6), taperZ(2.1, 0.66, 0.74)), scale, V(0, 0, 0)));
  head.add(mesh(warp(rbox(1.2, 0.78, 2.3, 0.26, 6), (p) => { taperZ(2.3, 0.58, 0.62)(p); p.y += 0.08 * Math.sin((p.z + 1.15) * 1.3); }), scaleLight, V(0, -0.06, 1.95)));
  for (const s of [-1, 1]) {
    head.add(mesh(ball(0.08, 12, 10), toon(0x1c2040), V(s * 0.22, 0.14, 3.05), undefined, V(0.8, 0.6, 1.6)));                               // nostril
    head.add(mesh(warp(rbox(0.86, 0.3, 1.25, 0.12), (p) => { p.y += 0.16 * (p.z / 0.62); }), scaleLight, V(s * 0.62, 0.52, 0.72), [0, s * 0.22, -s * 0.34])); // brow
    const eye = mesh(ball(0.15, 14, 10), eyeGlow, V(s * 0.72, 0.2, 0.86), [0, 0, 0], V(0.55, 0.62, 1.2));
    head.add(eye);
    head.add(mesh(rbox(0.03, 0.26, 0.2, 0.01), toon(0x1a0c08), V(s * 0.8, 0.2, 0.9), [0, s * 0.5, 0]));    // slit pupil
    // horns: two great sweeps back and up, a lower pair, cheek spikes
    head.add(chain([V(s * 0.62, 0.52, -0.6), V(s * 0.95, 1.05, -1.5), V(s * 1.25, 1.75, -2.5), V(s * 1.3, 2.6, -3.3), V(s * 1.12, 3.4, -3.8), V(s * 0.9, 4.0, -3.95)], 0.3, 0.035, bone, 10));
    head.add(chain([V(s * 0.9, -0.05, -0.7), V(s * 1.5, 0.1, -1.5), V(s * 1.85, 0.45, -2.3), V(s * 1.9, 0.95, -2.9)], 0.2, 0.03, hornDark, 8));
    for (let i = 0; i < 3; i++) head.add(spike(V(s * (0.92 - i * 0.03), -0.3 - i * 0.03, -0.1 + i * 0.5), V(s * 1, -0.35, -0.5), 0.75 - i * 0.14, 0.14, hornDark));
    // upper teeth
    for (let i = 0; i < 9; i++) { const z = 1.05 + i * 0.24; head.add(spike(V(s * (0.52 - i * 0.03), -0.34 + 0.012 * i, z), V(s * 0.12, -1, 0.1), i === 7 ? 0.5 : 0.3 - (i % 2) * 0.07, 0.07, bone, 6)); }
  }
  for (let i = 0; i < 4; i++) head.add(spike(V(0, 0.6 - i * 0.02, 0.3 - i * 0.42), V(0, 1, -0.55), 0.62 + i * 0.12, 0.17, hornDark));  // crown
  for (let i = 0; i < 3; i++) head.add(spike(V(0, 0.34, 1.5 + i * 0.5), V(0, 1, -0.25), 0.26, 0.09, hornDark));                        // snout ridge
  // lower jaw, hinged at the back
  const jaw = new THREE.Group();
  jaw.add(mesh(warp(rbox(1.15, 0.36, 3.2, 0.14, 6), taperZ(3.2, 0.5, 0.7)), scale, V(0, -0.16, 1.6)));
  jaw.add(mesh(warp(rbox(0.9, 0.08, 2.7, 0.03), taperZ(2.7, 0.5, 1)), mouth, V(0, 0.03, 1.5)));
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) { const z = 1.1 + i * 0.26; jaw.add(spike(V(s * (0.46 - i * 0.028), 0.0, z), V(s * 0.1, 1, 0.05), i === 6 ? 0.44 : 0.26 - (i % 2) * 0.06, 0.065, bone, 6)); }
  jaw.add(spike(V(0, -0.3, 0.8), V(0, -1, -0.4), 0.5, 0.14, hornDark));
  jaw.position.set(0, -0.52, -0.55);
  jaw.rotation.x = 0.42;
  head.add(jaw);
  head.add(mesh(warp(rbox(0.9, 0.08, 2.6, 0.03), taperZ(2.6, 0.5, 1)), mouth, V(0, -0.42, 1.55)));        // roof of the mouth
  head.add(mesh(ball(0.42, 16, 12), fireGlow, V(0, -0.62, 0.15), undefined, V(1, 0.7, 1.4)));           // the fire in the throat
  const fire = new THREE.PointLight(0xff8a3a, 40 * (o.fire ?? 1), 26, 1.5);
  fire.position.set(0, -0.9, 1.8);
  head.add(fire);

  // ------------------------------------------------------------ neck, body, wings
  const root = new THREE.Group();
  head.position.set(2.5, 9.3, 1.5);
  head.rotation.set(0.5, -0.62, 0.12);
  root.add(head);
  const neck = [V(2.9, 9.5, 0.5), V(3.7, 10.3, -1.0), V(3.5, 10.7, -2.7), V(2.3, 10.1, -4.3), V(0.9, 8.7, -5.7), V(0.2, 6.9, -7.1), V(0, 5.0, -8.6)];
  root.add(chain(neck, 0.82, 1.7, scale, 14));
  for (let i = 0; i < neck.length - 1; i++) {
    const a = neck[i]!, b = neck[i + 1]!, d = b.clone().sub(a).normalize();
    const side = d.clone().cross(V(0, 1, 0)).normalize(), up = side.clone().cross(d).normalize();
    const r = 0.82 + (1.7 - 0.82) * (i / (neck.length - 1));
    for (const u of [0.15, 0.6]) root.add(spike(a.clone().lerp(b, u).addScaledVector(up, r * 0.86), up.clone().addScaledVector(d, 0.5), 0.95 + 0.12 * i, 0.22 + 0.02 * i, hornDark));
    for (const u of [0.25, 0.75]) {                               // throat plates
      const pl = mesh(ball(1, 16, 10), belly, a.clone().lerp(b, u).addScaledVector(up, -r * 0.62));
      pl.scale.set(r * 0.74, r * 0.5, a.distanceTo(b) * 0.34);
      pl.quaternion.setFromUnitVectors(V(0, 0, 1), d);
      root.add(pl);
    }
  }
  root.add(mesh(ball(3.1, 28, 20), scale, V(0, 4.3, -11.2), [0.25, 0, 0], V(1.15, 0.92, 1.9)));
  root.add(mesh(ball(1, 24, 16), belly, V(0, 3.5, -8.7), [0.5, 0, 0], V(2.2, 2.3, 1.6)));                 // chest
  for (let i = 0; i < 5; i++) root.add(spike(V(0, 6.9 - i * 0.12, -9.6 - i * 1.5), V(0, 1, -0.4), 1.5 - i * 0.12, 0.34, hornDark));   // along the back
  root.add(chain([V(0, 3.6, -15), V(1.5, 2.4, -19), V(4, 1.4, -22), V(7.5, 0.9, -23.5), V(11, 0.7, -23)], 1.6, 0.18, scale, 12)); // tail
  for (const s of [-1, 1]) {
    // forelegs, planted either side
    const sh = V(s * 2.3, 4.6, -8.4), el = V(s * 4.0, 2.9, -6.3), wr = V(s * 3.7, 0.5, -4.2);
    root.add(limb(sh, el, 1.15, 0.8, scale)); root.add(limb(el, wr, 0.75, 0.55, scaleLight));
    for (let i = -1; i <= 1; i++) { const toe = V(wr.x + i * 0.62, 0.28, wr.z + 1.25); root.add(limb(wr, toe, 0.36, 0.26, scale)); root.add(spike(toe, V(i * 0.1, -0.25, 1), 0.85, 0.2, bone, 8)); }
    // wing: arm, wrist, three fingers; membrane scalloped between them
    const rootW = V(s * 1.9, 6.6, -9.6), elbow = V(s * 6.4, 10.6, -10.4), wrist = V(s * 9.6, 15.6, -9.2);
    const tips = [V(s * 12.2, 21.6, -8.6), V(s * 18.4, 17.4, -8.0), V(s * 19.2, 9.8, -8.8), V(s * 14.0, 3.6, -10.2), V(s * 5.2, 2.6, -12.2)];
    root.add(limb(rootW, elbow, 0.62, 0.46, scale)); root.add(limb(elbow, wrist, 0.44, 0.34, scale));
    root.add(spike(wrist, V(s * 0.2, 1, 0.3), 1.5, 0.22, bone, 8));
    for (let i = 0; i < 4; i++) {
      const from = i < 3 ? wrist : elbow, mid = from.clone().lerp(tips[i]!, 0.55).add(V(0, 0.5, 0.25));
      root.add(chain([from, mid, tips[i]!], 0.3, 0.05, scale, 8));
    }
    for (let i = 0; i < 4; i++) {
      const apex = i < 2 ? wrist : elbow;
      root.add(fan(apex, scallop(tips[i]!, tips[i + 1]!, apex, 0.2, 12), membrane));
    }
    root.add(fan(elbow, [wrist, tips[2]!], membrane));
    root.add(fan(rootW, [elbow, tips[4]!, V(s * 1.6, 3.4, -12.5)], membrane));
  }
  shadows(root);
  const eyes: THREE.Mesh[] = [];
  head.traverse((c) => { if ((c as THREE.Mesh).material === eyeGlow) eyes.push(c as THREE.Mesh); });
  for (const e of eyes) e.castShadow = false;
  return { root, head, jaw, fire, eyes };
}
