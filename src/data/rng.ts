// Deterministic randomness: the same key always yields the same number, so the demo
// looks identical on every reload and a given date's numbers never change.

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const SEED = 'golden-hour-v1';

/** Uniform [0,1) keyed by any parts. */
export function rand(...parts: (string | number)[]): number {
  return mulberry32(hashString(SEED + '|' + parts.join('|')));
}

/** Roughly normal noise centred on 0 with the given spread (sum of 3 uniforms). */
export function noise(spread: number, ...parts: (string | number)[]): number {
  const u = rand(...parts, 'a') + rand(...parts, 'b') + rand(...parts, 'c');
  return ((u - 1.5) / 1.5) * spread;
}
