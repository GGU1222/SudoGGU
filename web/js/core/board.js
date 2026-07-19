// Board state as plain parallel 2D arrays (colorOf / hasRabbit / mark) — one
// entry per cell — rather than a dedicated per-cell object, since there's no
// value-type struct here to justify one.
window.sudoGGU = window.sudoGGU || {};
sudoGGU.Core = sudoGGU.Core || {};

sudoGGU.Core.Board = class Board {
  constructor(size) {
    this.size = size;
    this.colorOf = Array.from({ length: size }, () => new Array(size).fill(-1));
    this.hasRabbit = Array.from({ length: size }, () => new Array(size).fill(false));
    this.mark = Array.from({ length: size }, () => new Array(size).fill("empty")); // "empty" | "x" | "rabbit" | "wrongRabbit"
  }

  // Color count always equals grid size — see PuzzleGenerator.js for why.
  get colorCount() {
    return this.size;
  }

  rabbitsFound() {
    let found = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.hasRabbit[r][c] && this.mark[r][c] === "rabbit") found++;
      }
    }
    return found;
  }

  isSolved() {
    return this.rabbitsFound() === this.colorCount;
  }
};
