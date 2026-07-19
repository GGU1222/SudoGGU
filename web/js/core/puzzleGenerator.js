// Two things worth knowing about this generator:
//
// 1. Color count always equals grid size. Choosing them independently only agrees
//    with "one rabbit per color" + "at most one rabbit per row/column" if the two
//    counts match — otherwise unused rows/columns make generating a uniquely-solvable
//    board measurably infeasible (confirmed empirically).
// 2. Grid size is fixed at 9: per-attempt success rate falls to ~0% at size 10+
//    across tens of thousands of trials, no matter how the generation strategy is
//    tuned, and 9 is the hardest size within that reliable range.
//
// Pipeline: backtrack N rabbit positions (no shared row/col, none 8-adjacent) -> grow N
// connected color regions one cell at a time, verifying uniqueness with PuzzleSolver
// before each commit -> retry with a fresh placement if the final board isn't unique.
window.sudoGGU = window.sudoGGU || {};
sudoGGU.Core = sudoGGU.Core || {};

sudoGGU.Core.PuzzleGenerator = (function () {
  const { ORTHOGONAL, hasAdjacentConflict } = sudoGGU.Core.GameRules;
  const { countSolutions } = sudoGGU.Core.PuzzleSolver;
  const Board = sudoGGU.Core.Board;

  const SIZE = 9;
  const MAX_ATTEMPTS = 5000;
  const MAX_PLACEMENT_SUBSET_ATTEMPTS = 50;

  function shuffle(arr, random) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function shuffledRange(n, random) {
    return shuffle(Array.from({ length: n }, (_, i) => i), random);
  }

  function backtrackPlacement(size, rows, index, placed, usedCols, random) {
    if (index === rows.length) return true;

    const row = rows[index];
    for (const col of shuffledRange(size, random)) {
      if (usedCols.has(col)) continue;
      if (hasAdjacentConflict(placed, row, col)) continue;

      placed.push({ row, col });
      usedCols.add(col);

      if (backtrackPlacement(size, rows, index + 1, placed, usedCols, random)) return true;

      placed.pop();
      usedCols.delete(col);
    }
    return false;
  }

  function generateRabbitPlacement(size, random) {
    for (let attempt = 0; attempt < MAX_PLACEMENT_SUBSET_ATTEMPTS; attempt++) {
      const rows = shuffledRange(size, random).sort((a, b) => a - b);
      const placed = [];
      const usedCols = new Set();
      if (backtrackPlacement(size, rows, 0, placed, usedCols, random)) return placed;
    }
    return null;
  }

  // Grows every color region outward from its seed cell one cell at a time. Adding a
  // cell to a region's domain can only ever keep the solution count the same or
  // increase it (never decrease it), so each candidate assignment is verified with
  // the solver before being committed, and rejected in favor of another color if it
  // would create a second solution. A cell with no safe color falls back to any valid
  // neighbor color; the caller's final solver check catches and discards those cases
  // (which just triggers a retry with a fresh placement).
  function growColorRegionsUniquely(board, colorGroups, random) {
    const size = board.size;
    const boundary = [];
    const inBoundary = Array.from({ length: size }, () => new Array(size).fill(false));

    function enqueueUncoloredNeighbors(row, col) {
      for (const [dr, dc] of ORTHOGONAL) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (inBoundary[nr][nc]) continue;
        if (board.colorOf[nr][nc] !== -1) continue;
        inBoundary[nr][nc] = true;
        boundary.push([nr, nc]);
      }
    }

    let remaining = size * size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board.colorOf[r][c] !== -1) {
          remaining--;
          enqueueUncoloredNeighbors(r, c);
        }
      }
    }

    while (remaining > 0) {
      if (boundary.length === 0) return false; // shouldn't happen on a connected grid

      const idx = Math.floor(random() * boundary.length);
      const [row, col] = boundary[idx];
      boundary[idx] = boundary[boundary.length - 1];
      boundary.pop();
      inBoundary[row][col] = false;

      if (board.colorOf[row][col] !== -1) continue; // already claimed via another path

      const candidateColors = [];
      for (const [dr, dc] of ORTHOGONAL) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const neighborColor = board.colorOf[nr][nc];
        if (neighborColor !== -1 && !candidateColors.includes(neighborColor)) {
          candidateColors.push(neighborColor);
        }
      }
      shuffle(candidateColors, random);

      let chosenColor = candidateColors[0]; // guaranteed non-empty: cell came from the boundary
      let foundSafeColor = false;
      for (const color of candidateColors) {
        board.colorOf[row][col] = color;
        colorGroups[color].push({ row, col });
        if (countSolutions(colorGroups, 2) === 1) {
          chosenColor = color;
          foundSafeColor = true;
          break;
        }
        colorGroups[color].pop();
        board.colorOf[row][col] = -1;
      }

      if (!foundSafeColor) {
        // No color kept the puzzle unique — accept the ambiguity for now; the
        // caller's final check will reject this whole attempt if it persists.
        board.colorOf[row][col] = chosenColor;
        colorGroups[chosenColor].push({ row, col });
      }

      remaining--;
      enqueueUncoloredNeighbors(row, col);
    }

    return true;
  }

  function generateOnce(size, random) {
    const placement = generateRabbitPlacement(size, random);
    if (!placement) return null;

    const board = new Board(size);
    const colorGroups = Array.from({ length: size }, () => []);

    placement.forEach((p, i) => {
      board.colorOf[p.row][p.col] = i;
      board.hasRabbit[p.row][p.col] = true;
      colorGroups[i].push({ row: p.row, col: p.col });
    });

    if (!growColorRegionsUniquely(board, colorGroups, random)) return null;

    // Reject any board with a 1-cell region: a region that size is exactly its
    // rabbit's own cell, giving that rabbit's color away for free and trivializing
    // the puzzle. Regions only ever grow (never shrink) during growth, so this can
    // only be caught after the fact, not prevented mid-growth.
    if (colorGroups.some((group) => group.length < 2)) return null;

    return countSolutions(colorGroups, 2) === 1 ? board : null;
  }

  // `seed` (any string or number) makes generation deterministic — the same seed
  // always retries in the same order and lands on the same final board, so a
  // puzzle can be replayed by sharing its seed (e.g. via a URL). Omitting it
  // picks a fresh random seed each call, same as before seeding existed. The
  // seed actually used is returned on the board (`board.seed`) so the caller can
  // read back a randomly-picked one.
  function generate(seed, size = SIZE) {
    const rng = sudoGGU.Core.Rng.create(seed);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const board = generateOnce(size, rng.random);
      if (board) {
        board.seed = rng.seed;
        return board;
      }
    }
    throw new Error(`Failed to generate a unique-solution puzzle after ${MAX_ATTEMPTS} attempts (size=${size}).`);
  }

  return { generate, SIZE };
})();
