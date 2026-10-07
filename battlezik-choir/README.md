# BattleZik — choir video kit

A vertical (1080x1920, 60 fps) motion-design video cut to `audio/battlezik-choir.mp3`, drawn entirely in code. Every frame is a deterministic function of time, so the browser preview and the exported MP4 are identical.

The project guide, the track's structure and the working rules are in `../CLAUDE.md`.

```sh
python analysis/analyze_music.py     # audio -> data/audio.json (numpy, scipy, ffmpeg)
cd app
bun run dev                          # preview at http://localhost:5173
bun scripts/render.ts stills --t 20.2 --out ../out/wip
bun run render                       # ../out/battlezik-choir.mp4
```

Requirements: bun, Google Chrome (or set `CHROME_PATH`), ffmpeg with libx264, Python with numpy and scipy.

The engine in `app/src/engine/` is pdoom-video by mexicat (Giacomo Magnanini), MIT licence, see `LICENSE.pdoom-engine`. It is adapted here: a 9:16 canvas, a BattleZik palette, an adjustable halation tint, impact pulses from the music analysis, and a renderer that drives Chrome over the DevTools protocol.
