#!/usr/bin/env bun
// Offline renderer. Drives the app in headless Chrome (?export=1) and either
//   stills:  bun scripts/render.ts stills --t 1.5,23,40.2 [--only id1,id2] [--out dir]
//   sheet:   bun scripts/render.ts sheet --from 20 --to 35 [--n 12] [--cols 6] [--only ids] [--out file.png]   (or --times a,b,c | --cuts)
//   perf:    bun scripts/render.ts perf --from 20 --to 25 [--only ids] [--samples 1] [--shutter 0.5]   (avg ms per frame incl. GPU sync and the export's pixel readback)
//   video:   bun scripts/render.ts video [--from 0] [--to 120.58] [--fps 60] [--crf 16] [--x264 aq-mode=3] [--samples 1] [--shutter 0.5] [--out ../out/battlezik-choir.mp4] [--noaudio]
//            --samples N averages N sub-frames per frame over shutter×(1/fps): motion blur + temporal AA;
//            --samples auto picks the count per frame (4, 12, 36, 108 or 324, see Engine.render)
//   gpu:     bun scripts/render.ts gpu   (which GPU Chrome renders with)
//   --format wide (all modes): the 16:9 cut, 1920x1080
//   --look (all modes): the look test timeline (two held shots: knight 0-6 s, dragon 6-12 s) instead of the film
//   --scale N (all modes): render at N× the 1080x1920 layout (--scale 2 = 2160x3840); stills are then saved
//            full-res from the pixel buffer, videos are encoded at the physical size.
// Uses the Vite dev server at --url (default http://localhost:5173); starts a private one if unreachable.
//
// Chrome is started here with a debugging port and a throwaway profile and driven over the DevTools
// protocol through Bun's own WebSocket (Playwright's connection never opens under Bun on Windows).
// CHROME_PATH picks another Chromium-based browser; --headed shows the window.
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** mkdir -p that tolerates an existing directory (Bun on Windows throws EEXIST for relative paths). */
const ensureDir = (d: string) => { const a = path.resolve(d); if (!existsSync(a)) mkdirSync(a, { recursive: true }); };

const argv = process.argv.slice(2);
const mode = argv[0] ?? 'stills';
const opt = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const flag = (k: string) => argv.includes(`--${k}`);
const APP = path.resolve(import.meta.dir, '..');
const SCALE = Math.max(1, Math.round(+opt('scale', '1')!));
const WIDE = opt('format') === 'wide'; // --format wide: the 16:9 cut
const LW = WIDE ? 1920 : 1080, LH = WIDE ? 1080 : 1920; // the logical canvas: 9:16 vertical (TikTok, Reels, Shorts) or 16:9
const OW = LW * SCALE, OH = LH * SCALE; // output size
// --samples N (fixed) or --samples auto [--min-samples 4] [--max-samples 324] [--tol 3] (adaptive, see Engine.render)
const SAMPLES = opt('samples', '1') === 'auto'
  ? { min: +opt('min-samples', '4')!, max: +opt('max-samples', '324')!, tol: +opt('tol', '3')! }
  : +opt('samples', '1')!;
const hist = (h: Record<string, number>) => Object.entries(h).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => `${k}:${v}`).join(' ');
const ROOT = path.resolve(APP, '..');
const AUDIO = path.join(ROOT, 'audio/battlezik-choir.mp3');

async function reachable(url: string) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(1500) }); return r.ok; } catch { return false; }
}

async function ensureServer(): Promise<{ url: string; stop: () => void }> {
  const url = opt('url', 'http://localhost:5173')!;
  if (await reachable(url)) return { url, stop: () => {} };
  const port = 5300 + Math.floor(Math.random() * 500);
  // no live reload: a file saved mid-render must not reload the page
  const proc = Bun.spawn(['bunx', 'vite', '--port', String(port), '--strictPort'], { cwd: APP, stdout: 'ignore', stderr: 'ignore', env: { ...process.env, PDOOM_NO_HMR: '1' } });
  const u = `http://localhost:${port}`;
  for (let i = 0; i < 100 && !(await reachable(u)); i++) await Bun.sleep(100);
  return { url: u, stop: () => proc.kill() };
}

// ------------------------------------------------------------------ Chrome over the DevTools protocol
/** One page of a Chrome started for this run. */
class Page {
  private seq = 0;
  private pending = new Map<number, { res: (v: any) => void; rej: (e: Error) => void }>();
  logs: string[] = [];
  private constructor(private ws: WebSocket, private kill: () => void) {
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data as string);
      if (m.id) {
        const p = this.pending.get(m.id);
        this.pending.delete(m.id);
        if (m.error) p?.rej(new Error(m.error.message)); else p?.res(m.result);
      } else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
        this.logs.push(`[${m.params.type}] ${m.params.args.map((a: any) => a.value ?? a.description ?? '').join(' ')}`);
      } else if (m.method === 'Runtime.exceptionThrown') {
        this.logs.push(`[pageerror] ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
      }
    };
  }

  static async launch() {
    const GPU = [process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
    const dirs = [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env['LOCALAPPDATA']].filter(Boolean) as string[];
    const exe = process.env.CHROME_PATH ?? [
      ...dirs.flatMap((d) => [path.join(d, 'Google/Chrome/Application/chrome.exe'), path.join(d, 'Microsoft/Edge/Application/msedge.exe')]),
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
    ].find((f) => existsSync(f));
    if (!exe) throw new Error('Chrome not found: install it or set CHROME_PATH');
    const port = 9300 + Math.floor(Math.random() * 500);
    const profile = path.join(tmpdir(), `battlezik-render-${port}`);
    const proc = Bun.spawn([exe, `--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${profile}`, ...(flag('headed') ? [] : ['--headless=new']),
      '--no-first-run', '--no-default-browser-check', '--mute-audio', '--hide-scrollbars', '--force-color-profile=srgb', `--window-size=${LW},${LH}`, ...GPU, 'about:blank'], { stdout: 'ignore', stderr: 'ignore' });
    const kill = () => { proc.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch { /* still locked: the OS clears temp */ } };
    try {
      const cdp = `http://127.0.0.1:${port}`;
      for (let i = 0; i < 150 && !(await reachable(`${cdp}/json/version`)); i++) await Bun.sleep(100);
      const targets: { type: string; webSocketDebuggerUrl: string }[] = await (await fetch(`${cdp}/json/list`)).json();
      const target = targets.find((t) => t.type === 'page');
      if (!target) throw new Error('Chrome started without a page');
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error('cannot reach Chrome\'s debugging port')); });
      const page = new Page(ws, kill);
      await page.send('Page.enable');
      await page.send('Runtime.enable');
      await page.send('Emulation.setDeviceMetricsOverride', { width: LW, height: LH, deviceScaleFactor: 1, mobile: false });
      return page;
    } catch (e) { kill(); throw e; }
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = ++this.seq;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }

  /** Run `fn(arg)` in the page (the function is sent as source: it cannot close over anything here) and return its JSON value. */
  async evaluate<T, A = undefined>(fn: (arg: A) => T | Promise<T>, arg?: A): Promise<T> {
    const r = await this.send('Runtime.evaluate', { expression: `(${fn})(${arg === undefined ? '' : JSON.stringify(arg)})`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value as T;
  }

  async goto(url: string) { await this.send('Page.navigate', { url }); }

  /** The page's top-left LW x LH px as an image file. */
  async screenshot(file: string, format: 'png' | 'jpeg' = 'png', quality?: number) {
    const r = await this.send('Page.captureScreenshot', { format, quality, clip: { x: 0, y: 0, width: LW, height: LH, scale: 1 } });
    await Bun.write(file, Buffer.from(r.data, 'base64'));
  }

  close() { try { this.ws.close(); } catch { /* already gone */ } this.kill(); }
}

async function openPage(url: string) {
  const page = await Page.launch();
  try {
    const only = opt('only');
    await page.goto(`${url}/?export=1${only ? `&only=${only}` : ''}${SCALE !== 1 ? `&scale=${SCALE}` : ''}${flag('look') ? '&look=1' : ''}${WIDE ? '&format=wide' : ''}`);
    let state = '';
    for (let i = 0; i < 1200 && !state; i++) {
      state = await page.evaluate(() => ((window as any).__pdoom?.ready ? 'ready' : (window as any).__pdoom?.error ? 'error' : '')).catch(() => '');
      if (!state) await Bun.sleep(100);
    }
    if (state !== 'ready') {
      const err = state ? await page.evaluate(() => (window as any).__pdoom.error as string) : 'timed out after 120 s';
      throw new Error(`app failed to boot:\n${err}\n${page.logs.join('\n')}`);
    }
    const size = await page.evaluate(() => [(window as any).__pdoom.width ?? 1080, (window as any).__pdoom.height ?? 1920] as [number, number]);
    if (size[0] !== OW || size[1] !== OH) throw new Error(`app renders ${size[0]}x${size[1]}, expected ${OW}x${OH} (--scale ${SCALE})`);
    const sceneErrors = await page.evaluate(() => (window as any).__pdoom.errors as string[]);
    if (sceneErrors.length) console.error('SCENE ERRORS:\n' + sceneErrors.join('\n'));
    return page;
  } catch (e) { page.close(); throw e; }
}

async function stills(page: Page, times: number[], outDir: string) {
  ensureDir(outDir);
  const files: string[] = [];
  for (const t of times) {
    const k = await page.evaluate(([t, s, sh]) => (window as any).__pdoom.still(t, s, sh) as number, [t, SAMPLES, +opt('shutter', '0.5')!] as const);
    const f = path.join(outDir, `f_${t.toFixed(2).padStart(7, '0')}.png`);
    if (typeof SAMPLES !== 'number') console.log(`t=${t}: ${k} sub-frames`);
    // at scale > 1 the canvas is shown downscaled on the page: save the full-res pixel buffer instead
    if (SCALE !== 1) await Bun.write(f, Buffer.from(await page.evaluate(() => (window as any).__pdoom.png() as Promise<string>), 'base64'));
    else await page.screenshot(f);
    files.push(f);
  }
  return files;
}

async function sheet(page: Page, times: number[], cols: number, out: string) {
  const dataUrl = await page.evaluate(async ({ times, cols, cw, ch }) => {
    const P = (window as any).__pdoom;
    const pad = 4, lab = 18;
    const rows = Math.ceil(times.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * (cw + pad) + pad; cv.height = rows * (ch + lab + pad) + pad;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#222'; c.fillRect(0, 0, cv.width, cv.height);
    const src = document.getElementById('c') as HTMLCanvasElement;
    times.forEach((t: number, i: number) => {
      P.still(t);
      const x = pad + (i % cols) * (cw + pad), y = pad + Math.floor(i / cols) * (ch + lab + pad);
      c.drawImage(src, x, y + lab, cw, ch);
      c.fillStyle = '#ddd'; c.font = '13px monospace'; c.fillText(`${t.toFixed(2)}s`, x + 2, y + 13);
    });
    return cv.toDataURL('image/png');
  }, { times, cols, cw: WIDE ? 480 : 270, ch: WIDE ? 270 : 480 });
  ensureDir(path.dirname(out));
  await Bun.write(out, Buffer.from(dataUrl.split(',')[1]!, 'base64'));
}

async function video(page: Page, from: number, to: number, fps: number, out: string) {
  ensureDir(path.dirname(out));
  const crf = opt('crf', '16')!;
  const args = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${OW}x${OH}`, '-r', String(fps), '-i', 'pipe:0'];
  if (!flag('noaudio')) args.push('-ss', String(from), '-t', String(to - from), '-i', AUDIO);
  // Frames are sRGB (toSRGB in the final pass): convert with the BT.709 matrix and tag the stream,
  // otherwise ffmpeg converts with BT.601 while players and YouTube decode untagged HD as BT.709.
  // scale tags the matrix and range; primaries and transfer need setparams (the -color_* output flags don't reach the stream).
  args.push('-vf', 'vflip,scale=out_color_matrix=bt709,setparams=color_primaries=bt709:color_trc=bt709', '-c:v', 'libx264', '-preset', opt('preset', 'slow')!, '-crf', crf, '-pix_fmt', 'yuv420p', '-tune', 'grain', '-x264-params', opt('x264', 'aq-mode=3')!);
  if (!flag('noaudio')) args.push('-c:a', 'aac', '-b:a', '320k', '-shortest');
  args.push('-movflags', '+faststart', out);
  const ff = Bun.spawn(args, { stdin: 'pipe', stdout: 'inherit', stderr: 'inherit' });
  let frames = 0;
  const total = Math.round(to * fps) - Math.round(from * fps);
  const t0 = performance.now();
  const server = Bun.serve({
    port: 0,
    fetch(req, srv) { return srv.upgrade(req) ? undefined : new Response('ws only', { status: 400 }); },
    websocket: {
      maxPayloadLength: Math.max(64 * 1024 * 1024, OW * OH * 4 + 1024),
      async message(ws, msg) {
        ff.stdin.write(msg as Uint8Array);
        await ff.stdin.flush();
        frames++;
        ws.send(String(frames)); // ack: the page keeps at most a few frames ahead of ffmpeg (bounded memory at 4K)
        if (frames % 60 === 0 || frames === total) {
          const el = (performance.now() - t0) / 1000;
          process.stdout.write(`\r${frames}/${total} frames  ${(frames / el).toFixed(1)} fps  eta ${((total - frames) / (frames / el)).toFixed(0)}s   `);
        }
      },
    },
  });
  const used = await page.evaluate((o) => (window as any).__pdoom.stream(o) as Promise<Record<string, number>>, { from, to, fps, ws: `ws://localhost:${server.port}`, samples: SAMPLES, shutter: +opt('shutter', '0.5')!, inflight: 4 });
  // wait for all frames to arrive
  while (frames < total) await Bun.sleep(20);
  ff.stdin.end();
  await ff.exited;
  server.stop();
  console.log(`\nwrote ${out} (${frames} frames in ${((performance.now() - t0) / 1000).toFixed(1)}s)`);
  console.log(`sub-frames per frame (count:frames): ${hist(used)}`);
}

const { url, stop } = await ensureServer();
let page: Page | null = null;
try {
  page = await openPage(url);
  if (mode === 'gpu') {
    console.log(await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2')!;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) as string;
    }));
  } else if (mode === 'stills') {
    const times = (opt('t') ?? '0').split(',').map(Number);
    const files = await stills(page, times, opt('out', path.join(ROOT, 'out/stills'))!);
    console.log(files.join('\n'));
  } else if (mode === 'sheet') {
    const from = +opt('from', '0')!, to = +opt('to', '10')!, n = +opt('n', '12')!;
    let times = Array.from({ length: n }, (_, i) => from + ((to - from) * i) / Math.max(1, n - 1));
    if (opt('times')) times = opt('times')!.split(',').map(Number);
    if (flag('cuts')) {
      // 4 frames around every timeline boundary: 2 frames before, 2 after
      const tl = await page.evaluate(() => (window as any).__pdoom.timeline as { id: string; start: number }[]);
      times = tl.slice(1).flatMap((e) => [e.start - 0.1, e.start - 1 / 60, e.start + 1 / 60, e.start + 0.1]);
    }
    const out = opt('out', path.join(ROOT, `out/sheets/sheet_${from}-${to}.png`))!;
    await sheet(page, times, +opt('cols', '6')!, out);
    console.log(out);
  } else if (mode === 'perf') {
    const from = +opt('from', '0')!, to = +opt('to', '5')!;
    const r = await page.evaluate(async ({ from, to, samples, shutter }) => {
      const P = (window as any).__pdoom;
      const ms: number[] = [];
      const buf = new Uint8Array(P.width * P.height * 4);
      P.still(from);
      const used: Record<number, number> = {};
      for (let t = from; t < to; t += 1 / 60) {
        const a = performance.now();
        const k = P.engine.render(t, 1 / 60, false, samples, shutter);
        used[k] = (used[k] ?? 0) + 1;
        await P.engine.readPixelsAsync(buf);
        ms.push(performance.now() - a);
      }
      ms.sort((a, b) => a - b);
      return { n: ms.length, avg: ms.reduce((a, b) => a + b, 0) / ms.length, p50: ms[ms.length >> 1]!, p95: ms[Math.floor(ms.length * 0.95)]!, max: ms[ms.length - 1]!, used };
    }, { from, to, samples: SAMPLES, shutter: +opt('shutter', '0.5')! });
    console.log(`frames ${r.n}  avg ${r.avg.toFixed(1)}ms  p50 ${r.p50.toFixed(1)}  p95 ${r.p95.toFixed(1)}  max ${r.max.toFixed(1)}  sub-frames ${hist(r.used)}`);
  } else if (mode === 'video') {
    const dur = await page.evaluate(() => (window as any).__pdoom.duration as number);
    await video(page, +opt('from', '0')!, +opt('to', String(dur))!, +opt('fps', '60')!, path.resolve(opt('out', path.join(ROOT, 'out/battlezik-choir.mp4'))!));
  }
  if (page.logs.length) console.error('BROWSER LOG:\n' + page.logs.slice(0, 40).join('\n'));
} finally {
  page?.close();
  stop();
}
