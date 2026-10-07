# BattleZik Marketing — motion design as code

Videos for BattleZik built entirely in code (TypeScript, three.js, GLSL): no After Effects, no Blender. Every frame is a pure function of time, so the browser preview and the exported MP4 are identical.

The first film is **"Worthy"**, a two-minute anime-style knight-and-dragon story cut to the choir track, in `battlezik-choir/`.

## Set up on a new machine

Install [bun](https://bun.sh), Google Chrome (or Edge), ffmpeg with libx264, and Python 3 with numpy and scipy. Then:

```sh
git clone <this repo>
cd battlezik-marketing/battlezik-choir/app
bun install
bun run check          # type check
bun run dev            # preview at http://localhost:5173
```

Git Bash (Windows), or any bash, is needed for `scripts/render-parts.sh`.

## Render

Run from `battlezik-choir/app`.

```sh
bun scripts/render.ts sheet --times 20.3,43,61.2 --cols 6 --out ../out/wip/x.png        # contact sheet of stills
bash scripts/render-parts.sh worthy --fps 30 --samples 1 --preset veryfast --crf 20     # full film, 9:16
bash scripts/render-parts.sh worthy_16x9 --format wide --fps 30 --samples 1 --preset veryfast --crf 20   # 16:9
```

Renders go to `battlezik-choir/out/`, which is not in the repository.

## Where things are

| Path | What |
|---|---|
| `CLAUDE.md` | The project guide: decisions, the track's structure, rules, working notes. Read this first. |
| `.claude/skills/new-video/` | The recipe for making another video of this kind (`/new-video` in Claude Code). |
| `battlezik-choir/SCRIPT.md` | The approved script of "Worthy". |
| `battlezik-choir/app/src/scenes/` | The film, the characters, the worlds and the cel look. |
| `battlezik-choir/app/src/engine/` | The engine: pdoom-video by mexicat (MIT, see `battlezik-choir/LICENSE.pdoom-engine`), adapted. |
| `battlezik choir.mp3` | The original track. |

Not in the repository: renders, `node_modules`, and the "Motion as Code" starter kit the project grew from (its engine lives on, adapted, in `battlezik-choir/app/src/engine/`).
