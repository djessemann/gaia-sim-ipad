// Seeded PRNG + horizontally-wrapping value noise for planet terrain.
// Wrapping in X is essential: the planet is a cylinder (longitude wraps).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic hash for lattice points; xWrap makes the noise periodic in X.
function hash2(ix, iy, seed, xWrap) {
  ix = ((ix % xWrap) + xWrap) % xWrap;   // wrap longitude lattice
  let h = ix * 374761393 + iy * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return (h & 0xffff) / 0xffff;          // 0..1
}

function smooth(t) { return t * t * (3 - 2 * t); }

function valueNoise(x, y, seed, xWrap) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = smooth(x - x0), fy = smooth(y - y0);
  const v00 = hash2(x0, y0, seed, xWrap);
  const v10 = hash2(x0 + 1, y0, seed, xWrap);
  const v01 = hash2(x0, y0 + 1, seed, xWrap);
  const v11 = hash2(x0 + 1, y0 + 1, seed, xWrap);
  const a = v00 + (v10 - v00) * fx;
  const b = v01 + (v11 - v01) * fx;
  return a + (b - a) * fy;
}

// Fractal (fBm) noise, periodic in X over `periodCells` columns.
export function fbm(x, y, seed, octaves, baseFreq, periodCells) {
  let amp = 1, freq = baseFreq, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    // lattice width at this octave — must stay an integer for clean X-wrap
    const xWrap = Math.max(2, Math.round(periodCells * freq));
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 1013, xWrap);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm; // 0..1
}
