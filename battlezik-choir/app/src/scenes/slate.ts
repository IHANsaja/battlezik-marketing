// SLATE — a placeholder plate, not part of the film. It stands in for every movement until the
// storyboard exists, and shows whether picture and music are locked: the bar and beat counter, a dot
// per beat, a ring thrown by each big hit, the analysed levels, and the safe area the apps leave clear.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, W, H, clearRT } from '../engine/gl';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, prog, pulse, TAU } from '../engine/util';
import { SAFE, SAFE_C, SAFE_W } from './_kit';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error(`image not found: ${src}`));
    im.src = src;
  });
}

export default class Slate extends Scene {
  ui = new Layer2D();
  logo!: HTMLImageElement;
  mark!: HTMLImageElement;
  hits: [number, number][] = [];

  override async init() {
    [this.logo, this.mark] = await Promise.all([loadImage('brand/logo.png'), loadImage('brand/wordmark.png')]);
    this.hits = this.ctx.audio.events('impact', this.ctx.start - 2, this.ctx.end).filter(([, v]) => v >= 0.8);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp, audio, params, id } = this.ctx;
    const t = f.t, U = this.ui, c = U.ctx;
    clearRT(renderer, out, LIN.ink);
    U.clear();

    // what the apps cover: outside the safe area
    c.fillStyle = rgba('ink2', 0.9);
    c.fillRect(0, 0, W, SAFE.y0); c.fillRect(0, SAFE.y1, W, H - SAFE.y1);
    c.fillRect(0, SAFE.y0, SAFE.x0, SAFE.y1 - SAFE.y0); c.fillRect(SAFE.x1, SAFE.y0, W - SAFE.x1, SAFE.y1 - SAFE.y0);
    c.strokeStyle = rgba('graphite', 0.9); c.lineWidth = 1.5; c.setLineDash([10, 8]);
    c.strokeRect(SAFE.x0, SAFE.y0, SAFE.x1 - SAFE.x0, SAFE.y1 - SAFE.y0);
    c.setLineDash([]);
    c.font = font(F.mono(500), 20); c.fillStyle = rgba('graphite', 1); c.textAlign = 'center';
    c.fillText('APP HEADER', W / 2, SAFE.y0 - 90);
    c.fillText('CAPTION · AUDIO · PROGRESS BAR', W / 2, SAFE.y1 + 200);
    c.save(); c.translate(SAFE.x1 + 76, SAFE_C.y); c.rotate(Math.PI / 2); c.fillText('LIKE · COMMENT · SHARE', 0, 0); c.restore();

    // rings thrown by the big hits
    const cx = SAFE_C.x, cy = SAFE.y0 + 470;
    for (const [ht, hv] of this.hits) {
      const k = prog(t, ht, ht + 1.1, ease.outExpo);
      if (k <= 0 || k >= 1) continue;
      c.strokeStyle = rgba('ember', (1 - k) * hv);
      c.lineWidth = 10 * (1 - k) + 1;
      c.beginPath(); c.arc(cx, cy, 210 + 360 * k, 0, TAU); c.stroke();
    }

    // the emblem breathes with the level and jumps on a hit
    const s = (400 / this.logo.height) * (1 + 0.035 * f.a.rms + 0.07 * f.a.impact);
    const lw = this.logo.width * s, lh = this.logo.height * s;
    c.drawImage(this.logo, cx - lw / 2, cy - lh / 2, lw, lh);
    const mw = SAFE_W * 0.6, mh = (this.mark.height / this.mark.width) * mw;
    c.drawImage(this.mark, cx - mw / 2, cy + 232, mw, mh);

    // movement title
    const i: number = params.index ?? 0;
    c.textAlign = 'center';
    c.font = font(F.mono(500), 24); c.letterSpacing = '8px'; c.fillStyle = rgba('signal', 1);
    c.fillText(`MOVEMENT ${ROMAN[i] ?? i + 1} OF ${ROMAN[(params.count ?? 1) - 1] ?? params.count}`, cx, SAFE.y0 + 110);
    c.letterSpacing = '0px';
    c.font = font(F.serif(600), 132); c.fillStyle = rgba('bone', 1);
    c.fillText(id.charAt(0).toUpperCase() + id.slice(1), cx, SAFE.y0 + 232);

    // bar . beat, one dot per beat
    const beat = Math.floor(f.beat + 1e-6), bar = Math.floor(beat / 4), inBar = ((beat % 4) + 4) % 4;
    const y0 = cy + 430;
    c.font = font(F.mono(400), 76); c.fillStyle = rgba('bone', 0.95);
    c.fillText(`${String(bar + 1).padStart(2, '0')} . ${inBar + 1}`, cx, y0);
    for (let b = 0; b < 4; b++) {
      const on = b === inBar ? pulse(t, audio.timeOfBeat(beat), 0.14) : 0;
      c.fillStyle = b === inBar ? rgba(b === 0 ? 'gold' : 'signal', 0.35 + 0.65 * on) : rgba('graphite', 0.8);
      c.beginPath(); c.arc(cx + (b - 1.5) * 86, y0 + 62, (b === 0 ? 17 : 12) * (1 + 0.5 * on), 0, TAU); c.fill();
    }
    c.font = font(F.mono(400), 24); c.fillStyle = rgba('ash', 1);
    c.fillText(`${t.toFixed(2)} s  ·  ${audio.bpm.toFixed(0)} BPM  ·  ${this.ctx.start.toFixed(2)} – ${this.ctx.end.toFixed(2)}`, cx, y0 + 128);

    // analysed levels
    const rows: [string, number, string][] = [['MIX', f.a.rms, 'bone'], ['CHOIR', f.a.vocal, 'signal'], ['DRUMS', f.a.drums, 'gold'], ['LOW', f.a.bass, 'steel']];
    const mx = SAFE.x0 + 190, mwid = SAFE_W - 250;
    rows.forEach(([name, v, col], r) => {
      const y = y0 + 178 + r * 38;
      c.textAlign = 'right'; c.font = font(F.mono(500), 20); c.fillStyle = rgba('ash', 1);
      c.fillText(name, mx - 22, y + 7);
      c.fillStyle = rgba('ink2', 1); c.fillRect(mx, y - 8, mwid, 16);
      c.fillStyle = rgba(col, 0.95); c.fillRect(mx, y - 8, mwid * clamp(v), 16);
    });
    c.textAlign = 'center'; c.font = font(F.serif(400, true), 30); c.fillStyle = rgba('ash', 1);
    this.wrap(c, String(params.note ?? ''), cx, y0 + 346, SAFE_W - 60, 36);
    c.textAlign = 'left';

    comp.draw(renderer, U.upload(), out);
    return { hud: 0, bloom: 0.5, grain: 0.04, vignette: 0.25, flash: 0.03 * f.a.impact };
  }

  private wrap(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
    let line = '';
    for (const w of text.split(' ')) {
      if (line && c.measureText(`${line} ${w}`).width > maxW) { c.fillText(line, x, y); y += lh; line = w; } else line = line ? `${line} ${w}` : w;
    }
    if (line) c.fillText(line, x, y);
  }
}
