/**
 * wj-rng.js — Generador pseudoaleatorio con semilla (mulberry32).
 * Permite construir bancos de ejercicios estables y, a la vez, sesiones aleatorias.
 */

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Crea un RNG con utilidades. Si no se entrega semilla usa Math.random
 * (aleatoriedad real para cada sesión).
 */
export function makeRng(seed) {
  const next = seed === undefined ? Math.random : mulberry32(typeof seed === 'string' ? hashString(seed) : seed);
  const rng = {
    next,
    /** Entero en [min, max] (ambos inclusive). */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    /** Copia barajada (Fisher–Yates). */
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    chance(p) {
      return next() < p;
    },
    /** Elige k elementos distintos. */
    sample(arr, k) {
      return rng.shuffle(arr).slice(0, k);
    },
  };
  return rng;
}
