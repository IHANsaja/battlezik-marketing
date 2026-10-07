---
name: new-video
description: Make another code-built motion-design video in the style of the BattleZik "Worthy" film (cel-anime 3D, kinetic type, cut to a music track). Use when the user asks for a new video, a new cut, or a video for a different track.
---

# Making another video of this kind

The kit in `battlezik-choir/` is one film. A new film is a copy of that kit with a new track, script and `film.ts`; the engine, the cel look, the puppets and the renderer are reused.

Work in this order and stop for the user's approval at each gate. The user rejected work twice when a gate was skipped.

## 1. Set up the kit

1. Copy `battlezik-choir/` to `<new-name>/` without `out/` and `app/node_modules/`. Run `bun install` in `<new-name>/app`.
2. Put the track at `<new-name>/audio/<track>.mp3`. The file name is referenced in four places; change all of them: `analysis/analyze_music.py` (`AUDIO`), `app/src/main.ts`, `app/scripts/render.ts` (`AUDIO`), `app/scripts/render-parts.sh` (the mux line and the last entry of `CUTS`, which is the track length).
3. Add a preview entry for the new kit to `.claude/launch.json` (form: `bun run --cwd <new-name>/app dev`).
4. Run `python analysis/analyze_music.py` and read `data/audio.json`: tempo, first beat, bar length, hits, silences. Write the track table into `CLAUDE.md`. Do not assume 120 BPM.

## 2. Script (gate: the user approves the story)

Write `<new-name>/SCRIPT.md`: story, characters, art direction, then one table per movement with the exact on-screen words and their bar-and-beat times. Movements come from the music analysis. The user wants a story that makes players feel worthy and powerful, not a feature tour. Only claim what the app really does (claims policy in `CLAUDE.md`).

## 3. Look test (gate: the user approves two stills)

Build or adjust characters in `_cast.ts` and places in `_worlds.ts`, then render two held shots with `look.ts` (`bun scripts/render.ts stills --look ...`) and show them. The look is crisp cel anime: hard two-tone shading, blue-violet shadows, ink outlines, bright colour, anime cumulus, depth of field. Simple and toy-like is fine; soft, foggy or realistic is not.

## 4. Build the film

1. `app/src/timeline.ts`: set `ACTS` from the bar and beat of each movement.
2. `app/src/scenes/film.ts`: one branch per place, picking the shot by time; `CUES` holds the words. Place every cut with `barT()`, never a typed-in second.
3. Check with contact sheets (`render.ts sheet --times ...`) in both formats (`--format wide`), not with full renders. Look specifically for: the hero seen from behind, a character or head below the ground, effects burnt out to white, words outside `SAFE`, light words on a bright sky.

## 5. Render (gate: ask before any full render)

`bash scripts/render-parts.sh <name> [--format wide] --fps 30 --samples 1 --preset veryfast --crf 20` for drafts, in both 9:16 and 16:9. Keep the computer awake for the duration. Verify each file with ffprobe (size, frame rate, duration) and say plainly that stills were checked, not motion, unless the film was actually watched. The final is 60 fps with motion blur, after the user's notes and after sound effects.

## Reusable parts

| Need | Where |
|---|---|
| Toon material, ink outlines, painted sky, depth of field | `_toon.ts` (`toon()`, `Stage`) |
| A jointed character driven by poses | `_cast.ts` (`makeKnight`, `makeDragon`, `poseAt`, `walk`) |
| A place and its light | `_worlds.ts` (`LOOKS`, `build*`) |
| Kinetic type with per-word animation | `film.ts` (`CUES`, `drawCue`) |
| Safe area, bar times | `_kit.ts` (`SAFE`, `barT`) |
| 9:16 and 16:9 from one scene | `sx()`, `sy()`, `TS` in `film.ts`; `WIDE` in `engine/scale.ts` |
