// The film's look: cel animation in 3D, after the reference ("Claude's day off").
//  - toon(): a cel material. Two flat tones with a hard edge; the shadow tone is the sky's colour, so
//    shadows are blue-violet, never grey. A hard highlight on metal, drawn detail on stone and scale.
//  - Stage: a 3D scene behind a painted anime sky, inked (outlines from depth and normals), then filmed
//    through a lens (depth of field).
//  - geometry helpers for building figures from chunky, soft-edged forms.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FSPass, makeRT, W, H, PW, PH } from '../engine/gl';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0);
const lin = (hex: string | number) => new THREE.Color(hex); // three converts sRGB hex to linear
/** Objects on this layer are left out of the ink pass (smoke, motes, glows). */
export const NO_INK = 1;

// ================================================================== the cel shade
/** Light response: shadow or light, with a hard edge. */
function ramp() {
  const n = 256, d = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1), t = Math.min(1, Math.max(0, (x - 0.5) / 0.012)), v = t * t * (3 - 2 * t);
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.round(v * 255); d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, n, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
const RAMP = ramp();

/** Shared by every toon material: the direction to the sun in view space, set by the Stage each frame. */
const SUN_VIEW = { value: V(0, 0, 1) };

export type Detail = 'none' | 'stone' | 'metal' | 'scale' | 'cloth' | 'grass' | 'leaf';
const DETAIL: Record<Detail, number> = { none: 0, stone: 1, metal: 2, scale: 3, cloth: 4, grass: 5, leaf: 6 };

export interface ToonOpts {
  /** Hard highlight (metal, wet things): strength, and how tight it is. */
  spec?: number; shine?: number;
  /** A thin line of light along edges facing the sun. */
  rim?: number; rimColor?: string | number;
  /** Drawn surface detail, its strength 0..1 and its scale in world units. */
  detail?: Detail; detailAmount?: number; detailScale?: number;
  emissive?: string | number; emissiveIntensity?: number;
  side?: THREE.Side; flat?: boolean; transparent?: boolean; opacity?: number; fog?: boolean;
}

const DETAIL_GLSL = /* glsl */ `
float tHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float tNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(tHash(i), tHash(i + vec3(1, 0, 0)), f.x), mix(tHash(i + vec3(0, 1, 0)), tHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(tHash(i + vec3(0, 0, 1)), tHash(i + vec3(1, 0, 1)), f.x), mix(tHash(i + vec3(0, 1, 1)), tHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// returns a multiplier for the base colour: flat areas with drawn marks, never a soft gradient
float tDetail(int kind, vec3 p, float amt) {
  if (kind == 0) return 1.0;
  if (kind == 1) { // stone: a few crack lines, patches a shade darker, speckle
    float n = tNoise(p * 0.9) + 0.5 * tNoise(p * 2.3 + 4.0);
    float crack = 1.0 - smoothstep(0.0, 0.035, abs(n - 0.78));
    float blot = step(0.62, tNoise(p * 0.55 + 9.0));
    float speck = step(0.93, tHash(floor(p * 34.0)));
    return 1.0 - amt * (0.45 * crack + 0.1 * blot + 0.2 * speck);
  }
  if (kind == 2) { // metal: sparse scratches and a darker worn patch
    float s = tNoise(p * vec3(1.2, 22.0, 1.2)) * tNoise(p * 3.0 + 2.0);
    float scratch = step(0.52, s);
    float worn = step(0.66, tNoise(p * 1.3 + 5.0));
    return 1.0 - amt * (0.3 * scratch + 0.1 * worn);
  }
  if (kind == 3) { // scale: rows of overlapping plates, every other row shifted by half
    vec2 q = vec2(p.x + p.z * 0.8, p.y + p.z * 0.35);
    q.x += 0.5 * mod(floor(q.y), 2.0);
    vec2 f = fract(q) - vec2(0.5, 0.0);
    float edge = step(0.47, length(f * vec2(1.0, 0.96)));
    float tone = step(0.72, tHash(vec3(floor(q), 1.0)));
    return 1.0 - amt * (0.32 * edge + 0.1 * tone);
  }
  if (kind == 4) { // cloth: long folds a shade darker
    float f = step(0.55, tNoise(p * vec3(3.0, 0.5, 3.0)));
    return 1.0 - amt * 0.16 * f;
  }
  if (kind == 5) { // grass: brushed clumps in three shades
    float a = tNoise(p * vec3(1.6, 1.0, 1.6)), b = tNoise(p * vec3(6.0, 1.0, 2.0) + 3.0);
    return 1.0 + amt * (0.22 * step(0.55, a) - 0.2 * step(0.6, b));
  }
  if (kind == 6) { // leaves: dabs of lighter and darker green
    float a = tNoise(p * 2.4), b = tNoise(p * 5.5 + 3.0), c = tNoise(p * 1.1 + 8.0);
    return 1.0 + amt * (0.3 * step(0.58, a * 0.6 + b * 0.4) - 0.26 * step(0.6, b * 0.5 + c * 0.5) - 0.12 * step(0.7, c));
  }
  return 1.0;
}`;

export function toon(color: string | number, o: ToonOpts = {}) {
  const m = new THREE.MeshToonMaterial({
    color: lin(color), gradientMap: RAMP, side: o.side ?? THREE.FrontSide,
    emissive: lin(o.emissive ?? 0x000000), emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: o.transparent ?? false, opacity: o.opacity ?? 1, fog: o.fog ?? true,
  });
  (m as any).flatShading = o.flat ?? false;
  const u = {
    uSpec: { value: o.spec ?? 0 }, uShine: { value: o.shine ?? 40 },
    uRim: { value: o.rim ?? 0 }, uRimColor: { value: lin(o.rimColor ?? 0xfff3d6) }, uSunView: SUN_VIEW,
    uDetail: { value: DETAIL[o.detail ?? 'none'] }, uDetailAmt: { value: o.detailAmount ?? 0.6 }, uDetailScale: { value: o.detailScale ?? 1 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;\nuniform float uSpec, uShine, uRim, uDetailAmt, uDetailScale; uniform int uDetail; uniform vec3 uRimColor, uSunView;\n${DETAIL_GLSL}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= tDetail(uDetail, vWPos * uDetailScale, uDetailAmt);')
      .replace('#include <opaque_fragment>', /* glsl */ `
        vec3 tView = normalize(vViewPosition);
        float tLit = step(0.02, dot(normal, uSunView));
        float tHi = step(0.5, pow(max(dot(normal, normalize(uSunView + tView)), 0.0), uShine));
        outgoingLight += vec3(1.0, 0.97, 0.9) * uSpec * tHi * tLit;
        float tFres = 1.0 - clamp(dot(tView, normal), 0.0, 1.0);
        outgoingLight += uRimColor * uRim * step(0.86, tFres) * step(0.15, dot(normal, uSunView) + 0.6 * max(-uSunView.z, 0.0));
        #include <opaque_fragment>`);
  };
  return m;
}

/** A surface that only glows (blade light, eyes, fire cores). Values above 1 bloom. */
export function glow(color: string | number, intensity = 4) {
  return new THREE.MeshBasicMaterial({ color: lin(color).multiplyScalar(intensity), fog: false });
}

// ================================================================== geometry
export function mesh(g: THREE.BufferGeometry, m: THREE.Material, p?: THREE.Vector3, r?: [number, number, number], s?: THREE.Vector3 | number) {
  const o = new THREE.Mesh(g, m);
  if (p) o.position.copy(p);
  if (r) o.rotation.set(r[0], r[1], r[2]);
  if (s !== undefined) { if (typeof s === 'number') o.scale.setScalar(s); else o.scale.copy(s); }
  return o;
}
/** A box with softened edges. */
export const rbox = (w: number, h: number, d: number, r = 0.08, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) * 0.49));
export const ball = (r: number, ws = 24, hs = 16) => new THREE.SphereGeometry(r, ws, hs);

/** Reshape a geometry: f gets each vertex and moves it. Normals are rebuilt. */
export function warp<T extends THREE.BufferGeometry>(g: T, f: (p: THREE.Vector3) => void): T {
  const a = g.attributes.position as THREE.BufferAttribute, p = V();
  for (let i = 0; i < a.count; i++) { p.fromBufferAttribute(a, i); f(p); a.setXYZ(i, p.x, p.y, p.z); }
  a.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** A tapered limb from a to b (radius r0 at a, r1 at b) with rounded joints. */
export function limb(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, mat: THREE.Material, o: { seg?: number; capA?: boolean; capB?: boolean } = {}) {
  const g = new THREE.Group();
  const d = b.clone().sub(a), len = d.length();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, o.seg ?? 16, 1), mat);
  c.position.copy(a).addScaledVector(d, 0.5);
  c.quaternion.setFromUnitVectors(Y, d.clone().normalize());
  g.add(c);
  if (o.capA ?? true) g.add(mesh(ball(r0, 16, 12), mat, a));
  if (o.capB ?? true) g.add(mesh(ball(r1, 16, 12), mat, b));
  return g;
}

/** A chain of limbs through points, radius easing from r0 to r1. */
export function chain(pts: THREE.Vector3[], r0: number, r1: number, mat: THREE.Material, seg = 14) {
  const g = new THREE.Group(), n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const ra = r0 + (r1 - r0) * (i / n), rb = r0 + (r1 - r0) * ((i + 1) / n);
    g.add(limb(pts[i]!, pts[i + 1]!, ra, rb, mat, { seg, capA: i === 0, capB: true }));
  }
  return g;
}

/** A cone standing on `base`, pointing along `dir`. */
export function spike(base: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, mat: THREE.Material, seg = 8) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(r, len, seg), mat);
  const d = dir.clone().normalize();
  c.position.copy(base).addScaledVector(d, len / 2);
  c.quaternion.setFromUnitVectors(Y, d);
  return c;
}

/** A sheet stretched from one point to a run of edge points (a wing membrane, a torn banner). */
export function fan(apex: THREE.Vector3, edge: THREE.Vector3[], mat: THREE.Material) {
  const pos: number[] = [];
  for (let i = 0; i < edge.length - 1; i++) pos.push(apex.x, apex.y, apex.z, edge[i]!.x, edge[i]!.y, edge[i]!.z, edge[i + 1]!.x, edge[i + 1]!.y, edge[i + 1]!.z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/** Points along the edge from a to b, pulled towards `to` in the middle (the scallop between two wing fingers). */
export function scallop(a: THREE.Vector3, b: THREE.Vector3, to: THREE.Vector3, sag: number, n = 10) {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = a.clone().lerp(b, u);
    out.push(p.lerp(to, sag * 4 * u * (1 - u)));
  }
  return out;
}

/** A leafy mass (bush, tree crown): a cluster of soft balls, which the ink and the two tones draw as a puffy crown. */
export function foliage(r: number, mat: THREE.Material, seed = 1) {
  const g = new THREE.Group();
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  g.add(mesh(ball(r * 0.78, 20, 14), mat, V(0, 0, 0), undefined, V(1, 0.82, 1)));
  for (let i = 0; i < 8; i++) {
    const a = rnd() * Math.PI * 2, e = (rnd() - 0.25) * 1.2, d = r * (0.5 + rnd() * 0.25), rr = r * (0.34 + rnd() * 0.26);
    g.add(mesh(ball(rr, 16, 12), mat, V(Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d * 0.75, Math.sin(a) * Math.cos(e) * d)));
  }
  return g;
}

export function shadows<T extends THREE.Object3D>(o: T, cast = true, receive = true): T {
  o.traverse((c) => { if ((c as THREE.Mesh).isMesh) { c.castShadow = cast; c.receiveShadow = receive; } });
  return o;
}

/** A soft round dot: the map for smoke puffs and for motes. */
let puffTex: THREE.Texture | null = null;
export function softDot() {
  if (!puffTex) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d')!, g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(0.7, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    puffTex = new THREE.CanvasTexture(cv);
  }
  return puffTex;
}
/** A soft round puff as a camera-facing sprite (mist, glow). */
export function puff(color: string | number, opacity: number, size: number, p: THREE.Vector3, additive = false) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: lin(color), opacity, transparent: true, depthWrite: false, fog: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  s.scale.setScalar(size);
  s.position.copy(p);
  s.layers.set(NO_INK);
  return s;
}

// ================================================================== the stage
export interface Look {
  zenith: string; horizon: string; ground: string;
  /** Direction TO the sun. */
  sunDir: THREE.Vector3; sunColor: string; sunIntensity: number; sunDisc: number;
  /** The shadow tone: light from the sky (what shadows are painted with) and bounce from the ground. */
  skyFill: string; groundFill: string; fill: number;
  cloudLit: string; cloudShade: string; cloud: number;
  fog: string; fogNear: number; fogFar: number;
  /** Ink: line colour multiplier (the line is the local colour, darkened and shifted) and strength. */
  ink: string; inkStrength: number;
  /** Lens: focus distance, blur strength, largest blur radius in px (in front of the focus plane, and behind it). */
  focus: number; aperture: number; maxBlur: number; farBlur: number;
}

export class Stage {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(36, W / H, 0.1, 900);
  sun = new THREE.DirectionalLight();
  hemi = new THREE.HemisphereLight();
  private rt!: THREE.WebGLRenderTarget;
  private nrt!: THREE.WebGLRenderTarget;
  private inked!: THREE.WebGLRenderTarget;
  private normalMat!: THREE.MeshNormalMaterial;
  private sky!: FSPass;
  private inkPass!: FSPass;
  private lens!: FSPass;
  /** The first Stage builds the render targets and passes; the rest share them. */
  private static first: Stage | null = null;

  constructor(public look: Look) {
    const L = look;
    this.scene.fog = new THREE.Fog(lin(L.fog), L.fogNear, L.fogFar);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(3072, 3072);
    this.sun.shadow.radius = 1;
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.sun, this.sun.target, this.hemi);
    this.setLook(L);
    this.aimSun(V(0, 0, 0), 14);
    this.cam.layers.enable(NO_INK);
    const f = Stage.first;
    if (f) { this.rt = f.rt; this.nrt = f.nrt; this.inked = f.inked; this.normalMat = f.normalMat; this.sky = f.sky; this.inkPass = f.inkPass; this.lens = f.lens; return; }
    Stage.first = this;
    this.rt = makeRT(W, H, { depthTexture: new THREE.DepthTexture(PW, PH) });
    this.nrt = makeRT(W, H);
    this.inked = makeRT(W, H, { depthBuffer: false });
    this.normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });

    // The sky, painted the way anime backgrounds are: a clean gradient, and towering cumulus in two flat
    // tones with crisp edges, white where the sun reaches and violet beneath.
    this.sky = new FSPass(/* glsl */ `
      uniform mat4 uCamWorld, uProjInv;
      uniform vec3 uSunDir, uZenith, uHorizon, uGround, uSunCol, uCloudLit, uCloudShade;
      uniform float uCloud, uTime, uDisc;
      float cloudShape(vec2 p, float h) {
        float az = p.x / 3.2;
        float top = uCloud + 0.5 * fbm(vec2(az * 1.1 + 5.3, 0.7), 3) + 0.1 * fbm(vec2(az * 4.0, 1.3), 2);   // how high the towers reach here
        float edge = 0.5 * fbm(p * vec2(0.6, 0.7) + vec2(0.0, 2.0), 5) + 0.22 * (1.0 - abs(snoise(p * 1.9 + 7.0))) + 0.08 * (1.0 - abs(snoise(p * 4.6 + 3.0)));
        float towers = min((top - h) * 3.2, 0.6) + edge - 0.3;
        float puffs = fbm(p * vec2(0.8, 1.5) + 20.0, 4) + 0.1 * (1.0 - abs(snoise(p * 3.0))) - 0.36 - abs(h - (uCloud + 0.42)) * 2.4;
        return max(towers, puffs);
      }
      void main() {
        vec4 q = uProjInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
        vec3 d = normalize((uCamWorld * vec4(normalize(q.xyz / q.w), 0.0)).xyz);
        float h = d.y, az = atan(d.x, -d.z);
        vec3 col = mix(uHorizon, uZenith, pow(sat(h * 1.45 + 0.02), 0.62));
        float sd = max(dot(d, uSunDir), 0.0);
        col += uSunCol * (pow(sd, 6.0) * 0.16 + pow(sd, 48.0) * 0.4);
        // high streaks of cirrus
        float ci = smoothstep(0.55, 0.9, fbm(vec2(az * 2.4 + h * 3.0 + uTime * 0.004, h * 18.0), 4) * 0.5 + 0.5) * smoothstep(0.18, 0.5, h) * 0.4;
        col = mix(col, uCloudLit, ci);
        // cumulus
        vec2 p = vec2(az * 3.2 + uTime * 0.006, h * 6.4);
        float s0 = cloudShape(p, h);
        float dens = smoothstep(0.0, 0.022, s0);
        vec2 toSun = normalize(vec2(atan(uSunDir.x, -uSunDir.z) - az, (uSunDir.y - h) * 2.0) + 1e-4);
        float s1 = cloudShape(p + toSun * 0.2, h + toSun.y * 0.2 / 6.4);
        float lit = smoothstep(-0.012, 0.012, (s0 - s1) + 0.06 + 0.07 * (1.0 - abs(snoise(p * 2.6 + 1.0))));
        vec3 cc = mix(uCloudShade, uCloudLit, lit);
        cc = mix(cc, mix(uCloudShade, uCloudLit, 0.6), (1.0 - lit) * smoothstep(0.05, 0.3, s0) * 0.5);    // a mid tone deep inside
        cc = mix(cc, uHorizon, exp(-max(h, 0.0) * 13.0) * 0.55);                                           // bases sink into the haze
        col = mix(col, cc, dens * smoothstep(-0.02, 0.02, h));
        col += uSunCol * uDisc * smoothstep(0.99955, 0.9998, sd) * (1.0 - dens);
        col = mix(col, uHorizon, exp(-abs(h) * 22.0) * 0.5);
        col = mix(col, uGround, smoothstep(0.0, -0.06, h));
        fragColor = vec4(col, 1.0);
      }`, {
      uCamWorld: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() },
      uSunDir: { value: L.sunDir.clone().normalize() }, uZenith: { value: lin(L.zenith) }, uHorizon: { value: lin(L.horizon) }, uGround: { value: lin(L.ground) },
      uSunCol: { value: lin(L.sunColor) }, uCloudLit: { value: lin(L.cloudLit) }, uCloudShade: { value: lin(L.cloudShade) },
      uCloud: { value: L.cloud }, uTime: { value: 0 }, uDisc: { value: L.sunDisc },
    });

    // Ink. A line wherever depth breaks (an outline) or the surface turns sharply (a crease). The line is the
    // local colour, darkened and tinted, like the coloured outlines of a cel; it thins with distance.
    this.inkPass = new FSPass(/* glsl */ `
      uniform sampler2D tColor, tDepth, tNormal; uniform vec2 uTexel; uniform float uNear, uFar, uStrength; uniform vec3 uInk;
      float depthAt(vec2 uv) { float z = texture(tDepth, uv).r * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
      vec3 nAt(vec2 uv) { return texture(tNormal, uv).rgb * 2.0 - 1.0; }
      void main() {
        vec3 col = texture(tColor, vUv).rgb;
        float d0 = depthAt(vUv);
        float w = mix(1.25, 0.7, smoothstep(10.0, 90.0, d0));
        vec2 o = uTexel * w;
        float dl = depthAt(vUv - vec2(o.x, 0.0)), dr = depthAt(vUv + vec2(o.x, 0.0)), dd = depthAt(vUv - vec2(0.0, o.y)), du = depthAt(vUv + vec2(0.0, o.y));
        float dmin = min(min(dl, dr), min(dd, du));
        float lap = (abs(dl + dr - 2.0 * d0) + abs(dd + du - 2.0 * d0)) / min(d0, dmin);
        float eD = smoothstep(0.012, 0.03, lap);
        vec3 n0 = nAt(vUv);
        float nd = 4.0 - dot(n0, nAt(vUv - vec2(o.x, 0.0))) - dot(n0, nAt(vUv + vec2(o.x, 0.0))) - dot(n0, nAt(vUv - vec2(0.0, o.y))) - dot(n0, nAt(vUv + vec2(0.0, o.y)));
        float eN = smoothstep(0.5, 0.9, nd) * step(min(d0, dmin), uFar * 0.6);
        float e = max(eD, eN) * uStrength * mix(1.0, 0.25, smoothstep(40.0, 260.0, min(d0, dmin)));
        vec3 line = (col * 0.34 + 0.012) * uInk;
        fragColor = vec4(mix(col, line, sat(e)), 1.0);
      }`, {
      tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tNormal: { value: this.nrt.texture }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) },
      uNear: { value: 0.1 }, uFar: { value: 900 }, uStrength: { value: L.inkStrength }, uInk: { value: lin(L.ink) },
    });

    // The lens. Each pixel's blur disc grows with its distance from the focus plane; discs are gathered on a
    // spiral, and a far pixel is not allowed to smear over a sharp near one.
    this.lens = new FSPass(/* glsl */ `
      uniform sampler2D tColor, tDepth; uniform vec2 uTexel;
      uniform float uNear, uFar, uFocus, uAperture, uMaxR, uFarR;
      float depthAt(vec2 uv) { float z = texture(tDepth, uv).r * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
      float coc(float z) { return min(abs(1.0 / uFocus - 1.0 / z) * uAperture, z > uFocus ? uFarR : uMaxR); }
      void main() {
        float cz = depthAt(vUv), cc = coc(cz);
        vec3 col = min(texture(tColor, vUv).rgb, vec3(24.0));
        float tot = 1.0, r = 2.0;
        for (float a = 0.0; r < uMaxR; a += 2.39996323) {
          vec2 uv = vUv + vec2(cos(a), sin(a)) * uTexel * r;
          vec3 sc = min(texture(tColor, uv).rgb, vec3(24.0));
          float sz = depthAt(uv), sr = coc(sz);
          if (sz > cz) sr = clamp(sr, 0.0, cc * 2.0);
          col += mix(col / tot, sc, smoothstep(r - 0.5, r + 0.5, sr));
          tot += 1.0;
          r += 2.7 / r;
        }
        fragColor = vec4(col / tot, 1.0);
      }`, {
      tColor: { value: this.inked.texture }, tDepth: { value: this.rt.depthTexture }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) },
      uNear: { value: 0.1 }, uFar: { value: 900 }, uFocus: { value: L.focus }, uAperture: { value: L.aperture }, uMaxR: { value: L.maxBlur }, uFarR: { value: L.farBlur },
    });
  }

  /** Change the light and sky (a storm breaking, day to dusk). The shadow box keeps its aim. */
  setLook(L: Look) {
    this.look = L;
    const fog = this.scene.fog as THREE.Fog;
    fog.color = lin(L.fog); fog.near = L.fogNear; fog.far = L.fogFar;
    this.sun.color = lin(L.sunColor); this.sun.intensity = L.sunIntensity;
    this.hemi.color = lin(L.skyFill); this.hemi.groundColor = lin(L.groundFill); this.hemi.intensity = L.fill;
  }

  /** Point the sun's shadow box at a spot; `size` is half its width in world units. */
  aimSun(at: THREE.Vector3, size: number) {
    const d = this.look.sunDir.clone().normalize();
    this.sun.position.copy(at).addScaledVector(d, 80);
    this.sun.target.position.copy(at);
    const c = this.sun.shadow.camera;
    c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 1; c.far = 200;
    c.updateProjectionMatrix();
  }

  render(renderer: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget, t: number, lens?: { focus?: number; aperture?: number }) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const cam = this.cam;
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    SUN_VIEW.value.copy(this.look.sunDir).normalize().transformDirection(cam.matrixWorldInverse);
    const s = this.sky.u, L = this.look;
    (s.uSunDir!.value as THREE.Vector3).copy(L.sunDir).normalize();
    (s.uZenith!.value as THREE.Color).set(L.zenith); (s.uHorizon!.value as THREE.Color).set(L.horizon); (s.uGround!.value as THREE.Color).set(L.ground);
    (s.uSunCol!.value as THREE.Color).set(L.sunColor); (s.uCloudLit!.value as THREE.Color).set(L.cloudLit); (s.uCloudShade!.value as THREE.Color).set(L.cloudShade);
    s.uCloud!.value = L.cloud; s.uDisc!.value = L.sunDisc;
    this.inkPass.u.uStrength!.value = L.inkStrength; (this.inkPass.u.uInk!.value as THREE.Color).set(L.ink);
    this.lens.u.uMaxR!.value = L.maxBlur; this.lens.u.uFarR!.value = L.farBlur;
    (s.uCamWorld!.value as THREE.Matrix4).copy(cam.matrixWorld);
    (s.uProjInv!.value as THREE.Matrix4).copy(cam.projectionMatrixInverse);
    s.uTime!.value = t;
    // colour and depth
    renderer.setRenderTarget(this.rt);
    renderer.clear(true, true, true);
    this.sky.render(renderer, this.rt);
    renderer.render(this.scene, cam);
    // normals, solid objects only
    cam.layers.disable(NO_INK);
    const fog = this.scene.fog;
    this.scene.fog = null;
    this.scene.overrideMaterial = this.normalMat;
    renderer.setRenderTarget(this.nrt);
    const pc = renderer.getClearColor(new THREE.Color()).clone(), pa = renderer.getClearAlpha();
    renderer.setClearColor(new THREE.Color(0.5, 0.5, 1), 1);
    renderer.clear(true, true, true);
    renderer.render(this.scene, cam);
    renderer.setClearColor(pc, pa);
    this.scene.overrideMaterial = null;
    this.scene.fog = fog;
    cam.layers.enable(NO_INK);
    // ink, then the lens
    for (const p of [this.inkPass, this.lens]) { p.u.uNear!.value = cam.near; p.u.uFar!.value = cam.far; }
    this.inkPass.render(renderer, this.inked);
    const l = this.lens.u;
    l.uFocus!.value = lens?.focus ?? this.look.focus;
    l.uAperture!.value = lens?.aperture ?? this.look.aperture;
    this.lens.render(renderer, out);
  }
}
