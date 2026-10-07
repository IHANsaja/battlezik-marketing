import { hexToLinear } from './util';

// BattleZik as medieval fantasy: night ink, vellum, and one signal colour, the arcane blue of the
// logo's circuitry. Gold leaf and blade steel are the two accents. The engine's role names are kept
// (bone = the light neutral, signal = the glow, ember = its hot core, blood = its shadow).
export const HEX = {
  ink: '#07090E', // night: the site's #0b0e14, a step darker for bloom headroom
  ink2: '#151A23', // raised black (the site's card colour): panels, stone in the dark
  graphite: '#4A5361', // dim lines, secondary text
  ash: '#9BA3AF', // mid grey (the site's muted foreground)
  bone: '#EDE4CF', // vellum: paper white, primary text
  signal: '#1E9BFF', // arcane blue: the logo's glow, runes, the spark
  ember: '#6FE0FF', // hot cyan for cores and highlights
  blood: '#0058B8', // deep brand blue for shadows of signal (the site's #0074e0, darker)
  gold: '#E2B24A', // gold leaf: illumination, crowns, the rare warm accent
  steel: '#C9CED6', // blade steel: the logo's chrome
} as const;

export type PaletteKey = keyof typeof HEX;

/** Linear RGB triplets for GL uniforms. */
export const LIN: Record<PaletteKey, [number, number, number]> = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>;

/** CSS rgba() for Canvas2D. */
export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
