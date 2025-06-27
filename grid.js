import * as THREE from 'three';

/* Grid / board management helpers extracted from script.js for better structure. */

// ========= CORE HELPERS =========

function createGem(game, type, color, row, col) {
  const gemGroup = new THREE.Group();
  const planeGeometry = new THREE.PlaneGeometry(1.0, 1.0);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: game.gemTextures[type],
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide
  });
  const visibleGem = new THREE.Mesh(planeGeometry, planeMaterial);

  const hitboxGeometry = new THREE.BoxGeometry(0.95, 0.95, 0.2);
  const hitboxMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, visible: false });
  const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);

  gemGroup.add(visibleGem);
  gemGroup.add(hitbox);

  gemGroup.position.set(
    col - game.gridSize / 2 + 0.5,
    -(row - game.gridSize / 2 + 0.5),
    0
  );

  gemGroup.userData = { row, col, type };
  hitbox.userData = { row, col, type };

  return gemGroup;
}

function createGrid(game) {
  game.grid = [];
  for (let row = 0; row < game.gridSize; row++) {
    game.grid[row] = [];
    for (let col = 0; col < game.gridSize; col++) {
      let gemType;
      do {
        gemType = Math.floor(Math.random() * game.gemTypes);
      } while (wouldCreateMatch(game, row, col, gemType));

      const gem = createGem(game, gemType, null, row, col);
      game.grid[row][col] = { mesh: gem, type: gemType, row, col };
      game.scene.add(gem);
    }
  }
}

function wouldCreateMatch(game, row, col, type) {
  let horizontalCount = 1;
  for (let c = col - 1; c >= 0 && game.grid[row] && game.grid[row][c] && game.grid[row][c].type === type; c--) {
    horizontalCount++;
  }
  for (let c = col + 1; c < game.gridSize && game.grid[row] && game.grid[row][c] && game.grid[row][c].type === type; c++) {
    horizontalCount++;
  }
  let verticalCount = 1;
  for (let r = row - 1; r >= 0 && game.grid[r] && game.grid[r][col] && game.grid[r][col].type === type; r--) {
    verticalCount++;
  }
  for (let r = row + 1; r < game.gridSize && game.grid[r] && game.grid[r][col] && game.grid[r][col].type === type; r++) {
    verticalCount++;
  }
  return horizontalCount >= 3 || verticalCount >= 3;
}

function findMatches(game, row, col) {
  if (!game.grid[row] || !game.grid[row][col] || game.grid[row][col].type === undefined) return [];
  const type = game.grid[row][col].type;
  const matches = [];
  const horizontal = [{ row, col }];
  for (let c = col - 1; c >= 0 && game.grid[row][c] && game.grid[row][c].type === type; c--) horizontal.unshift({ row, col: c });
  for (let c = col + 1; c < game.gridSize && game.grid[row][c] && game.grid[row][c].type === type; c++) horizontal.push({ row, col: c });
  if (horizontal.length >= 3) matches.push(...horizontal);
  const vertical = [{ row, col }];
  for (let r = row - 1; r >= 0 && game.grid[r] && game.grid[r][col] && game.grid[r][col].type === type; r--) vertical.unshift({ row: r, col });
  for (let r = row + 1; r < game.gridSize && game.grid[r] && game.grid[r][col] && game.grid[r][col].type === type; r++) vertical.push({ row: r, col });
  if (vertical.length >= 3) matches.push(...vertical);
  const unique = [];
  matches.forEach(m => { if (!unique.some(u => u.row === m.row && u.col === m.col)) unique.push(m); });
  return unique;
}

function removeMatches(game, matches) {
  matches.forEach((match, index) => {
    const gem = game.grid[match.row][match.col];
    if (gem && gem.mesh) {
      if (game.selectedGem === gem) game.selectedGem = null;
      gem.mesh.scale.set(1, 1, 1);
      game.animateGemDisappear(gem.mesh, index * 50);
      game.grid[match.row][match.col] = null;
    }
  });
}

function processMatches(game) {
  let allMatches = [];
  for (let row = 0; row < game.gridSize; row++) {
    for (let col = 0; col < game.gridSize; col++) {
      if (game.grid[row] && game.grid[row][col]) {
        const m = findMatches(game, row, col);
        m.forEach(mat => { if (!allMatches.some(u => u.row === mat.row && u.col === mat.col)) allMatches.push(mat); });
      }
    }
  }
  if (allMatches.length > 0) {
    game.score += allMatches.length * 10;
    game.updateUI();
    removeMatches(game, allMatches);
    setTimeout(() => {
      applyGravity(game);
      setTimeout(() => {
        fillEmptySpaces(game);
        setTimeout(() => {
          cleanupGemStates(game);
          processMatches(game);
        }, 500);
      }, 500);
    }, 300);
  }
}

function applyGravity(game) {
  const falls = [];
  for (let col = 0; col < game.gridSize; col++) {
    let writePos = game.gridSize - 1;
    for (let row = game.gridSize - 1; row >= 0; row--) {
      if (game.grid[row][col] !== null) {
        if (row !== writePos) {
          game.grid[writePos][col] = game.grid[row][col];
          game.grid[row][col] = null;
          const gem = game.grid[writePos][col];
          const oldRow = gem.row;
          gem.row = writePos;
          gem.mesh.userData.row = writePos;
          if (gem.mesh.children[1] && gem.mesh.children[1].userData) gem.mesh.children[1].userData.row = writePos;
          falls.push({ gem: gem.mesh, startY: gem.mesh.position.y, endY: -(writePos - game.gridSize / 2 + 0.5), delay: oldRow * 60 });
        }
        writePos--;
      }
    }
  }
  falls.forEach(f => game.animateGemFall(f.gem, f.startY, f.endY, f.delay));
}

function fillEmptySpaces(game) {
  const newGems = [];
  for (let col = 0; col < game.gridSize; col++) {
    let emptyCount = 0;
    for (let row = 0; row < game.gridSize; row++) {
      if (game.grid[row][col] === null) {
        const gemType = Math.floor(Math.random() * game.gemTypes);
        const gem = createGem(game, gemType, null, row, col);
        const startY = game.gridSize / 2 + 2 + emptyCount * 1.2;
        const endY = -(row - game.gridSize / 2 + 0.5);
        const correctX = col - game.gridSize / 2 + 0.5;
        gem.position.set(correctX, startY, 0);
        gem.userData = { row, col, type: gemType };
        if (gem.children[1]) gem.children[1].userData = { row, col, type: gemType };
        gem.scale.set(0, 0, 0);
        const plane = gem.children[0];
        if (plane && plane.material) { plane.material.transparent = true; plane.material.opacity = 0; }
        game.grid[row][col] = { mesh: gem, type: gemType, row, col };
        game.scene.add(gem);
        newGems.push({ gem, startY, endY, delay: emptyCount * 150 });
        emptyCount++;
      }
    }
  }
  newGems.forEach(g => game.animateGemAppear(g.gem, g.startY, g.endY, g.delay));
}

function cleanupGemStates(game) {
  game.input.deselectGem();
  for (let row = 0; row < game.gridSize; row++) {
    for (let col = 0; col < game.gridSize; col++) {
      const gem = game.grid[row][col];
      if (gem && gem.mesh) {
        gem.mesh.scale.set(1, 1, 1);
        gem.mesh.rotation.set(0, 0, 0);
        gem.mesh.position.set(col - game.gridSize / 2 + 0.5, -(row - game.gridSize / 2 + 0.5), 0);
        const plane = gem.mesh.children[0];
        if (plane && plane.material) { plane.material.opacity = 1; plane.material.transparent = true; plane.material.color.setHex(0xffffff); }
      }
    }
  }
}

// Expose helpers in a single object so Match3Game can call them without import
const GridHelper = {
  createGrid,
  createGem,
  wouldCreateMatch,
  findMatches,
  processMatches,
  removeMatches,
  applyGravity,
  fillEmptySpaces,
  cleanupGemStates
};

// eslint-disable-next-line no-unused-vars
export { GridHelper, createGrid, createGem, wouldCreateMatch, findMatches, processMatches, removeMatches, applyGravity, fillEmptySpaces, cleanupGemStates }; 