// Shows remaining lives as filled/empty heart glyphs.
window.sudoGGU = window.sudoGGU || {};
sudoGGU.UI = sudoGGU.UI || {};

sudoGGU.UI.LivesView = class LivesView {
  constructor(rootEl, gameManager) {
    this.rootEl = rootEl;
    this.gameManager = gameManager;

    gameManager.on("livesChanged", (lives) => this.render(lives));
  }

  render(lives) {
    const max = this.gameManager.maxLives;
    let html = "";
    for (let i = 0; i < max; i++) {
      html += i < lives
        ? '<span class="heart-full">🍓</span>'
        : '<span class="heart-empty">💩</span>';
    }
    this.rootEl.innerHTML = html;
  }
};
