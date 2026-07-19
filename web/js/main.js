// Bootstraps GameManager + the UI views. Overlay/progress-pill wiring lives here
// rather than a dedicated view class since it's page-markup-specific.
(function () {
  "use strict";

  const boardEl = document.getElementById("board");
  const livesEl = document.getElementById("lives");
  const progressEl = document.getElementById("progress");
  const overlayEl = document.getElementById("overlay");
  const overlayHeadlineEl = document.getElementById("overlayHeadline");
  const overlaySubEl = document.getElementById("overlaySub");
  const newGameBtn = document.getElementById("newGameBtn");
  const helpBtn = document.getElementById("helpBtn");
  const helpOverlayEl = document.getElementById("helpOverlay");
  const helpCloseBtn = document.getElementById("helpCloseBtn");

  const gameManager = new sudoGGU.Game.GameManager({ maxLives: 3, nextPuzzleDelayMs: 2000 });

  new sudoGGU.UI.BoardView(boardEl, gameManager);
  new sudoGGU.UI.LivesView(livesEl, gameManager);

  function updateProgress() {
    progressEl.textContent = `${gameManager.board.rabbitsFound()}/${gameManager.board.size}`;
  }

  function hideOverlay() {
    overlayEl.classList.remove("show");
  }

  function showOverlay(headline, sub) {
    overlayHeadlineEl.textContent = headline;
    overlaySubEl.textContent = sub;
    overlayEl.classList.add("show");
  }

  // Keeps the URL's `?seed=` in sync with whatever board is currently on screen,
  // so copying the address bar always shares the exact puzzle being played.
  function syncSeedToUrl() {
    const url = new URL(location.href);
    url.searchParams.set("seed", gameManager.board.seed);
    history.replaceState(null, "", url);
  }

  gameManager.on("boardGenerated", () => {
    hideOverlay();
    updateProgress();
    syncSeedToUrl();
  });
  gameManager.on("cellChanged", updateProgress);
  gameManager.on("gameOver", () => showOverlay("게임 오버 😢"));
  gameManager.on("gameWon", () => showOverlay("게임 클리어 🤗"));

  newGameBtn.addEventListener("click", () => gameManager.startNewGame());

  function showHelp() {
    helpOverlayEl.classList.add("show");
  }

  function hideHelp() {
    helpOverlayEl.classList.remove("show");
  }

  helpBtn.addEventListener("click", showHelp);
  helpCloseBtn.addEventListener("click", hideHelp);
  // Clicking the dimmed backdrop (not the card itself) also dismisses it.
  helpOverlayEl.addEventListener("click", (e) => {
    if (e.target === helpOverlayEl) hideHelp();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && helpOverlayEl.classList.contains("show")) hideHelp();
  });

  // A `?seed=` in the incoming URL replays that exact board; otherwise a fresh
  // random one is generated (and then written into the URL by syncSeedToUrl).
  gameManager.startNewGame(new URLSearchParams(location.search).get("seed"));
})();
