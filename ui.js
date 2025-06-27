/* UI / DOM helpers extracted from script.js. */

function updateUI(game) {
  document.getElementById('score').textContent = game.score;
  document.getElementById('moves').textContent = game.moves;
  if (game.moves <= 0 && !game.gameEnded) {
    game.gameEnded = true;
    setTimeout(() => showGameOverModal(game), 500);
  }
}

function showTutorial(game) {
  const tutorial = document.getElementById('tutorial-overlay');
  tutorial.classList.add('tutorial-active');
  setTimeout(() => hideTutorial(game), 5000);
}

function hideTutorial(_game) {
  const tutorial = document.getElementById('tutorial-overlay');
  tutorial.classList.add('hidden');
}

function showGameOverModal(game) {
  const modal = document.getElementById('game-over-modal');
  const finalScore = document.getElementById('final-score');
  finalScore.textContent = game.score;
  modal.classList.remove('hidden');
  if (game.mraid) {
    console.log('Game completed, score:', game.score);
  }
}

function handleCTAClick(game) {
  const url = 'https://example-game-store-link.com';
  if (game.mraid) {
    try { game.mraid.open(url); } catch { window.open(url, '_blank'); }
  } else {
    window.open(url, '_blank');
  }
}

const UIHelper = { updateUI, showTutorial, hideTutorial, showGameOverModal, handleCTAClick };

export { UIHelper, updateUI, showTutorial, hideTutorial, showGameOverModal, handleCTAClick }; 