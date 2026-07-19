// Renders the current Board as an NxN grid of cell buttons; click/drag handling
// lives in BoardInputController, which this wires up alongside rendering.
// Placeholder art: solid-colored squares (CSS custom properties --palette-0..8) with
// a glyph for the player's mark.
window.sudoGGU = window.sudoGGU || {};
sudoGGU.UI = sudoGGU.UI || {};

sudoGGU.UI.BoardView = class BoardView {
  constructor(rootEl, gameManager) {
    this.rootEl = rootEl;
    this.gameManager = gameManager;
    this.cellEls = null;

    new sudoGGU.UI.BoardInputController(rootEl, gameManager);

    gameManager.on("boardGenerated", (board) => this.render(board));
    gameManager.on("cellChanged", (row, col) => this.updateCell(row, col));
  }

  render(board) {
    this.board = board;
    this.rootEl.style.gridTemplateColumns = `repeat(${board.size}, 1fr)`;
    this.rootEl.innerHTML = "";
    this.cellEls = Array.from({ length: board.size }, () => new Array(board.size));

    for (let row = 0; row < board.size; row++) {
      for (let col = 0; col < board.size; col++) {
        const btn = document.createElement("button");
        btn.className = "cell";
        btn.dataset.row = String(row);
        btn.dataset.col = String(col);
        btn.style.background = `var(--palette-${board.colorOf[row][col] % 9})`;
        btn.setAttribute("aria-label", `row ${row + 1}, col ${col + 1}`);
        btn.innerHTML = BoardView.glyphFor(board.mark[row][col]);

        this.rootEl.appendChild(btn);
        this.cellEls[row][col] = btn;
      }
    }
  }

  updateCell(row, col) {
    this.cellEls[row][col].innerHTML = BoardView.glyphFor(this.board.mark[row][col]);
  }

  static glyphFor(mark) {
    if (mark === "rabbit") return '<span class="glyph rabbit">🐰</span>';
    if (mark === "x") return BoardView._xGlyph("x");
    if (mark === "wrongRabbit") return BoardView._xGlyph("x wrong");
    return "";
  }

  // Shared markup for both X variants: two crossed bars (see the .glyph.x CSS
  // comment for why bars instead of a unicode glyph), styled by `classes`.
  static _xGlyph(classes) {
    return `<span class="glyph ${classes}"><span class="bar bar1"></span><span class="bar bar2"></span></span>`;
  }
};
