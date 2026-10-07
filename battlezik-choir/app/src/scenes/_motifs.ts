// Shared motifs used by several plates so they look identical everywhere:
//  - the SPARK: an arcane-blue point with a white-hot core, glow, and sputtering particles
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { hash, TAU } from '../engine/util';

type P2 = { x: number; y: number };

/**
 * Sputtering particles for a spark whose head position over time is `headAt(t)`.
 * Deterministic: particles are born at fixed times (rate per second) with hashed velocities.
 * A rate that changes over time is a function of the birth time with its maximum `rateMax`: particles
 * are then born on the constant rateMax clock and thinned by hash, so each one keeps its identity
 * whatever t it is drawn at (a rate read at the current t would re-time them all from one
 * motion-blur sub-frame to the next).
 * Draws into a 2D LineBatch as short streaks (motion-blurred), additive.
 */
export function sparkParticles(lb: LineBatch, t: number, headAt: (t: number) => P2 | null, o: { rate?: number | ((tb: number) => number); rateMax?: number; life?: number; speed?: number; gravity?: number; intensity?: number; seed?: number; width?: number } = {}) {
  const life = o.life ?? 0.45, speed = o.speed ?? 260, g = o.gravity ?? 520, I = o.intensity ?? 1, seed = o.seed ?? 1;
  const rateAt = typeof o.rate === 'function' ? o.rate : null;
  const rate = rateAt ? o.rateMax! : (o.rate as number | undefined) ?? 90;
  if (!(rate > 0)) return;
  const n0 = Math.floor((t - life) * rate), n1 = Math.floor(t * rate);
  for (let n = n0; n <= n1; n++) {
    const tb = n / rate;
    if (tb > t) continue;
    if (rateAt && hash(n, seed + 3) * rate >= rateAt(tb)) continue;
    const age = t - tb;
    const h = headAt(tb);
    if (!h) continue;
    const a = hash(n, seed) * TAU, sp = speed * (0.25 + hash(n, seed + 1) ** 2 * 1.2);
    const lf = life * (0.35 + 0.65 * hash(n, seed + 2));
    if (age > lf) continue;
    const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp - speed * 0.3;
    const x = h.x + vx * age, y = h.y + vy * age + 0.5 * g * age * age;
    const dtb = 0.018; // streak length in time
    const x0 = h.x + vx * Math.max(0, age - dtb), y0 = h.y + vy * Math.max(0, age - dtb) + 0.5 * g * Math.max(0, age - dtb) ** 2;
    const k = 1 - age / lf;
    const heat = k * k;
    const col: [number, number, number] = [
      (LIN.signal[0] + (0.7 - LIN.signal[0]) * heat) * 2.2 * I,
      (LIN.signal[1] + (0.9 - LIN.signal[1]) * heat) * 2.2 * I,
      (LIN.signal[2] + (1 - LIN.signal[2]) * heat) * 2.2 * I,
    ];
    lb.seg2(x0, y0, x, y, (o.width ?? 1.6) * (0.5 + k * 0.7), col, Math.min(1, k * 1.4));
  }
}

/** The spark head: a white-hot core and a blue halo (draw after the line it drags). 2D LineBatch. */
export function sparkHead(lb: LineBatch, x: number, y: number, t: number, scale = 1, intensity = 1) {
  const flick = 0.85 + 0.15 * Math.sin(t * 91.7) * Math.sin(t * 57.3);
  const I = intensity * flick;
  // halo: a few concentric short segments (dots) with decreasing intensity
  lb.seg2(x, y, x + 0.01, y, 26 * scale, [LIN.signal[0] * 0.5 * I, LIN.signal[1] * 0.5 * I, LIN.signal[2] * 0.5 * I], 0.35);
  lb.seg2(x, y, x + 0.01, y, 12 * scale, [LIN.ember[0] * 2.5 * I, LIN.ember[1] * 2.5 * I, LIN.ember[2] * 2.5 * I], 0.8);
  lb.seg2(x, y, x + 0.01, y, 5 * scale, [4 * I, 5 * I, 6 * I], 1);
  // four tiny rays
  for (let i = 0; i < 4; i++) {
    const a = i * (TAU / 4) + t * 3 + 0.4;
    const r = (9 + 5 * hash(Math.floor(t * 30), i)) * scale;
    lb.seg2(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, 1.2 * scale, [0.5 * I, 1.6 * I, 3 * I], 0.8);
  }
}

/** Canvas2D version of the spark head (for scenes drawing in 2D layers). Use with additive-ish bloom. */
export function sparkHead2D(c: CanvasRenderingContext2D, x: number, y: number, t: number, scale = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, 22 * scale);
  g.addColorStop(0, 'rgba(240,250,255,1)');
  g.addColorStop(0.18, rgba('ember', 0.95));
  g.addColorStop(0.45, rgba('signal', 0.45));
  g.addColorStop(1, rgba('signal', 0));
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, 22 * scale, 0, TAU); c.fill();
}
