// Exhaustive backtracking solver used to verify a puzzle has exactly one solution.
// Variables (colors) are searched most-constrained-first (MRV) and the search
// stops early once `cap` solutions are found, so uniqueness checks stay cheap
// even while called thousands of times during generation.
window.sudoGGU = window.sudoGGU || {};
sudoGGU.Core = sudoGGU.Core || {};

sudoGGU.Core.PuzzleSolver = (function () {
  const { hasAdjacentConflict } = sudoGGU.Core.GameRules;

  // colorGroups: array (index = colorId) of arrays of { row, col } cells currently
  // assigned to that color.
  function countSolutions(colorGroups, cap) {
    const size = colorGroups.length;
    const order = colorGroups
      .map((group, i) => i)
      .sort((a, b) => colorGroups[a].length - colorGroups[b].length);

    const usedRow = new Array(size).fill(false);
    const usedCol = new Array(size).fill(false);
    const placed = [];
    let count = 0;

    function search(orderIdx) {
      if (orderIdx === order.length) {
        count++;
        return count >= cap;
      }

      const group = colorGroups[order[orderIdx]];
      for (const cell of group) {
        if (usedRow[cell.row] || usedCol[cell.col]) continue;
        if (hasAdjacentConflict(placed, cell.row, cell.col)) continue;

        usedRow[cell.row] = true;
        usedCol[cell.col] = true;
        placed.push(cell);

        const reachedCap = search(orderIdx + 1);

        placed.pop();
        usedRow[cell.row] = false;
        usedCol[cell.col] = false;

        if (reachedCap) return true;
      }
      return false;
    }

    search(0);
    return count;
  }

  return { countSolutions };
})();
