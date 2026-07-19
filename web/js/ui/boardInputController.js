// Gesture recognizer for the board: single click = toggle X on/off, double-click =
// rabbit, mouse-drag across cells = bulk-apply X on every cell the pointer passes
// over, without toggling per cell mid-drag. Which direction a drag applies is fixed
// by its starting cell: starting from a non-X cell paints X everywhere the drag
// touches; starting from an already-X cell erases X everywhere it touches instead —
// so dragging back over a row you just X'd clears it just as easily. A
// correctly-found rabbit is locked by GameManager and ignores all of this.
//
// Double-click detection is done manually (not via the native `dblclick` event)
// because it has to compose cleanly with drag: a genuine drag must never wait on a
// click-timing window, and a plain tap must still recognize a fast second tap on the
// same cell as "mark rabbit" instead of two separate X marks.
//
// Every tap is applied immediately (markX toggles right away) rather than waiting
// out the double-click window first — the single-tap case is by far the more common
// one, and delaying it to see whether a second tap follows would make every X mark
// feel laggy. A second tap on the same cell within the window instead upgrades
// whatever the first tap just set into a rabbit mark, rather than toggling X a
// second time.
window.sudoGGU = window.sudoGGU || {};
sudoGGU.UI = sudoGGU.UI || {};

sudoGGU.UI.BoardInputController = class BoardInputController {
  constructor(rootEl, gameManager, { doubleClickThresholdMs = 300 } = {}) {
    this.rootEl = rootEl;
    this.gameManager = gameManager;
    this.doubleClickThresholdMs = doubleClickThresholdMs;

    this.pointerDown = false;
    this.dragging = false;
    this.dragOrigin = null; // { row, col }
    this.dragVisited = null; // Set of "row,col"
    this.lastTap = null; // { row, col, at } — the most recent completed tap

    rootEl.addEventListener("pointerdown", this._onPointerDown.bind(this));
    rootEl.addEventListener("pointermove", this._onPointerMove.bind(this));
    window.addEventListener("pointerup", this._onPointerUp.bind(this));

    rootEl.addEventListener("keydown", this._onKeyDown.bind(this));
  }

  _cellAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const cell = el && el.closest(".cell");
    if (!cell || !this.rootEl.contains(cell)) return null;
    return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  }

  _onPointerDown(e) {
    const cell = e.target.closest(".cell");
    if (!cell) return;

    // Belt-and-suspenders alongside the CSS touch-action:none on .cell — without
    // this, iOS Safari in particular can still treat a press-and-hold as a
    // long-press callout/selection gesture instead of handing it to us as a drag.
    e.preventDefault();

    this.pointerDown = true;
    this.dragging = false;
    this.dragOrigin = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
    this.dragVisited = new Set([`${this.dragOrigin.row},${this.dragOrigin.col}`]);

    // Decide the drag's direction from the origin cell's mark at the moment the
    // gesture starts: starting on an X cell erases, starting anywhere else paints.
    const originMark = this.gameManager.board.mark[this.dragOrigin.row][this.dragOrigin.col];
    this.dragMode = originMark === "x" ? "erase" : "paint";
  }

  _applyDragMode(row, col) {
    if (this.dragMode === "erase") this.gameManager.eraseX(row, col);
    else this.gameManager.paintX(row, col);
  }

  _onPointerMove(e) {
    if (!this.pointerDown) return;
    const pos = this._cellAt(e.clientX, e.clientY);
    if (!pos) return;

    const key = `${pos.row},${pos.col}`;
    if (this.dragVisited.has(key)) return;
    this.dragVisited.add(key);

    if (!this.dragging) {
      // First move into a *different* cell confirms this is a drag, not a click.
      // Apply the drag mode to the origin cell too — it was only recorded, not
      // acted on, until now.
      this.dragging = true;
      this._applyDragMode(this.dragOrigin.row, this.dragOrigin.col);
    }
    this._applyDragMode(pos.row, pos.col);
  }

  _onPointerUp() {
    if (!this.pointerDown) return;
    this.pointerDown = false;

    if (!this.dragging && this.dragOrigin) {
      this._handleTap(this.dragOrigin.row, this.dragOrigin.col);
    }
    this.dragging = false;
    this.dragOrigin = null;
    this.dragVisited = null;
  }

  _handleTap(row, col) {
    const isUpgrade = this.lastTap
      && this.lastTap.row === row
      && this.lastTap.col === col
      && Date.now() - this.lastTap.at <= this.doubleClickThresholdMs;

    if (isUpgrade) {
      // Second tap on the same cell within the window: upgrade the X the first
      // tap just placed into a rabbit mark, instead of toggling X a second time.
      this.lastTap = null;
      this.gameManager.markRabbit(row, col);
      return;
    }

    this.gameManager.markX(row, col);
    this.lastTap = { row, col, at: Date.now() };
  }

  // Keyboard fallback for accessibility: Enter/Space = X, Shift+Enter/Space = rabbit.
  _onKeyDown(e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    const cell = e.target.closest(".cell");
    if (!cell) return;
    e.preventDefault();

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (e.shiftKey) this.gameManager.markRabbit(row, col);
    else this.gameManager.markX(row, col);
  }
};
