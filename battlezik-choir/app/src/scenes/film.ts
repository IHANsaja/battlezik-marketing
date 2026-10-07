// "WORTHY" — the film. One module plays every movement: the timeline's entries all load it, and it
// picks the shot for the current time. Script times are in seconds on the track's beat grid
// (battlezik-choir/SCRIPT.md); t below is song time minus the grid's offset, so 64.0 is the hit at 1:04.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font, layout, fitSize } from '../engine/type';
import { clamp, ease, lerp, pulse, hash, noise1, springStep, TAU } from '../engine/util';
import { SAFE_C, SAFE_W } from './_kit';
import { V, type Stage, type Look } from './_toon';
import { KP, DP, walk, poseAt, mix, add, type Pose } from './_cast';
import { LOOKS, STN, buildHall, buildRoad, buildArena, buildSky, flicker, type Hall, type Road, type Arena, type Sky } from './_worlds';

const sm = (t: number, a: number, b: number) => ease.inOutCubic(clamp((t - a) / (b - a)));
const lin = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const BASE: PostOverrides = { hud: 0, bloom: 0.5, bloomThreshold: 0.92, bloomKnee: 0.4, halation: 0.16, halationTint: [1, 0.72, 0.42], ca: 0.4, grain: 0.02, vignette: 0.16, exposure: 1 };

// ================================================================== the words
type Cue = { a: number; b: number; s: string; f: 'B' | 'C' | 'W' | 'G'; y: number; max?: number; in?: 'slam' | 'ink' | 'rise' | 'drop' | 'steps'; out?: 'fade' | 'burn' | 'shatter' | 'split'; step?: number; at?: number };
const top = 470, low = 1350;
/** Positions and sizes of the drawn layer are written for the 9:16 frame; the 16:9 cut scales them. */
const WIDE = W > H, YS = H / 1920, TS = WIDE ? 0.72 : 1;
const sx = (x: number) => W / 2 + (x - 540) * TS, sy = (y: number) => y * YS;
const CUES: Cue[] = [
  { a: 0.3, b: 3.9, s: 'NO ONE KNOWS\nYOUR NAME', f: 'C', y: top, in: 'ink' },
  { a: 4.2, b: 7.9, s: 'NO CREST.', f: 'C', y: top - 60, in: 'slam' }, { a: 6.0, b: 7.9, s: 'NO CROWN.', f: 'C', y: top + 70, in: 'slam' },
  { a: 8.05, b: 11.8, s: 'NO ONE\nIS COMING', f: 'C', y: top, in: 'slam' },
  { a: 12.4, b: 15.0, s: 'But the fire\nhas not gone out.', f: 'W', y: low - 40, max: 84, in: 'ink' },
  { a: 19.0, b: 23.8, s: 'STAND', f: 'B', y: top - 20, in: 'slam', out: 'burn', at: 23.0 }, { a: 20.0, b: 23.8, s: 'UP', f: 'B', y: top + 290, max: 400, in: 'rise', out: 'burn', at: 23.0 },
  { a: 24.05, b: 25.9, s: 'TAKE UP\nTHE BLADE', f: 'C', y: low - 60, in: 'slam' },
  { a: 26.05, b: 27.9, s: 'BUCKLE\nTHE STEEL', f: 'C', y: top - 40, in: 'slam' },
  { a: 28.05, b: 29.9, s: 'LOWER\nTHE VISOR', f: 'C', y: low - 60, in: 'slam' },
  { a: 30.0, b: 31.9, s: 'WALK', f: 'B', y: top, in: 'steps', step: 0.5 },
  { a: 32.05, b: 33.9, s: 'THE ROAD\nIS LONG', f: 'C', y: top, in: 'slam' },
  { a: 34.05, b: 35.9, s: 'EVERY SCAR\nIS A LESSON', f: 'C', y: top, in: 'ink' },
  { a: 36.05, b: 37.9, s: 'EVERY LOSS,\nA WHETSTONE', f: 'C', y: top, in: 'ink' },
  { a: 38.05, b: 39.9, s: 'THEY WILL NOT\nSEE YOU COMING', f: 'C', y: low - 40, in: 'ink' },
  { a: 40.05, b: 41.9, s: 'KEEP WALKING', f: 'C', y: top, in: 'slam' },
  { a: 42.05, b: 43.9, s: 'YOU WERE NOT\nBORN FOR THIS', f: 'C', y: top, in: 'ink' },
  { a: 44.05, b: 45.7, s: 'YOU CHOSE IT', f: 'C', y: top, in: 'slam' },
  { a: 46.0, b: 47.8, s: 'THE ARENA', f: 'B', y: top, in: 'slam' },
  { a: 50.0, b: 51.6, s: 'STRIKE', f: 'B', y: top, in: 'slam', out: 'split', at: 50.5 },
  { a: 52.3, b: 53.8, s: 'AGAIN', f: 'B', y: top, in: 'slam' }, { a: 54.0, b: 55.8, s: 'AGAIN', f: 'B', y: top, in: 'slam' },
  { a: 56.05, b: 57.4, s: 'HARDER', f: 'B', y: top, in: 'slam', out: 'shatter', at: 56.6 },
  { a: 64.05, b: 67.2, s: 'YOU FELL.', f: 'C', y: top + 40, in: 'drop' },
  { a: 68.05, b: 71.2, s: 'YOU ROSE.', f: 'C', y: top + 40, in: 'rise' },
  { a: 72.05, b: 78.3, s: 'THAT IS WHAT\nMAKES YOU\nWORTHY.', f: 'G', y: top - 30, in: 'ink' },
  { a: 82.0, b: 83.7, s: 'NOW', f: 'B', y: top, in: 'slam' },
  { a: 84.05, b: 87.7, s: 'THEY SEE YOU', f: 'C', y: top, in: 'slam' },
  { a: 88.6, b: 91.7, s: 'THEY KNOW\nYOUR NAME', f: 'C', y: top, in: 'slam' },
  { a: 92.05, b: 95.7, s: 'NO ONE\nGAVE YOU THIS', f: 'C', y: top, in: 'ink' },
  { a: 96.05, b: 99.7, s: 'YOU TOOK IT', f: 'B', y: low - 20, in: 'slam' },
  { a: 108.05, b: 111.8, s: 'WHERE THE\nWORTHY RISE', f: 'G', y: 1400, max: 80, in: 'ink' },
  { a: 114.05, b: 119.2, s: 'YOUR LEGEND\nIS WAITING', f: 'C', y: 1210, max: 96, in: 'slam' },
  { a: 116.05, b: 119.2, s: 'BATTLEZIK.COM', f: 'G', y: 1440, max: 78, in: 'slam' },
];
const INK = '#2b1c52';

function drawCue(c: CanvasRenderingContext2D, q: Cue, t: number) {
  if (t < q.a || t >= q.b) return;
  const fam = q.f === 'B' ? F.black() : q.f === 'W' ? F.serif(600, true) : F.caps(900);
  const lines = q.s.split('\n'), longest = lines.reduce((a, b) => (a.length >= b.length ? a : b));
  const size = fitSize(longest, fam, WIDE ? 1250 : SAFE_W - 30, (q.max ?? (q.f === 'B' ? 330 : q.f === 'W' ? 54 : 128)) * TS);
  const lh = size * (q.f === 'B' ? 0.92 : 1.12), u = t - q.a;
  let alpha = Math.min(1, u / 0.06) * (1 - sm(t, q.b - 0.25, q.b)), sc = 1, dy = 0;
  const kin = q.in ?? 'ink';
  if (kin === 'slam') sc = 1 + 1.5 * (1 - ease.outExpo(clamp(u / 0.2)));
  if (kin === 'rise') { dy = 160 * (1 - ease.outBack(clamp(u / 0.4))); alpha *= clamp(u / 0.12); }
  if (kin === 'drop') dy = -620 * (1 - Math.min(1, springStep(u, 2.6, 0.5)));
  const o = q.out && q.at !== undefined && t > q.at ? t - q.at : -1;
  const fill = q.f === 'G' ? '#ffd45a' : '#fff8e6';
  c.save();
  c.translate(SAFE_C.x, sy(q.y) + dy * YS);
  const jit = kin === 'slam' ? 16 * pulse(t, q.a, 0.07) : 0;
  c.translate(jit * noise1(t * 50, 1), jit * noise1(t * 50, 2));
  c.scale(sc, sc);
  c.font = font(fam, size); c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  let gi = 0;
  const total = q.s.replace(/\s/g, '').length;
  lines.forEach((ln, li) => {
    const lay = layout(ln, fam, size), y = (li - (lines.length - 1) / 2) * lh + size * 0.34;
    for (const g of lay.glyphs) {
      if (g.ch === ' ') continue;
      const k = gi++;
      let a = alpha, gx = -lay.width / 2 + g.x, gy = y, rot = 0, col = fill;
      if (kin === 'ink') a *= clamp((u - (k / total) * Math.min(1.1, total * 0.05)) / 0.09);
      if (kin === 'steps') { const s = u - k * (q.step ?? 0.5); a *= s < 0 ? 0 : 1; gy -= 60 * pulse(u, k * (q.step ?? 0.5), 0.08); }
      if (o >= 0 && q.out === 'burn') { const b = clamp((o - hash(k, 7) * 0.45) / 0.3); a *= 1 - b; col = b > 0.05 ? '#ff8a2a' : fill; gy -= 40 * b; }
      if (o >= 0 && q.out === 'shatter') { const b = clamp(o / 0.5); a *= 1 - b; gx += (hash(k, 3) - 0.5) * 520 * b; gy += (hash(k, 4) - 0.4) * 520 * b; rot = (hash(k, 5) - 0.5) * 3 * b; }
      if (o >= 0 && q.out === 'split') { const b = ease.outExpo(clamp(o / 0.3)); gy += (k < total / 2 ? -1 : 1) * 46 * b; gx += (k < total / 2 ? -1 : 1) * 30 * b; rot = (k < total / 2 ? -1 : 1) * 0.05 * b; }
      if (a <= 0.003) continue;
      c.save(); c.globalAlpha = a; c.translate(gx + g.w / 2, gy); c.rotate(rot);
      c.lineWidth = size * 0.16; c.strokeStyle = INK; c.strokeText(g.ch, -g.w / 2, size * 0.045);
      c.fillStyle = INK; c.fillText(g.ch, -g.w / 2, size * 0.07);
      c.fillStyle = col; c.fillText(g.ch, -g.w / 2, 0);
      if (q.f === 'G') { c.globalAlpha = a * 0.55; c.fillStyle = '#fff6c8'; c.save(); c.beginPath(); c.rect(-g.w, -size, g.w * 2, size * 0.52); c.clip(); c.fillText(g.ch, -g.w / 2, 0); c.restore(); }
      c.restore();
    }
  });
  c.restore();
}

// ================================================================== the film
interface Worlds { hall: Hall; road: Road; arena: Arena; sky: Sky; mark: HTMLImageElement }
let worlds: Promise<Worlds> | null = null;
function loadImage(src: string) { return new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(`image not found: ${src}`)); im.src = src; }); }

export default class Film extends Scene {
  w!: Worlds;
  ui = new Layer2D();
  post: PostOverrides = {};
  lens = { focus: 10, aperture: 140 };

  override async init() {
    worlds ??= (async () => ({ hall: buildHall(), road: buildRoad(), arena: buildArena(), sky: await buildSky(), mark: await loadImage('brand/wordmark.png') }))();
    this.w = await worlds;
  }

  /** Place the camera; the lens focuses on `focus` (a point) unless told otherwise. */
  cam(S: Stage, p: [number, number, number], l: [number, number, number], fov: number, focus?: THREE.Vector3 | number, ap = 140) {
    S.cam.position.set(...p); S.cam.lookAt(...l); S.cam.fov = fov;
    this.lens.focus = typeof focus === 'number' ? focus : S.cam.position.distanceTo(focus ?? V(...l));
    this.lens.aperture = ap;
  }
  light(S: Stage, L: Look, at: THREE.Vector3, size: number) { S.setLook(L); S.aimSun(at, size); }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const t = f.t - this.ctx.audio.beats[0]!, U = this.ui, c = U.ctx;
    U.clear();
    this.post = { ...BASE };
    const S = t < 32 ? this.hall(t) : t < 46 ? this.road(t) : t < 100 ? this.arena(t, c) : this.sky(t, c);
    S.render(this.ctx.renderer, out, f.t, this.lens);
    for (const q of CUES) drawCue(c, q, t);
    this.ctx.comp.draw(this.ctx.renderer, U.upload(), out);
    return this.post;
  }

  // ------------------------------------------------------------------ I-III: the hall
  hall(t: number): Stage {
    const { stage: S, knight: K, fire, fireLight, ember, leanShield, door } = this.w.hall, P = this.post;
    this.light(S, LOOKS.dawn, V(0, 2, 0), 18);
    let pose: Pose = KP.sit, power = 0.06, burn = 0.6;
    const doorMat = door.material as THREE.MeshBasicMaterial;
    K.shield.visible = t >= 27.5; leanShield.visible = t < 27.5; doorMat.opacity = 0;
    // armour buckled on in Gathering: right shoulder, left shoulder, tassets, shield
    const pop = (at: number) => (t < at ? 0 : ease.outBack(clamp((t - at) / 0.22)));
    const [tasR, tasL, p1R, p2R, p1L, p2L, shd] = K.armour;
    for (const o of [p1R!, p2R!]) o.scale.copy(o.userData.s ?? (o.userData.s = o.scale.clone())).multiplyScalar(pop(26.0));
    for (const o of [p1L!, p2L!]) o.scale.copy(o.userData.s ?? (o.userData.s = o.scale.clone())).multiplyScalar(pop(26.5));
    for (const o of [tasR!, tasL!]) o.scale.setScalar(pop(27.0));
    shd!.scale.setScalar(1.22 * Math.max(0.001, pop(27.5)));
    let eye = 0.55;
    if (t < 4) {                                                        // alone at the fire
      const k = t / 4;
      this.cam(S, [1.5 - 0.3 * k, 2.2, 13.5 - 1.5 * k], [0.4, 2.7, 0.2], 34, V(0, 1.5, 0));
      P.fade = 1 - sm(t, 0.05, 2.4);
    } else if (t < 8) {                                                 // the blank shield
      const k = (t - 4) / 4;
      this.cam(S, [7.2 - 0.3 * k, 1.6, 6.2 - 0.4 * k], [3.4, 1.7, 0.1], 30, V(3.35, 1, 0.3), 110);
    } else if (t < 12) {                                                // the gust
      const g = pulse(t, 8.05, 0.55);
      burn = 0.6 - 0.5 * g; pose = add(KP.sit, { capeX: 0.5 * g, capeZ: 0.3 * g, headX: 0.12 * g });
      this.cam(S, [-3.6 + 0.2 * (t - 8), 1.9, 11.5], [0.4, 2.7, 0.3], 36, V(0, 1.5, 0));
      P.shake = [10 * g * noise1(t * 40, 1), 6 * g * noise1(t * 40, 2)];
      this.streaks(t, 8.05, 1.6);
    } else if (t < 15) {                                                // the thread of light
      power = lerp(0.06, 1, sm(t, 12.3, 14.4));
      K.set(pose); K.root.updateMatrixWorld(true);
      const b = K.blade.getWorldPosition(V()), k = (t - 12) / 3;
      this.cam(S, [b.x + 1.5 - 0.3 * k, b.y + 0.75, b.z + 2.6 - 0.4 * k], [b.x, b.y + 0.05, b.z], 28, b, 120);
    } else if (t < 19) {                                                // the horn: the helm lifts
      power = 1; eye = lerp(0.55, 1.1, sm(t, 15.3, 16.3));
      pose = add(KP.sit, { headX: -0.62 * sm(t, 15.2, 16.4), torsoX: -0.14 * sm(t, 15.2, 16.4) });
      this.cam(S, [2.6, 1.9, 6.6 - 0.2 * (t - 15)], [0.1, 2.2, 0.3], 30, V(0, 1.9, 0.3));
      P.fade = sm(t, 17.0, 17.7);
    } else if (t < 24) {                                                // STAND / UP
      power = 1; eye = 1.1;
      pose = poseAt(t, [[19, add(KP.sit, { headX: -0.62, torsoX: -0.14 })], [20.9, add(KP.sit, { headX: -0.62, torsoX: -0.14 })], [23.2, KP.stand]]);
      this.cam(S, [0.9, 0.9, 12 - 0.15 * (t - 19)], [0, 3.6, 0], 36, V(0, 1.8, 0));
      P.flash = 0.55 * pulse(t, 19.0, 0.1) + 0.7 * pulse(t, 20.0, 0.1);
      const h = pulse(t, 19.0, 0.09) + 1.3 * pulse(t, 20.0, 0.09);
      P.shake = [16 * h * noise1(t * 45, 1), 16 * h * noise1(t * 45, 2)]; P.zoom = 1 + 0.03 * h;
    } else if (t < 26) {                                                // the hand closes on the hilt
      power = 1; eye = 1.1; pose = mix(KP.stand, KP.hold, sm(t, 24.0, 24.5));
      K.set(pose); K.root.updateMatrixWorld(true);
      const hd = K.sword.getWorldPosition(V());
      this.cam(S, [hd.x + 0.9, hd.y + 0.15, hd.z + 2.7 - 0.25 * (t - 24)], [hd.x + 0.1, hd.y - 0.25, hd.z], 30, hd, 120);
      power = 1 + 0.8 * pulse(t, 24.05, 0.25);
      P.zoom = 1 + 0.03 * pulse(t, 24.05, 0.1);
    } else if (t < 28) {                                                // the steel goes on, a piece a beat
      power = 1; eye = 1.1; pose = KP.stand;
      this.cam(S, [0.9, 2.3, 10], [0, 2.9, 0], 34, V(0, 2, 0));
      const b = [26, 26.5, 27, 27.5].reduce((a, x) => a + pulse(t, x + 0.04, 0.07), 0);
      P.zoom = 1 + 0.025 * b; P.shake = [5 * b * noise1(t * 40, 1), 5 * b * noise1(t * 40, 2)];
    } else if (t < 30) {                                                // the visor
      power = 1; eye = t < 28.5 ? 0 : 1.4 - 0.3 * sm(t, 28.5, 29.2);
      pose = add(KP.stand, { headX: 0.28 * pulse(t, 28.5, 0.12), headY: 0.1 });
      this.cam(S, [0.9, 3.3, 3.1 - 0.15 * (t - 28)], [0, 3.32, 0.3], 30, V(0, 3.3, 0.4), 120);
      P.flash = 0.25 * pulse(t, 28.5, 0.08); P.zoom = 1 + 0.03 * pulse(t, 28.5, 0.1);
    } else {                                                            // out into the light
      power = 1; eye = 1.1; doorMat.opacity = 1;
      const u = t - 30;
      pose = add(walk(u), { yaw: Math.PI, z: -1.7 * u });
      this.cam(S, [1.4, 1.4, 10.5 - 0.4 * u], [0, 3.0, -2.2], 36, V(0, 2, -1.7 * u));
      P.flash = 0.5 * sm(t, 31.3, 32); P.bloom = 0.8;
    }
    K.set(pose); K.power(power, t);
    for (const e of K.eyes) e.scale.set(eye, 1.15 * eye, 0.6);
    flicker(fire, t, burn); fireLight.intensity = 22 * burn * (0.85 + 0.15 * Math.sin(t * 13));
    ember.scale.setScalar(1 + 0.25 * Math.sin(t * 4) + power);
    return S;
  }

  // ------------------------------------------------------------------ IV: the road
  road(t: number): Stage {
    const { stage: S, knight: K, wheel, sparks, doors, gateGlow, grindBlade } = this.w.road, P = this.post;
    let pose: Pose, storm = true;
    K.root.visible = true; grindBlade.visible = false; sparks.visible = false;
    for (const d of doors) d.rotation.y = 0;
    if (t < 34) {                                                       // the ridge in the storm
      const x = -7 + 1.5 * (t - 32);
      pose = add(walk((t - 32) * 0.9), { yaw: Math.PI / 2, x, y: 0.4 });
      this.light(S, LOOKS.storm, V(x, 2, 0), 26);
      this.cam(S, [x + 1, 4.2 + 0.2 * (t - 32), 26], [x + 1.5, 4.2, 0], 40, V(x, 2, 0));
      P.flash = 0.9 * pulse(t, 32.05, 0.08) + 0.5 * pulse(t, 33.1, 0.05);
    } else if (t < 36) {                                                // the old battlefield
      const x = STN - 4 + 1.5 * (t - 34);
      pose = add(walk((t - 34) * 0.9), { yaw: Math.PI / 2, x, y: 0.15 });
      this.light(S, LOOKS.storm, V(x, 2, 0), 22);
      this.cam(S, [x + 3, 1.5, 8.5], [x + 0.6, 2.0, -1], 34, V(x, 2, 0));
    } else if (t < 38) {                                                // the whetstone
      K.root.visible = false; grindBlade.visible = true; sparks.visible = true; pose = KP.stand;
      const gx = STN * 2;
      this.light(S, LOOKS.storm, V(gx, 1.5, 0), 10);
      wheel.rotation.x = t * 13;
      const sp = sparks.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < sp.count; i++) {
        const age = (t * 2.2 + hash(i, 1)) % 1, a = -0.5 + hash(i, 2) * 1.3, v = 2.5 + hash(i, 3) * 3.5;
        sp.setXYZ(i, gx + (hash(i, 4) - 0.5) * 0.25 + (hash(i, 5) - 0.5) * 1.4 * age, 2.42 + Math.sin(a) * v * age - 3.2 * age * age, 0.5 + Math.cos(a) * v * age * 0.9);
      }
      sp.needsUpdate = true;
      this.cam(S, [gx + 2.9, 2.5, 3.6 - 0.2 * (t - 36)], [gx + 0.1, 2.05, 0.45], 30, V(gx, 2.4, 0.5), 120);
    } else if (t < 40) {                                                // beneath the champions
      const z = 5 - 1.5 * (t - 38), x = STN * 3;
      pose = add(walk((t - 38) * 0.9), { yaw: Math.PI, x, z, y: 0.15 });
      this.light(S, LOOKS.storm, V(x, 6, z - 14), 46);
      this.cam(S, [x + 0.8, 1.0, z + 15 - 0.6 * (t - 38)], [x, 15 + 0.6 * (t - 38), z - 22], 58, V(x, 2, z), 60);
    } else if (t < 42) {                                                // the storm breaks: the arena
      storm = false;
      const i = 1 + 1.0 * (t - 40), x = STN * 4 + Math.sin(i * 0.12) * 3, z = 8 - i * 1.56, y = 0.15 + i * 0.28;
      pose = add(walk((t - 40) * 0.9), { yaw: Math.PI, x, z, y });
      this.light(S, LOOKS.day, V(x, y + 2, z - 6), 30);
      this.cam(S, [x + 2.2, y + 1.3, z + 8.5], [STN * 4, 24, -110], 42, V(x, y + 2, z));
      P.flash = 0.6 * pulse(t, 40.0, 0.15);
    } else if (t < 44) {                                                // the last stair
      storm = false;
      const z = -1.5 - 3.2 * (t - 42), x = STN * 5, y = 0.5 + (-z / 1.4) * 0.5;
      pose = add(walk((t - 42) * 1.1), { yaw: Math.PI, x, z, y, torsoX: 0.12 });
      this.light(S, LOOKS.day, V(x, y + 4, z - 8), 34);
      this.cam(S, [x + 12, y + 2.5 + 0.5 * (t - 42), z + 13], [x - 1, y + 4.5, z - 5], 46, V(x, y + 2, z));
    } else {                                                            // the doors
      storm = false;
      const x = STN * 5, k = sm(t, 44.1, 45.7);
      for (const [i, d] of doors.entries()) d.rotation.y = (i ? -1 : 1) * 1.45 * k;
      pose = add(walk((t - 44) * 0.9), { yaw: Math.PI, x, z: -21 - 2.5 * (t - 44), y: 8 });
      this.light(S, LOOKS.day, V(x, 12, -24), 34);
      this.cam(S, [x + 1.2 * (1 - k), 10 + 1.5 * k, -8 - 14 * ease.inCubic(lin(t, 44, 46))], [x, 13.5, -40], 44, V(x, 10, -26));
      P.flash = 1.4 * sm(t, 45.1, 46.0); P.bloom = 0.9;
      (gateGlow.material as THREE.MeshBasicMaterial).color.setScalar(1.5 + 3 * k);
    }
    K.set(pose); K.power(1, t);
    if (storm) { this.rain(t); P.vignette = 0.3; }
    return S;
  }

  // ------------------------------------------------------------------ V-VII: the arena
  arena(t: number, c: CanvasRenderingContext2D): Stage {
    const A = this.w.arena, { stage: S, knight: K, dragon: D } = A, P = this.post;
    const HOME = { x: 0.3, z: -1 };
    A.lostShield.visible = A.lostSword.visible = A.pillar.visible = A.wedge.visible = A.crestShield.visible = false;
    for (const d of A.dust) (d.material as THREE.SpriteMaterial).opacity = 0;
    let kp: Pose = add(KP.guard, { yaw: Math.PI, z: 9 }), dp: Pose = { ...DP.loom }, power = 1, breath = 0, look = LOOKS.sunset;
    let sword = true, shield = true; D.root.visible = true;
    const face = Math.PI;                                               // the knight faces the dragon (-z)
    /** Pose the dragon and return where its head is (poses are set before anything reads positions off them). */
    const place = (p: Pose) => { D.set({ ...p, x: HOME.x + (p.x ?? 0), z: HOME.z + (p.z ?? 0), y: (p.y ?? 0) * 1.6 }); D.root.updateMatrixWorld(true); return D.head.getWorldPosition(V()); };
    const dustBurst = (t0: number, cx: number, cz: number, r: number) => {
      const u = t - t0; if (u < 0 || u > 2.2) return;
      A.dust.forEach((d, i) => { const a = (i / A.dust.length) * TAU, k = ease.outExpo(clamp(u / 1.2)); d.position.set(cx + Math.cos(a) * r * k, 0.8 + 2.2 * k * hash(i, 9), cz + Math.sin(a) * r * k); d.scale.setScalar(3 + 7 * k); (d.material as THREE.SpriteMaterial).opacity = 0.75 * (1 - clamp(u / 2.2)); });
    };
    const blows = (ts: number[], z: number, extra: Pose = {}): Pose => {    // wind up before each beat, cut on it
      let p: Pose = add(KP.guard, {});
      for (const b of ts) if (t >= b - 0.3 && t < b + 0.34) p = poseAt(t, [[b - 0.3, KP.guard], [b - 0.07, KP.windup, ease.outCubic], [b + 0.07, KP.slash, ease.outExpo], [b + 0.34, KP.guard]]);
      return add(p, { yaw: face, z, ...extra });
    };
    const hits = (ts: number[], amp: number) => { const h = ts.reduce((a, b) => a + pulse(t, b + 0.03, 0.08), 0); P.shake = [amp * h * noise1(t * 50, 1), amp * h * noise1(t * 50, 2)]; P.zoom = 1 + 0.02 * h; return h; };

    if (t < 48) {                                                       // THE ARENA
      D.root.visible = false;
      kp = add(mix(walk((t - 46) * 0.8), KP.guard, sm(t, 47.2, 47.9)), { yaw: face, z: 13 - 2 * Math.min(t - 46, 1.4) });
      this.cam(S, [0, 2.6, 36 - 1.2 * (t - 46)], [0, 6.5, 0], 46, V(0, 2, 10));
      P.flash = 1.2 * (1 - sm(t, 46.0, 46.5));
      hits([46.0], 14);
    } else if (t < 50) {                                                // the dragon lands
      const fall = 1 - ease.inQuad(clamp((t - 47.4) / 0.65)), land = t - 48.05;
      dp = land < 0 ? add(DP.flying, { y: 46 * fall, wingL: 0.7, wingR: 0.7 }) : mix(add(DP.flying, { wingL: 0.7, wingR: 0.7, y: -0.6 * pulse(t, 48.05, 0.12) }), DP.roar, sm(t, 48.3, 49.2));
      dp.wingL = (dp.wingL ?? 0) + 0.18 * Math.sin(t * 9) * (land < 0 ? 1 : pulse(t, 48.05, 0.5));
      dp.wingR = dp.wingL;
      kp = add(KP.guard, { yaw: face, z: 10.2 + 1.2 * sm(t, 48.05, 48.5), torsoX: -0.1 });
      this.cam(S, [1.2, 1.5, 24], [0.3, 4 + 6 * sm(t, 48.1, 49.6), 0], 54, V(0, 8, 2));
      const h = pulse(t, 48.05, 0.22);
      P.shake = [30 * h * noise1(t * 40, 1), 40 * h * noise1(t * 40, 2)]; P.zoom = 1 + 0.05 * pulse(t, 48.05, 0.12);
      dustBurst(48.05, 0, 0, 22);
    } else if (t < 52) {                                                // STRIKE
      const ts = [50.5, 51.0, 51.55];
      kp = t < 50.35 ? add(walk((t - 50) * 2.4, 1.2), { yaw: face, z: 11.4 - 8 * ease.outQuad(lin(t, 50, 50.35)), torsoX: 0.25 }) : blows(ts, 3.4);
      dp = add(DP.loom, { headPitch: 0.25, n4: 0.2 });
      this.cam(S, [3.6 - 0.4 * (t - 50), 1.3, -1.2], [-0.2, 2.5, 5], 44, V(0, 2, 3.4));
      hits(ts, 12);
      for (const b of ts) this.slash(c, t, b, 520, 1010, 330, b === 51.0 ? -0.5 : 0.6);
    } else if (t < 54) {                                                // the tail
      dp = poseAt(t, [[52, DP.loom], [52.06, add(DP.strike, { tail: -1.2, neckYaw: -0.3 }), ease.outExpo], [53.2, DP.loom]]);
      kp = poseAt(t, [[52.0, add(KP.slash, { yaw: face, z: 3.4 })], [52.07, add(KP.thrown, { yaw: face, z: 4 }), ease.outExpo], [52.75, add(KP.thrown, { yaw: face, z: 12.5, y: 0.2 }), ease.outQuad], [53.5, add(KP.kneel, { yaw: face, z: 13.5 })]]);
      this.cam(S, [15, 3, 15], [0, 3.2, 7], 44, V(0, 2, 9));
      hits([52.05], 22);
      dustBurst(52.7, 0, 12.5, 5);
    } else if (t < 56) {                                                // AGAIN: a blow a beat
      const ts = [54.5, 55.0, 55.5];
      kp = t < 54.3 ? add(walk((t - 54) * 2.6, 1.2), { yaw: face, z: 13.5 - 10 * ease.outQuad(lin(t, 54, 54.3)), torsoX: 0.25 }) : blows(ts, 3.5);
      dp = add(DP.loom, { headPitch: 0.3, n4: 0.25, jaw: 0.3 });
      this.cam(S, [-5.8, 3.2, -3.6], [0.4, 2.0, 4.6], 44, V(0, 2, 3.5));
      hits(ts, 12);
      for (const [i, b] of ts.entries()) this.slash(c, t, b, 540, 1000, 330, i % 2 ? 0.5 : -0.6);
    } else if (t < 58) {                                                // HARDER
      kp = blows([56.05], 3.5, { y: 0.5 * pulse(t, 56.05, 0.2) });
      dp = poseAt(t, [[56.0, add(DP.loom, { headPitch: 0.3 })], [56.2, add(DP.roar, { neckYaw: 0.3, pitch: -0.06 }), ease.outExpo], [57.6, DP.loom]]);
      this.cam(S, [-3.0, 0.9, -0.6], [0.2, 2.8, 4.4], 44, V(0, 2, 3.5));
      hits([56.05], 26);
      P.flash = 0.85 * pulse(t, 56.05, 0.08);
      this.slash(c, t, 56.05, 520, 960, 520, -0.75);
    } else if (t < 60) {                                                // the dragon answers: shield, sword, jaws
      shield = t < 58.5; sword = t < 59.0;
      dp = poseAt(t, [[58.0, DP.loom], [58.5, add(DP.strike, { neckYaw: 0.35 }), ease.outExpo], [58.9, DP.loom], [59.0, add(DP.strike, { wingL: 1.0, wingR: -0.2, neckYaw: -0.3 }), ease.outExpo], [59.4, DP.loom], [59.9, DP.breathe]]);
      kp = poseAt(t, [[58.3, add(KP.guard, { yaw: face, z: 3.6 })], [58.56, add(KP.brace, { yaw: face, z: 5 }), ease.outExpo], [59.06, add(KP.brace, { yaw: face, z: 6.4, torsoY: 0.5 }), ease.outExpo], [59.9, add(KP.brace, { yaw: face, z: 7 })]]);
      if (!shield) { const u = t - 58.5; A.lostShield.visible = true; A.lostShield.position.set(1.2 + 9 * Math.min(u, 0.9), Math.max(0.3, 2 + 7 * u - 9 * u * u), 5 + 2 * u); A.lostShield.rotation.set(u * 9, u * 5, 0.3); }
      if (!sword) { const u = t - 59.0; A.lostSword.visible = true; A.lostSword.position.set(-1.2 - 8 * Math.min(u, 0.8), Math.max(1.0, 2.5 + 8 * u - 10 * u * u), 6 + 3 * Math.min(u, 0.8)); A.lostSword.rotation.set(0, 0, u < 0.8 ? u * 14 : 2.6); }
      this.cam(S, [9.5, 2.6, 17 + 1.5 * sm(t, 59.4, 60)], [0, 5.5 + 2.5 * sm(t, 59.4, 60), 0], 50 + 6 * sm(t, 59.4, 60), V(0, 2, 5.5));
      hits([58.5, 59.0, 59.5], 20);
      P.flash = 0.4 * (pulse(t, 58.5, 0.06) + pulse(t, 59.0, 0.06));
    } else if (t < 62) {                                                // fire
      shield = sword = false; A.lostSword.visible = true; A.lostSword.position.set(-7.6, 1.0, 8.4); A.lostSword.rotation.set(0, 0, 2.6);
      dp = add(DP.breathe, { headPitch: 0.06 * Math.sin(t * 20) }); breath = sm(t, 60.0, 60.45);
      kp = add(KP.brace, { yaw: face, z: 7 + 0.8 * (t - 60), torsoX: 0.2 + 0.25 * sm(t, 60.3, 61.8) });
      this.cam(S, [17, 3.6, 5.5 + 0.3 * (t - 60)], [0.3, 6.8, 3.4], 50, V(0, 4, 5));
      const h = breath * (0.4 + 0.2 * noise1(t * 30, 3));
      P.shake = [9 * h * noise1(t * 35, 1), 9 * h * noise1(t * 35, 2)];
      this.warm(c, 0.6 * sm(t, 60.6, 61.8));
      P.halationTint = [1, 0.4, 0.1]; P.bloom = 0.9;
    } else if (t < 64) {                                                // down
      shield = sword = false; A.lostSword.visible = true; A.lostSword.position.set(-7.6, 1.0, 8.4); A.lostSword.rotation.set(0, 0, 2.6);
      breath = 1 - sm(t, 62.0, 62.35); dp = mix(DP.breathe, DP.loom, sm(t, 62.2, 63.2)); power = 1 - sm(t, 62.2, 63);
      kp = poseAt(t, [[62.0, add(KP.brace, { yaw: face, z: 8.6, torsoX: 0.45 })], [62.9, add(KP.kneel, { yaw: face, z: 8.6 })], [63.6, add(KP.lie, { yaw: face, z: 8.6 }), ease.inCubic]]);
      this.cam(S, [5.5, 1.1, 12.5], [0, 1.4, 8.4], 38, V(0, 1, 8.6));
      this.warm(c, 0.6 * (1 - sm(t, 62.0, 62.8)));
      P.fade = sm(t, 63.2, 63.95);
      dustBurst(63.55, 0, 7.4, 4);
    } else if (t < 80) {                                                // VI: YOU FELL / YOU ROSE / WORTHY
      look = LOOKS.dusk; shield = sword = false; D.root.visible = false;
      A.lostSword.visible = true; A.lostSword.position.set(-1.9, 0.12, 6.2); A.lostSword.rotation.set(Math.PI / 2, 0, 1.1);
      power = 0;
      const base = { yaw: face - 0.5, z: 8.6 };
      kp = poseAt(t, [[68.0, add(KP.lie, base)], [70.2, add(KP.kneel, base)], [72.1, add(KP.kneel, base)], [74.8, add(KP.stand, base)]]);
      const u = t < 68 ? t - 64 : t < 72 ? t - 68 : t - 72;
      this.cam(S, [4.4 - 0.1 * u, t < 72 ? 2.6 : 2.0, 14.2 - 0.12 * u], [0, t < 68 ? 0.7 : t < 72 ? 1.3 : 2.2, 7.6], 36, V(0, 1.5, 8));
      P.fade = t < 68 ? sm(t, 65.4, 67.0) : t < 72 ? sm(t, 69.8, 71.0) : t < 78.7 ? sm(t, 75.6, 78.3) : 1;
      P.flash = 0.35 * (pulse(t, 64.05, 0.09) + pulse(t, 68.05, 0.09) + pulse(t, 72.05, 0.09));
      const h = pulse(t, 64.05, 0.1) + pulse(t, 68.05, 0.1) + pulse(t, 72.05, 0.1);
      P.shake = [12 * h * noise1(t * 45, 1), 12 * h * noise1(t * 45, 2)]; P.vignette = 0.45;
      if (t >= 72) { P.halationTint = [1, 0.8, 0.3]; }
      if (t >= 78.7) this.motes(c, t);
    } else if (t < 82) {                                                // VII: the sword wakes
      look = LOOKS.glory; shield = false; power = 1 + 2.4 * sm(t, 80.0, 80.4);
      dp = add(DP.loom, { headPitch: 0.2 });
      kp = poseAt(t, [[80.0, add(KP.stand, { yaw: face, z: 8.6 })], [80.5, add(KP.hold, { yaw: face, z: 8.6, torsoX: -0.1, headX: -0.15 }), ease.outExpo]]);
      this.cam(S, [2.2 - 0.2 * (t - 80), 1.1, 3.2 - 0.4 * (t - 80)], [0, 2.5, 8.6], 40, V(0, 2.4, 8.6));
      P.flash = 0.8 * pulse(t, 80.05, 0.1); hits([80.05], 20); P.halationTint = [0.3, 0.6, 1]; P.bloom = 0.55;
    } else if (t < 84) {                                                // NOW: the fire parts
      look = LOOKS.glory; shield = false; power = 3.4;
      dp = add(DP.breathe, { headPitch: 0.05 * Math.sin(t * 20) }); breath = sm(t, 82.0, 82.3) * 0.82;
      kp = add(KP.brace, { yaw: face, z: 8.6, aRx: 0.2 });
      A.wedge.visible = true; A.wedge.position.set(0.1, 3.0, 5.6); A.wedge.rotation.set(-Math.PI / 2 + 0.55, 0, 0); A.wedge.scale.setScalar(0.85 + 0.12 * Math.sin(t * 30));
      this.cam(S, [17, 3.6, 6], [0.3, 6.8, 3.6], 50, V(0, 3, 6));
      hits([82.0], 14); P.shake = [6 * noise1(t * 35, 1), 6 * noise1(t * 35, 2)]; P.bloom = 0.5;
    } else if (t < 88) {                                                // up the fire
      look = LOOKS.glory; shield = false; power = 3.4;
      breath = 0.82 * (1 - sm(t, 86.2, 87)); dp = add(mix(DP.breathe, DP.loom, sm(t, 86.4, 87.4)), {});
      const u = sm(t, 84, 87.9), hp = place(dp);
      const px = lerp(0, hp.x - 0.5, u), py = lerp(0, hp.y + 0.6, u * u), pz = lerp(8.6, hp.z + 2.2, u);
      kp = add(walk((t - 84) * 2.2, 1.25), { yaw: face, x: px, y: py, z: pz, torsoX: 0.35, aRx: 0.6 });
      const a = 0.5 + (t - 84) * 0.85;
      this.cam(S, [Math.sin(a) * 19, 4 + py * 0.6, 4 + Math.cos(a) * 19], [px * 0.6, 4 + py * 0.6, 3], 46, V(px, py + 2, pz));
      P.shake = [5 * noise1(t * 35, 1), 5 * noise1(t * 35, 2)]; P.bloom = 0.5;
    } else if (t < 92) {                                                // the rising stroke; the dragon falls
      look = LOOKS.glory; shield = false; power = 3.4;
      const hp = place(DP.loom);
      kp = poseAt(t, [[88.0, add(KP.windup, { yaw: face, x: hp.x - 0.5, y: hp.y - 1, z: hp.z + 2.2 })], [88.1, add(KP.slash, { yaw: face, x: hp.x - 0.5, y: hp.y + 2.5, z: hp.z + 1.5 }), ease.outExpo], [89.6, add(KP.stand, { yaw: face, x: -0.2, y: 0, z: 10.5 }), ease.inQuad], [90, add(KP.stand, { yaw: face, x: -0.2, z: 10.5 })]]);
      dp = poseAt(t, [[88.05, DP.loom], [88.2, add(DP.roar, { neckYaw: 0.5, pitch: -0.1 }), ease.outExpo], [89.0, DP.fallen, ease.inCubic], [92, DP.fallen]]);
      this.cam(S, [0.5, 3.2 + 0.4 * (t - 88), 32 - 0.6 * (t - 88)], [0, 6.5 - 1.2 * sm(t, 88.4, 89.4), 0], 46, V(0, 4, 4));
      P.flash = 1.2 * pulse(t, 88.05, 0.1);
      const h = pulse(t, 88.05, 0.1) + 1.4 * pulse(t, 89.0, 0.22);
      P.shake = [30 * h * noise1(t * 40, 1), 34 * h * noise1(t * 40, 2)]; P.zoom = 1 + 0.03 * h;
      this.slash(c, t, 88.05, 540, 960, 1500, Math.PI / 2 - 0.12, '#bfefff', 0.9);
      dustBurst(89.0, 0, 2, 26);
    } else if (t < 96) {                                                // the dragon lowers its head
      look = LOOKS.glory; shield = false; power = 2.2;
      dp = poseAt(t, [[92.0, DP.fallen], [94.2, DP.bow]]);
      D.eyeMat.color.set(0xffc23a).multiplyScalar(lerp(3.2, 0.9, sm(t, 93, 95.5)));
      kp = add(KP.stand, { yaw: face, x: -0.2, z: 10.5 });
      this.cam(S, [-5.2 + 0.2 * (t - 92), 3.1, 17.5], [0.4, 1.9, 7], 40, V(-0.2, 2, 10.5));
    } else {                                                            // YOU TOOK IT: the pillar of light
      look = LOOKS.glory; shield = false; power = 3.6;
      dp = { ...DP.bow }; D.eyeMat.color.set(0xffc23a).multiplyScalar(0.9);
      kp = poseAt(t, [[96.0, add(KP.stand, { yaw: face, x: -0.2, z: 10.5 })], [96.5, add(KP.raise, { yaw: face, x: -0.2, z: 10.5 }), ease.outExpo]]);
      const up = sm(t, 96.3, 99.6);
      this.cam(S, [2.2, 0.9 + 1.5 * up, 16.5], [-0.2, 4.5 + 26 * up, 10.5], 44, V(-0.2, 3, 10.5));
      hits([96.05], 18); P.flash = 0.9 * pulse(t, 96.05, 0.12) + 1.3 * sm(t, 99.2, 100); P.halationTint = [0.3, 0.6, 1]; P.bloom = 0.9;
    }
    if (t >= 80 && t < 96) D.eyeMat.color.set(0xffc23a).multiplyScalar(t < 93 ? 3.2 : lerp(3.2, 0.9, sm(t, 93, 95.5)));
    if (t < 80) D.eyeMat.color.set(0xffc23a).multiplyScalar(3.2);
    this.light(S, look, V(0, 6, 4), 46);
    place(dp);
    D.breath(breath, t);
    K.sword.visible = sword; K.shield.visible = shield;
    K.set(kp); K.power(power, t);
    if (t >= 96 && t < 100) {
      const tip = K.blade.getWorldPosition(V());
      A.pillar.visible = t > 96.35; A.pillar.position.set(tip.x, tip.y + 0.6, tip.z); A.pillar.scale.set(0.5 + 0.06 * Math.sin(t * 22), sm(t, 96.35, 97.4), 0.5 + 0.06 * Math.sin(t * 22));
    }
    return S;
  }

  // ------------------------------------------------------------------ the emblem, and VIII: the seal
  sky(t: number, c: CanvasRenderingContext2D): Stage {
    const { stage: S, logo, sword, halo } = this.w.sky, P = this.post, mark = this.w.mark;
    const seal = t >= 112;
    this.light(S, t >= 104 ? LOOKS.dusk : LOOKS.glory, V(0, 0, 0), 20);
    const k = (t - 100) / 12;
    S.cam.up.set(0, 1, 0);
    this.cam(S, [0, -1.2, 34 - 2.5 * clamp(k)], [0, 2.6 + (seal ? 0 : 0.6), 0], 30, 34, 60);
    logo.position.set(0, 5.6, 0); sword.position.set(0, lerp(-26, 4.2, ease.outCubic(lin(t, 100, 103.2))), 0);
    sword.rotation.y = (t - 100) * 0.9; sword.visible = t < 104.05; logo.visible = t >= 104.0;
    const punch = seal ? 1 + 0.5 * (1 - ease.outExpo(lin(t, 112.0, 112.25))) : 1 + 0.35 * (1 - ease.outExpo(lin(t, 104.0, 104.35)));
    logo.scale.setScalar(punch * (1 + 0.012 * Math.sin(t * 1.6)) * (WIDE ? 0.7 : 1));
    if (WIDE) logo.position.y = 7.0;
    halo.position.set(0, 5.6, -2); halo.scale.setScalar(t < 104 ? 8 + 26 * sm(t, 100.5, 104) : 36 + 2 * Math.sin(t * 2));
    (halo.material as THREE.SpriteMaterial).opacity = t >= 104 ? 0.45 : 0.75;
    P.flash = 1.3 * (1 - sm(t, 100, 100.6)) + 1.5 * pulse(t, 104.03, 0.12) + 0.5 * sm(t, 103.5, 104) * (t < 104 ? 1 : 0) + 0.9 * pulse(t, 112.05, 0.1) + 0.5 * pulse(t, 114.05, 0.08) + 0.5 * pulse(t, 116.05, 0.08);
    const h = pulse(t, 104.05, 0.12) + pulse(t, 112.05, 0.12) + 0.7 * pulse(t, 114.05, 0.1) + 0.7 * pulse(t, 116.05, 0.1);
    P.shake = [18 * h * noise1(t * 45, 1), 18 * h * noise1(t * 45, 2)]; P.zoom = 1 + 0.03 * h;
    P.halationTint = [0.3, 0.6, 1]; P.bloom = 0.7; P.vignette = t >= 104 ? 0.5 : 0.2;
    // the name, a letter a half-beat, in the wordmark's own lettering
    if (t >= 104 && t < 112) {
      const n = 9, mw = WIDE ? 700 : SAFE_W * 0.92, mh = (mark.height / mark.width) * mw, x0 = SAFE_C.x - mw / 2, y0 = sy(1090);
      for (let i = 0; i < n; i++) {
        const u = t - (104.05 + i * 0.42); if (u < 0) break;
        const s = 1 + 0.9 * (1 - ease.outExpo(clamp(u / 0.16))), sx = (mark.width / n) * i, dx = x0 + (mw / n) * i;
        c.save(); c.globalAlpha = Math.min(1, u / 0.05) * (1 - sm(t, 111.6, 112)); c.translate(dx + mw / n / 2, y0 + mh / 2); c.scale(s, s);
        c.drawImage(mark, sx, 0, mark.width / n, mark.height, -mw / n / 2, -mh / 2, mw / n, mh); c.restore();
      }
    }
    if (seal) {                                                         // sparks from the stamp, then the ember the film began with
      const u = t - 112.05;
      if (u > 0 && u < 1.2) for (let i = 0; i < 40; i++) { const a = hash(i, 1) * TAU, r = (140 + 620 * hash(i, 2)) * ease.outExpo(clamp(u / 0.9)); c.fillStyle = `rgba(160,225,255,${(1 - u / 1.2) * 0.95})`; c.beginPath(); c.arc(SAFE_C.x + Math.cos(a) * r, sy(760) + Math.sin(a) * r * 0.9 + 300 * u * u, 5 * (1 - u / 1.2) + 1.5, 0, TAU); c.fill(); }
      P.fade = sm(t, 117.9, 119.6);
    }
    return S;
  }

  // ------------------------------------------------------------------ drawn effects
  /** A sword cut: a tapering streak across the frame, white at the core, fading fast. */
  slash(c: CanvasRenderingContext2D, t: number, t0: number, cx: number, cy: number, len: number, ang: number, col = '#9fe4ff', life = 0.3) {
    const u = t - t0; if (u < 0 || u > life) return;
    const grow = ease.outExpo(clamp(u / 0.08)), a = 1 - clamp(u / life); let w = (len * 0.11) * a;
    len *= TS; w *= TS;
    c.save(); c.translate(sx(cx), sy(cy)); c.rotate(ang);
    for (const [k, color] of [[1, col], [0.45, '#ffffff']] as const) {
      c.fillStyle = color; c.globalAlpha = a; c.beginPath();
      c.moveTo(-len * grow, 0); c.quadraticCurveTo(0, -w * k, len * grow, 0); c.quadraticCurveTo(0, w * k * 0.35, -len * grow, 0); c.fill();
    }
    c.restore();
  }
  /** Rain, drawn as slanted strokes. */
  rain(t: number) {
    const c = this.ui.ctx; c.strokeStyle = 'rgba(220,230,255,0.42)'; c.lineWidth = 2.2; c.beginPath();
    for (let i = 0; i < 150; i++) { const x = hash(i, 1) * (W + 300) - 150, sp = 1900 + 900 * hash(i, 2), y = ((t * sp + hash(i, 3) * 2400) % 2400) - 240, l = 50 + 60 * hash(i, 4); c.moveTo(x, y); c.lineTo(x - l * 0.22, y + l); }
    c.stroke();
  }
  /** Embers blown across the frame by the gust. */
  streaks(t: number, t0: number, dur: number) {
    const u = t - t0; if (u < 0 || u > dur) return;
    const c = this.ui.ctx; c.lineCap = 'round';
    for (let i = 0; i < 46; i++) { const d = hash(i, 1) * 0.5, k = (u - d) / (dur * 0.6); if (k < 0 || k > 1) continue; const x = -100 + (W + 300) * ease.outQuad(k), y = sy(1050 + 520 * hash(i, 2) - 260 * k * hash(i, 3)); c.strokeStyle = `rgba(255,${150 + 80 * hash(i, 4)},70,${0.9 * (1 - k)})`; c.lineWidth = 3 + 3 * hash(i, 5); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 70 * (1 - k) - 14, y + 8); c.stroke(); }
  }
  /** The frame filling with the dragon's fire. */
  warm(c: CanvasRenderingContext2D, a: number) {
    if (a <= 0) return;
    const g = c.createRadialGradient(W / 2, 700, 60, W / 2, 900, 1500);
    g.addColorStop(0, `rgba(255,236,170,${a})`); g.addColorStop(0.4, `rgba(255,150,50,${a * 0.9})`); g.addColorStop(1, `rgba(220,60,20,${a * 0.85})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  /** Motes of light falling inward to the blade, in the silence before the climax. */
  motes(c: CanvasRenderingContext2D, t: number) {
    const u = lin(t, 78.7, 80), cx = SAFE_C.x, cy = sy(1060);
    for (let i = 0; i < 90; i++) {
      const a = hash(i, 1) * TAU, r0 = 500 + 900 * hash(i, 2), k = clamp(u * 1.5 - hash(i, 3) * 0.5), r = r0 * (1 - ease.inCubic(k));
      if (k <= 0) continue;
      c.fillStyle = `rgba(150,220,255,${0.9 * Math.min(1, k * 3)})`; c.beginPath(); c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.5 + 3 * hash(i, 4), 0, TAU); c.fill();
    }
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, 60 + 260 * u * u);
    g.addColorStop(0, `rgba(235,250,255,${u})`); g.addColorStop(0.3, `rgba(95,208,255,${0.7 * u})`); g.addColorStop(1, 'rgba(95,208,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 60 + 260 * u * u, 0, TAU); c.fill();
  }
}
