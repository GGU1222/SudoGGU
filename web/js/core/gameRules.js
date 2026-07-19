// Stateless validation helpers. Adjacency is 8-directional (orthogonal + diagonal).
window.sudoGGU = window.sudoGGU || {};
sudoGGU.Core = sudoGGU.Core || {};

sudoGGU.Core.GameRules = (function () {
  const ORTHOGONAL = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ];

  function isAdjacent8(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return false;
    return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
  }

  // True if (row, col) is 8-adjacent to any already-placed { row, col } position.
  function hasAdjacentConflict(placed, row, col) {
    for (let i = 0; i < placed.length; i++) {
      if (isAdjacent8(placed[i].row, placed[i].col, row, col)) return true;
    }
    return false;
  }

  return { ORTHOGONAL, isAdjacent8, hasAdjacentConflict };
})();
