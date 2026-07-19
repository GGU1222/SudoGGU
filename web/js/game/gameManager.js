// Owns the current puzzle and all game-state rules: lives, marking cells,
// win/loss. Emits events that UI code subscribes to, keeping state and
// rendering decoupled.
window.sudoGGU = window.sudoGGU || {};
sudoGGU.Game = sudoGGU.Game || {};

// Fires a short vibration on devices/browsers that support the Vibration API
// (mainly Android Chrome — iOS Safari has no navigator.vibrate at all). Hung off
// the sudoGGU namespace rather than a bare top-level function so it doesn't leak
// into the shared global scope that all the plain <script>-tag files sit in.
//
// Calls within MIN_GAP_MS of the last real vibrate() are staggered (delayed to
// land right at the gap) rather than dropped or fired immediately. This matters
// because BoardInputController applies a drag's mode to two cells — the drag's
// origin, then the newly-entered cell — in the same handler call the instant a
// drag is first confirmed, so the very first two vibrate() requests of any drag
// always arrive ~0ms apart, no matter how slowly the user actually drags. Firing
// navigator.vibrate() twice that close together cancels/restarts the motor before
// the first pulse can physically ramp up (so it's never felt), and simply
// dropping the second call instead means it's never felt either — staggering is
// the only option that lets both register as distinct, felt pulses.
sudoGGU.Game._vibrate = (function () {
  const MIN_GAP_MS = 60;
  let lastFireAt = -Infinity;
  let pending = null;

  function fire() {
    lastFireAt = Date.now();
    pending = null;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
  }

  return function vibrate() {
    const wait = MIN_GAP_MS - (Date.now() - lastFireAt);
    if (wait <= 0) {
      fire();
    } else if (!pending) {
      pending = setTimeout(fire, wait);
    }
  };
})();

sudoGGU.Game.GameManager = class GameManager {
  constructor({ maxLives = 3, nextPuzzleDelayMs = 2000 } = {}) {
    this.maxLives = maxLives;
    this.nextPuzzleDelayMs = nextPuzzleDelayMs;

    this.board = null;
    this.lives = maxLives;
    this.isGameOver = false;
    this.isGameWon = false;

    this._listeners = {
      boardGenerated: [], // (board) => void — fired on every new puzzle, including the first
      cellChanged: [], // (row, col) => void — fired whenever a single cell's mark changes
      livesChanged: [], // (lives) => void
      gameOver: [], // () => void
      gameWon: [], // () => void
    };
  }

  on(event, handler) {
    this._listeners[event].push(handler);
  }

  _emit(event, ...args) {
    for (const handler of this._listeners[event]) handler(...args);
  }

  // `seed` reproduces a specific board (see PuzzleGenerator.generate); omitting
  // it picks a fresh random one, as before seeding existed.
  startNewGame(seed) {
    this.board = sudoGGU.Core.PuzzleGenerator.generate(seed);
    this.lives = this.maxLives;
    this.isGameOver = false;
    this.isGameWon = false;

    this._emit("livesChanged", this.lives);
    this._emit("boardGenerated", this.board);
  }

  // A correctly-found rabbit is locked in place — no further click/drag can change it.
  _isLockedRabbit(row, col) {
    const board = this.board;
    return board.mark[row][col] === "rabbit" && board.hasRabbit[row][col];
  }

  // Double-click: mark a cell as containing a rabbit. If the cell turns out to have
  // no rabbit, it's marked wrong (rendered as a dark-red X) instead, and costs a
  // life; either way it's idempotent, so repeat double-clicks never cost a second
  // life once a cell already shows "rabbit" or "wrongRabbit".
  markRabbit(row, col) {
    if (this.isGameOver || this.isGameWon) return;

    const board = this.board;
    const mark = board.mark[row][col];
    if (mark === "rabbit" || mark === "wrongRabbit") return;

    sudoGGU.Game._vibrate();

    if (!board.hasRabbit[row][col]) {
      board.mark[row][col] = "wrongRabbit";
      this._emit("cellChanged", row, col);

      this.lives--;
      this._emit("livesChanged", this.lives);
      if (this.lives <= 0) {
        this.isGameOver = true;
        this._emit("gameOver");
        setTimeout(() => this.startNewGame(), this.nextPuzzleDelayMs);
      }
      return;
    }

    board.mark[row][col] = "rabbit";
    this._emit("cellChanged", row, col);

    if (board.isSolved()) {
      this.isGameWon = true;
      this._emit("gameWon");
      setTimeout(() => this.startNewGame(), this.nextPuzzleDelayMs);
    }
  }

  // Single click: toggle a cell between X and empty. Never costs a life. A
  // correctly-found rabbit is locked and ignores this.
  markX(row, col) {
    if (this.isGameOver || this.isGameWon) return;
    if (this._isLockedRabbit(row, col)) return;

    const board = this.board;
    board.mark[row][col] = board.mark[row][col] === "x" ? "empty" : "x";
    sudoGGU.Game._vibrate();
    this._emit("cellChanged", row, col);
  }

  // Drag-paint: force-mark a cell as X. Unlike markX this never toggles back to
  // empty, so dragging across cells only ever adds X marks, regardless of whether a
  // cell already happened to be X. A correctly-found rabbit is still locked.
  paintX(row, col) {
    if (this.isGameOver || this.isGameWon) return;
    if (this._isLockedRabbit(row, col)) return;

    const board = this.board;
    if (board.mark[row][col] === "x") return;

    board.mark[row][col] = "x";
    sudoGGU.Game._vibrate();
    this._emit("cellChanged", row, col);
  }

  // Drag-erase: force-clear a cell's X mark back to empty. Used when a drag starts
  // from an already-X cell, so dragging then removes X from every cell it passes
  // over — the mirror image of paintX, for clearing a whole row/column of X marks
  // as easily as they were added.
  eraseX(row, col) {
    if (this.isGameOver || this.isGameWon) return;
    if (this._isLockedRabbit(row, col)) return;

    const board = this.board;
    if (board.mark[row][col] !== "x") return;

    board.mark[row][col] = "empty";
    sudoGGU.Game._vibrate();
    this._emit("cellChanged", row, col);
  }
};
