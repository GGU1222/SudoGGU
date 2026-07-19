// Seeded pseudo-random number generator, so puzzle generation can be replayed
// deterministically from a seed (e.g. a `?seed=` URL param) instead of always
// pulling from Math.random(). Not cryptographic — just needs to be fast and
// pass basic statistical tests, which mulberry32 does at a fraction of the code
// of anything stronger.
window.sudoGGU = window.sudoGGU || {};
sudoGGU.Core = sudoGGU.Core || {};

sudoGGU.Core.Rng = (function () {
  // mulberry32: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
  function mulberry32(state) {
    let a = state >>> 0;
    return function random() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Folds an arbitrary seed (number or string) down to a 32-bit unsigned int,
  // so callers can pass a friendly string (e.g. from a URL) instead of only
  // accepting a raw integer. FNV-1a: simple, fast, good-enough distribution.
  function toUint32Seed(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
    const str = String(seed);
    // A purely-numeric string is parsed directly rather than hashed — this is
    // what lets a generated seed (a number) survive a round trip through a URL
    // (always a string) and land back on the exact same internal state, instead
    // of `create(seed)` and `create(String(seed))` silently producing two
    // different boards for what a user'd expect to be "the same seed".
    if (/^\d+$/.test(str)) return Number(str) >>> 0;
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  // Returns { seed, random } — `seed` is the normalized uint32 actually used
  // (echo this back to the caller so it can be shared/replayed), `random` is a
  // Math.random()-compatible function ([0, 1)) driven by that seed. Omitting
  // `seed` picks a fresh random one, preserving today's non-reproducible
  // behavior as the default.
  function create(seed) {
    const usedSeed = seed === undefined || seed === null
      ? (Math.random() * 0xffffffff) >>> 0
      : toUint32Seed(seed);
    return { seed: usedSeed, random: mulberry32(usedSeed) };
  }

  return { create };
})();
