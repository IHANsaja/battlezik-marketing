# Battlezik Marketing — choir video

A medieval-fantasy motion-design video for BattleZik, cut to match `battlezik choir.mp3`, built entirely as code (no After Effects).

Status: **first full pass of the film built; waiting for the user's notes.** The user approved the story (draft 3 of `battlezik-choir/SCRIPT.md`), then the look (look test v3, "look is better now"), then asked for the film (2026-10-07). `app/src/scenes/film.ts` plays all eight movements; draft renders go to `battlezik-choir/out/` (draft 2: `battlezik-worthy_draft2.mp4` and `battlezik-worthy_draft2_16x9.mp4`; 30 fps, no motion blur, no sound effects). The animation is a rough first pass: expect notes on shots, timing and poses. Still missing: sound effects, final 60 fps render with motion blur.

## Working from another machine

The project lives in a private GitHub repository (`origin`; see `git remote -v`). Everything needed to build the film and make more like it is in the repository; this file is the memory that travels, so record durable decisions here, not only in Claude's local memory.

- Set up: install bun, Chrome or Edge, ffmpeg with libx264, Python 3 with numpy and scipy; then `bun install` in `battlezik-choir/app`. `README.md` has the commands.
- Not in the repository: `out/` (renders and stills), `node_modules`, and `Motion_as_kit/` (the starter kit, present only on the first machine). Paths under `D:\Projects\` and the "Machine notes" section describe that first machine; check them again elsewhere.
- The app repo `D:\Projects\Battlezik` may not exist on another machine. The brand assets the film uses are already copied into `battlezik-choir/app/public/brand/`.
- The art-style reference video ("Claude's day off") is not in the repository; its findings are written up under "Decisions" below.
- To make another video of this kind, follow `.claude/skills/new-video/SKILL.md` (`/new-video`).
- Commit after each approved step (script, look, draft). Never commit renders.

## How the user works

- They approve in gates: script, then look test stills, then the film. Show stills before building further; do not skip a gate.
- They judge by looking, and say so bluntly. When they reject a look, study the reference again before changing anything.
- They want honest status: what was checked on stills versus watched in motion, and what is still weak.
- During long renders they ask for progress and time left; give an estimate up front and keep the computer awake.

## Decisions made by the user

- **Format: vertical first, plus a 16:9 cut.** 1080x1920 for TikTok, Instagram Reels, Facebook Reels and YouTube Shorts; the user also asked for a 16:9 version (1920x1080) on 2026-10-07. Every render is made in both.
- **Length: the full track**, 120.58 s.
- **The video matches the music.** "Choir matching" means picture locked to the choir track.
- **A story, not a feature tour.** The film inspires players: a knight as the main character, and a feeling of worthiness and power. The user rejected a first draft that explained platform features; do not bring features back.
- **The opponent is a dragon.**
- **Art style: hand-painted anime 3D built entirely in code, no Blender.** The user's reference is the "Claude's day off" video (X post by @ishuagra02, "Animated by Opus 5.5"): simple chunky code-built geometry, two- or three-tone painted shading with warm light and cool violet shadow, a painted cloud sky, heavy depth of field with blurred foregrounds, bloom and sun flares. The user rejected, in order, a flat woodcut/manuscript style ("not some vector graphics") and a realistic Blender-modelled 3D look. Ours is the same technique in a darker, heroic palette.
- **What that reference actually is (studied frame by frame after the user rejected a first look test as too soft and moody):** crisp cel animation. Hard two-tone shading with sharp-edged cast shadows; shadows are a saturated blue-violet, never grey or dark; thin coloured ink outlines on every object; bright, saturated colour in clear daylight or a clean sunset; towering anime cumulus in flat white and violet; drawn surface detail and hard highlights; layered backgrounds; strong depth of field. No fog, no smoke haze, no gloomy monochrome.
- **Simple is fine (user, 2026-10-07, on seeing look test v2: "current look is better").** Characters and environments may be as simple and toy-like as the reference's; a cinematic or realistic look is not wanted. Aim for charm and clarity, not detail.
- **The on-screen words are Claude's proposal in SCRIPT.md**, open to the user's edits. Do not add copy beyond the script without asking.
- **Brand source is the app repo** `D:\Projects\Battlezik` (read-only here; it replaces a Figma source).
- **Own kit.** Work happens in `battlezik-choir/`. `Motion_as_kit/` is the untouched starter and is reference only.
- **The project is kept in git** so the user can work from anywhere and make more videos of the same kind (2026-10-07).

## Layout

| Path | What it is |
|---|---|
| `battlezik choir.mp3` | The user's original track. Never edit it. |
| `battlezik-choir/` | **The project kit.** Everything is built here. |
| `Motion_as_kit/` | The starter kit as delivered (a 16:9 voiceover explainer). Not in the repository; on the first machine only. Do not edit it. |
| `Motion-as-Code-Workflow-Guide.pdf` | The starter kit's guide. |
| `README.md` | Setup and render commands for a new machine. |
| `.claude/skills/new-video/SKILL.md` | The recipe for the next video of this kind. |
| `.claude/launch.json` | Preview server `battlezik-choir` on port 5173. |
| `.claude/settings.json` | Allows bun, ffmpeg, the analysis script and the parts renderer; read-only access to the app repo. |

Inside `battlezik-choir/`:

| Path | Role |
|---|---|
| `audio/battlezik-choir.mp3` | Copy of the track that the preview and renderer use. |
| `analysis/analyze_music.py` | Writes `data/audio.json`. Needs only numpy, scipy and ffmpeg (all installed): `python analysis/analyze_music.py`. |
| `data/audio.json` | Beat grid, bars, sections, level envelopes, onsets, impacts, silences. |
| `data/lyrics.json` | Empty (`{ "lines": [] }`). The engine requires the file. Fill it only if timed words are ever needed. |
| `app/src/engine/` | The pdoom-video engine, adapted (see below). Change it when the project needs it. |
| `app/src/scenes/_kit.ts` | Toolkit: `SAFE` area, `barT()`, `Cam2D`, the `Plot` pen, geometry helpers. |
| `app/src/scenes/_motifs.ts` | The spark (arcane blue). |
| `app/src/scenes/_toon.ts` | The cel look: `toon()` material, `Stage` (painted sky, ink outlines from depth and normals, depth-of-field lens), geometry helpers. |
| `app/src/scenes/_knight.ts`, `_dragon.ts` | The two characters, built from code. |
| `app/src/scenes/_cast.ts` | The puppets: `makeKnight()` and `makeDragon()`, jointed figures driven by poses (`KP`, `DP`, `walk()`, `poseAt()`). |
| `app/src/scenes/_worlds.ts` | The places and their light: `buildHall/Road/Arena/Sky`, `LOOKS` (dawn, storm, day, sunset, dusk, glory). The road's stations are 320 units apart along x. |
| `app/src/scenes/film.ts` | **The film.** Every timeline entry loads it; it picks the shot by time. `CUES` holds every on-screen word with its timing and animation. Script time t = song time minus the grid offset (0.045 s). |
| `app/src/scenes/look.ts` | Look test, two held shots (`?look=1`, or `--look` on the renderer; stills in `out/look/`). Not part of the film. |
| `app/src/scenes/slate.ts` | Sync-check plate (`?slate=1`), not part of the film. Shows bar and beat, hit rings, levels and the safe area. Delete it once real plates exist. |
| `app/src/timeline.ts` | `ACTS`: the eight movements, cut by bar and beat. |
| `app/public/brand/` | `logo.png` (emblem, 1158x1462, transparent) and `wordmark.png` (white, soft glow), copied from the app repo. |
| `app/scripts/render.ts` | Offline renderer: headless Chrome over the DevTools protocol, frames piped to ffmpeg. |
| `out/` | Renders (gitignored). `out/wip/` holds test stills. |

## The track

Measured, not assumed. Re-run the analysis if the audio file ever changes.

- 120.58 s, steady **120 BPM in 4/4**. A beat is 0.5 s, a bar is 2 s, and the first beat is at 0.045 s.
- The big hits sit on bar lines. Place every cut and accent with `barT(audio, bar, beat)`, never a typed-in second.
- Loudness is -11.7 LUFS with a true peak of +0.4 dBTP, which is hot. The final mux should normalise to about -14 LUFS and -1 dBTP.
- Whether the choir sings words could not be determined by analysis. Treat it as wordless unless the user says otherwise.

| Movement (working name) | Starts | Bar | What the music does |
|---|---|---|---|
| dawn | 0.0 | 0 | Quiet opening; an accent at 8 s, a swell from 15 s |
| summons | 19.0 | 9, beat 3 | Two hits one second apart (19, 20), then a held breath |
| gathering | 24.0 | 12 | The choir enters and builds |
| march | 32.0 | 16 | A hit, then full choir; brightens from 40 s |
| battle | 46.0 | 23 | Drums and low end at full force, accents on most beats |
| blows | 64.0 | 32 | Three lone hits (64, 68, 72), each dying into silence; silent 78.7 to 79.9 |
| glory | 80.0 | 40 | The climax, 32 s long; a lift at 96 s |
| seal | 112.0 | 56 | Three final hits (112, 114, 116), tail, silence from 117.5 |

The names are placeholders for the storyboard to rename, split or merge. In `audio.json`, `vocal`, `drums`, `bass` and `other` are harmonic/percussive proxies, not real stems.

## How a plate works

- A plate is a class extending `Scene` (`app/src/engine/scene.ts`), default-exported from `app/src/scenes/<name>.ts`, registered in `timeline.ts`.
- `render(f, out)` runs once per frame. `f.t` song time, `f.lt` local time, `f.p` progress 0..1, `f.beat`, `f.bar`, `f.beatPhase`, `f.barPhase`, and `f.a` audio features: envelopes `rms low mid high vocal drums bass other`, pulses `kick snare hat vonset impact`.
- It returns post overrides: `bloom`, `halation`, `halationTint`, `ca`, `grain`, `vignette`, `fade`, `flash`, `shake`, `zoom`, `invert`, `exposure`, `hud`.
- Surfaces: `Layer2D` (Canvas2D as a texture), `LineBatch` (GPU lines), `FSPass` (fullscreen GLSL with noise, SDF, hatch and engrave helpers), `Compositor` (blend modes), or raw three.js for 3D.

## Rules

- **Every frame is a pure function of time.** No `Math.random()`, no `Date.now()`, no accumulated state. Use `hash`, `noise1/2/3`, `mulberry32`, `frameIdx` from `engine/util.ts`. Adaptive motion blur renders sub-frames out of order and refuses `stateful` scenes.
- **Keep readable content inside `SAFE`** (x 60 to 940, y 220 to 1500). The apps cover the top, the bottom 420 px and the right 140 px. Pictures may run full-bleed.
- **Ask before a full render.** Use stills, sheets and short `--from/--to` clips while iterating.
- **Return `hud: 0`** from every plate; the engine's HUD belongs to the original film.
- Only claim features the app really has. The app repo's `marketing/intro-video/README.md` has a claims policy: no platform fee tiers, no escrow payouts, no Riot-verified results, no usage numbers.
- Keep `battlezik-choir/LICENSE.pdoom-engine` with the project (MIT, pdoom-video by mexicat).
- Never write to `D:\Projects\Battlezik`.

## Look, as initialized

A starting point, open to change with the storyboard.

- Palette (`engine/palette.ts`): `ink` #07090E, `ink2` #151A23, `graphite` #4A5361, `ash` #9BA3AF, `bone` #EDE4CF (vellum), `signal` #1E9BFF (arcane blue, the logo's glow), `ember` #6FE0FF, `blood` #0058B8, `gold` #E2B24A, `steel` #C9CED6. The same names exist in GLSL as `C_INK`, `C_SIGNAL`, `C_GOLD` and so on.
- Fonts on disk: Pirata One (blackletter, `F.black()`) and Cinzel (Roman capitals at 400/700/900, `F.caps(weight)`), both OFL, in `app/public/fonts/medieval/`; plus Cormorant Garamond (`F.serif()`), Archivo, IBM Plex Mono and single-stroke plotter fonts from the starter kit.
- The app's own look, for reference: background #0b0e14, primary #0074e0, fonts Geist, Orbitron and Michroma.

## Commands

Run from `battlezik-choir/app`.

```sh
bun run dev                                                        # preview at http://localhost:5173 (?t=64 to start at 64 s)
bun run check                                                      # type check
bun scripts/render.ts stills --t 20.2,64.3 --out ../out/wip        # single frames
bun scripts/render.ts sheet --from 40 --to 60 --n 12               # contact sheet (also --times a,b,c or --cuts)
bun scripts/render.ts video --from 63 --to 66 --samples 4 --out ../out/wip/clip.mp4   # short clip
bun run render:draft                                               # whole video, fast settings
bun run render                                                     # whole video, adaptive motion blur, CRF 17
```

Preview keys: space play/pause, arrows seek 1 s (shift 5 s), `,` `.` frame step, `[` `]` movement, `l` loop, `h` hide UI.

## Machine notes (checked 2026-10-07)

- bun 1.3.4, node 22, ffmpeg 9.0.2, Chrome and Python 3.11 with numpy and scipy are installed. `uv` is not, and is not needed.
- Playwright cannot connect to Chrome under bun on this Windows machine, so `render.ts` drives Chrome directly. Do not reintroduce Playwright.
- `bun --cwd <dir> run dev` prints help instead of running; the working form is `bun run --cwd <dir> dev`.
- Render speed measured on the placeholder plate: about 2.2 frames per second at 4 sub-frames (AMD Radeon integrated graphics). A full 120 s draft is roughly 55 minutes; the adaptive render is slower.

## Still to do

1. Take the user's notes on draft 2 and revise shots, poses and timing in `film.ts`.
2. Sound design: generate effects with the ElevenLabs connector, write a cue sheet and mixer, normalise loudness to about -14 LUFS.
3. Final render: 60 fps, motion blur (`bun run render`), ask first.

## Working notes for the film

- Render the whole film with `bash scripts/render-parts.sh <name> [--format wide] --fps 30 --samples 1 --preset veryfast --crf 20`: four resumable parts, joined with the choir track at -14 LUFS. A plain single-pass render is lost if the computer sleeps (it did once); ask for keep-awake and stay in the turn until it finishes.
- `--format wide` on the renderer (or `?format=wide` in the preview) is the 16:9 cut. In `film.ts` the drawn layer is laid out for 9:16 and scaled through `sx()`, `sy()`, `TS`; use them for anything drawn in 2D.
- Pose a character (`set()` then `updateMatrixWorld(true)`) before reading a position off it; otherwise the value comes from the previously rendered frame.
- Check work with contact sheets, not full renders: `bun scripts/render.ts sheet --times 20.3,43,61.2 --cols 6 --out ../out/wip/x.png`.
- A frame takes about 0.4 to 0.5 s on this machine, so the full film is roughly 30 minutes at 30 fps and an hour at 60 fps.
- Write Python patch scripts to the scratchpad with the Write tool; long bash heredocs fail here with a quoting error.
- `patch` is a reserved word in the shaders (GLSL ES 3); do not use it as a variable name.
- Keep fire and glow colours near 1.0; brighter values burn out to white and lose their colour.
- Scenery placed on a wide ring (hills, mountains) can swallow a neighbouring road station; keep station scenery inside about 250 units.
