// The edit: which plate plays when. The track is a steady 120 BPM in 4/4 (a bar is 2 s) and its big
// hits land on bar lines, so every cut is placed by bar and beat on the analysed grid
// (data/audio.json), never by a typed-in second.
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';

// Scene modules are discovered lazily so a missing/broken scene never breaks the build.
const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};

/**
 * The track's eight movements: [id, bar, beat, what the music does]. Working names, from the analysis;
 * the storyboard may rename, split or merge them.
 */
export const ACTS = [
  ['dawn', 0, 0, 'quiet opening; a first accent at bar 4, a swell from bar 7'],
  ['summons', 9, 2, 'two hits a beat apart out of near-silence, then a held breath'],
  ['gathering', 12, 0, 'the choir enters and builds'],
  ['march', 16, 0, 'a hit, then the full choir; it brightens from bar 20'],
  ['battle', 23, 0, 'drums and low end at full force, accents on most beats'],
  ['blows', 32, 0, 'three lone hits (bars 32, 34, 36), each dying into silence'],
  ['glory', 40, 0, 'the climax: everything, for 32 s; a lift at bar 48'],
  ['seal', 56, 0, 'three final hits (bars 56, 57, 58) and the tail'],
] as const;

export function makeTimeline(_ly: Lyrics, au: AudioData): TimelineEntry[] {
  /** A cut on a beat lands two frames early, so the new plate is already up when the hit sounds. */
  const cut = (bar: number, beat = 0) => Math.max(0, au.timeOfBeat(bar * 4 + beat) - 2 / 60);
  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, file, load: scene(file), start, end, ...extra });
  // ?look=1: the look test, two held shots for judging the art style (not part of the film)
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('look'))
    return [E('look-knight', 'look', 0, 6, { params: { subject: 'knight' } }), E('look-dragon', 'look', 6, 12, { params: { subject: 'dragon' } })];
  // Every movement is played by scenes/film.ts, which picks the shot for the time. (?slate=1 brings back the sync check.)
  const file = typeof location !== 'undefined' && new URLSearchParams(location.search).has('slate') ? 'slate' : 'film';
  return ACTS.map(([id, bar, beat, note], i) => {
    const next = ACTS[i + 1];
    return E(id, file, i === 0 ? 0 : cut(bar, beat), next ? cut(next[1], next[2]) : au.duration, { params: { index: i, count: ACTS.length, note } });
  });
}
