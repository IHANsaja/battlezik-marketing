// LOOK TEST — two held shots for judging the art style, not part of the film (timeline: ?look=1).
//   knight: the Knight on a castle terrace under a summer sky
//   dragon: the Dragon over the Knight in the arena at sunset
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { mulberry32 } from '../engine/util';
import { Stage, V, toon, mesh, rbox, ball, spike, foliage, puff, softDot, shadows, NO_INK, type Look } from './_toon';
import { buildKnight, buildShield } from './_knight';
import { buildDragon } from './_dragon';

const KNIGHT_LOOK: Look = {
  zenith: '#2a6ee0', horizon: '#dff0fb', ground: '#9cc3e6',
  sunDir: V(-0.78, 0.55, 0.3), sunColor: '#fff1d4', sunIntensity: 3.4, sunDisc: 0,
  skyFill: '#8fa4ff', groundFill: '#e0c69a', fill: 1.95,
  cloudLit: '#ffffff', cloudShade: '#8d9fe2', cloud: 0.07,
  fog: '#d3e6f6', fogNear: 60, fogFar: 520,
  ink: '#c9a0e6', inkStrength: 0.95,
  focus: 12.9, aperture: 150, maxBlur: 30, farBlur: 3.5,
};
const DRAGON_LOOK: Look = {
  zenith: '#3a3fa8', horizon: '#ffbb74', ground: '#d99a6a',
  sunDir: V(0.74, 0.3, -0.6), sunColor: '#ffc487', sunIntensity: 3.6, sunDisc: 10,
  skyFill: '#8580f0', groundFill: '#d4895c', fill: 1.7,
  cloudLit: '#ffe0b8', cloudShade: '#9076cf', cloud: 0.34,
  fog: '#f3c39c', fogNear: 70, fogFar: 520,
  ink: '#d6a0d0', inkStrength: 0.95,
  focus: 22, aperture: 160, maxBlur: 30, farBlur: 3.5,
};

export default class LookTest extends Scene {
  stage!: Stage;
  dust!: THREE.Points;
  subject: 'knight' | 'dragon' = 'knight';

  override init() {
    this.subject = this.ctx.params.subject ?? 'knight';
    if (this.subject === 'knight') this.buildKnightShot(); else this.buildDragonShot();
  }

  // ------------------------------------------------------------------ shot 1: the knight
  buildKnightShot() {
    const S = (this.stage = new Stage(KNIGHT_LOOK)), sc = S.scene, rnd = mulberry32(7);
    const stone = (c: number, amt = 0.7) => toon(c, { detail: 'stone', detailAmount: amt, detailScale: 1.1 });
    const st = [stone(0xe6d6b0), stone(0xdcc9a0), stone(0xeee0bd), stone(0xd3c198)];
    const grass = toon(0x7cc24e, { detail: 'grass', detailAmount: 1, detailScale: 0.7 });
    sc.add(mesh(new THREE.CircleGeometry(900, 64), grass, V(0, -9, 0), [-Math.PI / 2, 0, 0]));
    sc.add(mesh(rbox(27, 9, 21, 0.1, 1), st[1]!, V(0, -4.62, 2.2)));                                  // the terrace wall, down to the gardens
    // the terrace: flagstones, and a parapet with merlons behind the knight
    for (let ix = -8; ix <= 8; ix++) for (let iz = -4; iz <= 9; iz++) {
      const w = 1.42 + rnd() * 0.04, d = 1.42 + rnd() * 0.04, h = 0.2 + rnd() * 0.05;
      sc.add(mesh(rbox(w, h, d, 0.04, 2), st[Math.floor(rnd() * 4)]!, V(ix * 1.5 + (rnd() - 0.5) * 0.03, h / 2 - 0.12, iz * 1.5 + (rnd() - 0.5) * 0.03), [0, (rnd() - 0.5) * 0.02, 0]));
    }
    sc.add(mesh(rbox(27, 1.2, 0.9, 0.06, 2), st[1]!, V(0, 0.6, -7.2)));
    sc.add(mesh(rbox(27.4, 0.22, 1.2, 0.05, 2), st[2]!, V(0, 1.3, -7.2)));
    for (let i = -8; i <= 8; i++) if (i % 2 === 0) sc.add(mesh(rbox(1.15, 0.95, 0.9, 0.06, 2), st[(i + 8) % 4]!, V(i * 1.6, 1.88, -7.2)));
    // banners on poles either side
    const cloth = (c: number) => toon(c, { detail: 'cloth', detailAmount: 1, detailScale: 0.9, side: THREE.DoubleSide });
    const banner = (x: number, z: number, col: number, lean: number) => {
      sc.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 9, 10), toon(0x8a5a36), V(x, 4.5, z), [0, 0, lean]));
      sc.add(mesh(ball(0.16, 12, 8), toon(0xf2c94c, { spec: 1, shine: 20 }), V(x - Math.sin(lean) * 4.6, 9.1, z)));
      const g = new THREE.PlaneGeometry(2.0, 3.6, 12, 18), a = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) {
        const px = a.getX(i), py = a.getY(i), u = (px + 1) / 2, k = (1.8 - py) / 3.6;
        const tail = k > 0.72 ? 0.9 * Math.abs(u - 0.5) * ((k - 0.72) / 0.28) : 0;      // swallow-tail
        a.setXYZ(i, px, py + tail + 0.1 * Math.sin(u * 5) * u, 0.28 * Math.sin(u * 6 + k * 3) * u);
      }
      g.computeVertexNormals();
      sc.add(mesh(g, cloth(col), V(x + 1.08 - Math.sin(lean) * 2.6, 6.9, z), [0, -0.25, 0]));
    };
    banner(-6.2, -6.2, 0xd8423c, 0.02); banner(5.4, -6.4, 0x2f4dc0, -0.02);
    // gardens below the wall: bushes and trees
    const lf = (c: number) => toon(c, { detail: 'leaf', detailAmount: 0.7, detailScale: 0.9 });
    const leaf = [lf(0x5fb244), lf(0x74c452), lf(0x4f9f40)];
    for (let i = 0; i < 46; i++) {
      const x = -46 + rnd() * 92, z = -11 - rnd() * 60, r = 2.4 + rnd() * 3;
      const f = foliage(r, leaf[i % 3]!, i); f.position.set(x, -9 + r * 0.6, z); sc.add(f);
    }
    for (let i = 0; i < 9; i++) {
      const x = (i % 2 ? -1 : 1) * (9.5 + rnd() * 16), z = -10.5 - rnd() * 10, h = 9.5 + rnd() * 3;
      sc.add(mesh(new THREE.CylinderGeometry(0.35, 0.5, h, 8), toon(0x8a5a36), V(x, h / 2 - 9, z)));
      for (let j = 0; j < 3; j++) { const f = foliage(2.4 + rnd() * 1.2, leaf[(i + j) % 3]!, i * 3 + j); f.position.set(x + (rnd() - 0.5) * 2.6, h - 9 + rnd() * 1.6, z + (rnd() - 0.5) * 2); sc.add(f); }
    }
    // rolling hills, a far castle, blue mountains
    const hill = [toon(0x86c85a), toon(0x74b85a), toon(0x8fcf74)];
    for (let i = 0; i < 12; i++) { const a = -1.3 + i * 0.24, r = 120 + rnd() * 90, s = 40 + rnd() * 40; sc.add(mesh(ball(1, 24, 12), hill[i % 3]!, V(Math.sin(a) * r, -s * 0.62 - 2, -Math.cos(a) * r), undefined, V(s * 1.6, s, s * 1.2))); }
    const wallC = toon(0xf0e4c8), roof = toon(0xd8504a), cg = new THREE.Group();
    for (const [x, z, h, r] of [[0, 0, 26, 5], [-11, 2, 18, 4], [11, 3, 20, 4.2], [-5, -8, 32, 3.4], [6, -7, 22, 3]] as const) {
      cg.add(mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 14), wallC, V(x, h / 2, z)));
      cg.add(mesh(new THREE.ConeGeometry(r * 1.25, r * 2.4, 14), roof, V(x, h + r * 1.2, z)));
    }
    cg.add(mesh(rbox(30, 12, 6, 0.3, 1), wallC, V(0, 6, 3)));
    cg.position.set(-30, 14, -250); cg.scale.setScalar(1.4); sc.add(cg);
    sc.add(mesh(ball(1, 24, 12), hill[1]!, V(-30, -40, -256), undefined, V(110, 56, 60)));
    for (let i = 0; i < 16; i++) {
      const a = -1.5 + i * 0.2 + (rnd() - 0.5) * 0.1, r = 560 + rnd() * 120, h = 50 + rnd() * 60;
      sc.add(mesh(new THREE.ConeGeometry(h * (1.3 + rnd() * 0.6), h, 6), toon(0x86a6e6, { flat: true }), V(Math.sin(a) * r, h / 2 - 20, -Math.cos(a) * r), [0, rnd() * 3, 0]));
    }
    // the knight
    const k = buildKnight();
    k.root.position.set(-0.25, 0.1, 0); k.root.rotation.y = 0.2;
    sc.add(k.root);
    // foreground, out of focus, kept to the edges: flowers in a planter low on the right, a leafy branch in the top corner
    sc.add(mesh(rbox(3.4, 0.7, 1.2, 0.08, 2), st[3]!, V(4.5, 0.3, 10.4), [0, -0.3, 0]));
    const blade = toon(0x5fb040, { side: THREE.DoubleSide });
    for (let i = 0; i < 26; i++) sc.add(spike(V(3.4 + rnd() * 2.2, 0.6, 10.2 + rnd() * 0.6), V((rnd() - 0.5) * 0.7 + 0.2, 1, (rnd() - 0.5) * 0.3), 0.25 + rnd() * 0.45, 0.035, blade, 4));
    for (let i = 0; i < 9; i++) sc.add(mesh(ball(0.085, 10, 8), toon([0xff6b6b, 0xffd24a, 0xffffff][i % 3]!), V(3.5 + rnd() * 2.0, 0.95 + rnd() * 0.3, 10.2 + rnd() * 0.5), undefined, V(1, 0.6, 1)));
    sc.add(mesh(new THREE.CylinderGeometry(0.03, 0.045, 3.2, 6), toon(0x8a5a36), V(0.2, 3.72, 10.9), [0, 0, 1.35]));
    for (let i = 0; i < 11; i++) sc.add(mesh(ball(0.5, 12, 8), toon([0x4f9e3a, 0x62b449][i % 2]!, { side: THREE.DoubleSide }), V(-1.2 + i * 0.27 + rnd() * 0.1, 3.6 + (rnd() - 0.5) * 0.45 - i * 0.03, 10.9 + (rnd() - 0.5) * 0.3), [rnd() * 0.8, rnd() * 3, rnd() * 0.8], V(0.62, 0.05, 0.3)));
    shadows(sc);
    this.addDust(sc, 50, V(0, 2.8, 4), V(6, 3, 7), 0xfff4d0, 0.06, 1.6);
    S.aimSun(V(0, 1, 2), 22);
    S.cam.fov = 33;
  }

  // ------------------------------------------------------------------ shot 2: the dragon
  buildDragonShot() {
    const S = (this.stage = new Stage(DRAGON_LOOK)), sc = S.scene, rnd = mulberry32(21);
    sc.add(mesh(new THREE.CircleGeometry(700, 64), toon(0xedc998, { detail: 'stone', detailAmount: 0.5, detailScale: 0.5 }), V(0, 0, 0), [-Math.PI / 2, 0, 0]));
    // the arena wall: two tiers of piers and lintels, broken in places, with banners
    const wall = [toon(0xf0d6b4, { detail: 'stone', detailAmount: 0.6, detailScale: 0.25 }), toon(0xe6c8a2, { detail: 'stone', detailAmount: 0.6, detailScale: 0.25 })];
    const flag = [toon(0xd8423c, { side: THREE.DoubleSide }), toon(0x2f4dc0, { side: THREE.DoubleSide })];
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2, R = 64, x = Math.sin(a) * R, z = -8 - Math.cos(a) * R, tiers = rnd() < 0.18 ? 1 : rnd() < 0.35 ? 3 : 2;
      for (let j = 0; j < tiers; j++) {
        sc.add(mesh(rbox(3.2, 8.6, 4.4, 0.2, 1), wall[(i + j) % 2]!, V(x, 4.3 + j * 10.4, z), [0, -a, 0]));
        sc.add(mesh(rbox(10.2, 1.8, 4.8, 0.2, 1), wall[(i + j + 1) % 2]!, V(x, 9.5 + j * 10.4, z), [0, -a, 0]));
      }
      if (i % 4 === 1) { const top = tiers * 10.4 + 5; sc.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 8, 6), toon(0x8a5a36), V(x, top, z))); sc.add(mesh(new THREE.PlaneGeometry(4.5, 2.6), flag[(i >> 2) % 2]!, V(x + 2.3, top + 2.4, z), [0, -a, 0])); }
    }
    // the dragon, and the knight below it with their back to us
    const d = buildDragon();
    d.root.scale.setScalar(1.6); d.root.position.set(0.3, 0, -1);
    sc.add(d.root);
    const k = buildKnight({ glow: 1.3 });
    k.root.position.set(-0.7, 0, 4.6); k.root.rotation.y = Math.PI + 0.1;
    sc.add(k.root);
    // foreground, out of focus: fallen stone, a lost shield
    for (let i = 0; i < 12; i++) sc.add(mesh(rbox(0.5 + rnd() * 1.4, 0.3 + rnd() * 0.8, 0.5 + rnd() * 1.1, 0.1), wall[i % 2]!, V((rnd() < 0.5 ? -1 : 1) * (1.9 + rnd() * 3.2), 0.25, 17.6 + rnd() * 2.8), [rnd(), rnd() * 3, rnd()]));
    const sh = buildShield(); sh.position.set(2.5, 0.85, 19.2); sh.rotation.set(-0.9, -0.5, 0.4); sc.add(sh);
    shadows(sc);
    const g1 = puff(0xff9a3a, 0.5, 6.5, V(0.3, 12.6, 2.6), true), g2 = puff(0xffe08a, 0.5, 2.8, V(0.3, 12.8, 2.0), true);
    sc.add(g1, g2);
    this.addDust(sc, 120, V(0.3, 8, 6), V(11, 8, 9), 0xffb050, 0.2, 2.2);
    S.aimSun(V(0, 8, 0), 46);
    S.cam.fov = 56;
  }

  /** Motes in the air (dust in the sun, embers), drifting; positions are a pure function of time. */
  private drift: { base: Float32Array; seed: Float32Array } | null = null;
  addDust(sc: THREE.Scene, n: number, c: THREE.Vector3, half: THREE.Vector3, color: number, size: number, intensity: number) {
    const rnd = mulberry32(99), base = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { base[i * 3] = c.x + (rnd() * 2 - 1) * half.x; base[i * 3 + 1] = c.y + (rnd() * 2 - 1) * half.y; base[i * 3 + 2] = c.z + (rnd() * 2 - 1) * half.z; seed[i] = rnd() * 100; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ map: softDot(), color: new THREE.Color(color).multiplyScalar(intensity), size, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    this.dust.layers.set(NO_INK);
    this.drift = { base, seed };
    sc.add(this.dust);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const S = this.stage, lt = f.lt, cam = S.cam;
    if (this.drift) {
      const p = this.dust.geometry.attributes.position as THREE.BufferAttribute, { base, seed } = this.drift, up = this.subject === 'dragon' ? 0.9 : 0.12;
      for (let i = 0; i < seed.length; i++) {
        const s = seed[i]!;
        p.setXYZ(i, base[i * 3]! + 0.35 * Math.sin(lt * 0.6 + s), base[i * 3 + 1]! + ((lt * up * (0.6 + (s % 1))) % 6) + 0.2 * Math.sin(lt * 0.9 + s * 2), base[i * 3 + 2]! + 0.3 * Math.cos(lt * 0.5 + s * 1.3));
      }
      p.needsUpdate = true;
    }
    const k = (lt - 3) / 3; // -1..1 through the shot: a slow push
    if (this.subject === 'knight') {
      cam.position.set(2.2 - 0.2 * k, 1.25 + 0.05 * k, 12.5 - 0.5 * k);
      cam.lookAt(-0.1, 1.95, 0);
      S.render(this.ctx.renderer, out, f.t);
      return { hud: 0, bloom: 0.5, bloomThreshold: 0.92, bloomKnee: 0.4, halation: 0.16, halationTint: [1, 0.75, 0.45], ca: 0.4, grain: 0.02, vignette: 0.16, exposure: 1.0 };
    }
    cam.position.set(1.0 - 0.15 * k, 2.0, 22 - 0.6 * k);
    cam.lookAt(0.2, 7.5 + 0.15 * k, 0);
    S.render(this.ctx.renderer, out, f.t);
    return { hud: 0, bloom: 0.6, bloomThreshold: 0.95, bloomKnee: 0.4, halation: 0.22, halationTint: [1, 0.6, 0.3], ca: 0.4, grain: 0.02, vignette: 0.2, exposure: 1.0 };
  }
}
