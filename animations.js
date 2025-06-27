/* Gem animation helpers extracted from script.js for better separation of concerns. */

// ===== EASING HELPERS =====
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutBounce(t) {
  if (t < 1 / 2.75) {
    return 7.5 * t * t;
  } else if (t < 2 / 2.75) {
    return 7.5 * (t -= 1.5 / 2.75) * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    return 7.5 * (t -= 2.25 / 2.75) * t + 0.95;
  } else {
    return 7.5 * (t -= 2.6 / 2.75) * t + 0.95;
  }
}

export function easeOutElastic(t) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const p = 0.3;
  const s = p / 4;
  return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
}

export function easeInBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
}

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ===== CORE GEM ANIMATIONS =====
export function animateSwap(game, row1, col1, row2, col2) {
  game.isAnimating = true;
  const gem1 = game.grid[row1][col1].mesh;
  const gem2 = game.grid[row2][col2].mesh;
  const pos1 = gem1.position.clone();
  const pos2 = gem2.position.clone();
  let progress = 0;
  const duration = 300;
  const startTime = Date.now();
  const step = () => {
    const elapsed = Date.now() - startTime;
    progress = Math.min(elapsed / duration, 1);
    gem1.position.lerpVectors(pos1, pos2, progress);
    gem2.position.lerpVectors(pos2, pos1, progress);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      game.isAnimating = false;
    }
  };
  step();
}

export function animateInvalidMove(game, row1, col1, row2, col2) {
  game.isAnimating = true;
  const gem1 = game.grid[row1][col1].mesh;
  const gem2 = game.grid[row2][col2].mesh;
  const pos1 = gem1.position.clone();
  const pos2 = gem2.position.clone();
  const plane1 = gem1.children[0];
  const plane2 = gem2.children[0];

  let progress = 0;
  const totalDuration = 400;
  const startTime = Date.now();

  if (plane1 && plane1.material) plane1.material.color.setHex(0xff4444);
  if (plane2 && plane2.material) plane2.material.color.setHex(0xff4444);

  const step = () => {
    const elapsed = Date.now() - startTime;
    progress = Math.min(elapsed / totalDuration, 1);

    if (progress < 0.25) {
      const moveProgress = progress / 0.25;
      const easeP = easeOutCubic(moveProgress);
      gem1.position.lerpVectors(pos1, pos2, easeP * 0.2);
      gem2.position.lerpVectors(pos2, pos1, easeP * 0.2);
    } else {
      const wiggleProgress = (progress - 0.25) / 0.75;
      const wiggleFreq = 12;
      const damp = 1 - wiggleProgress;
      const amp = 0.08 * damp;
      const wiggleX = Math.sin(wiggleProgress * wiggleFreq * Math.PI) * amp;
      const wiggleY = Math.cos(wiggleProgress * wiggleFreq * Math.PI * 0.7) * amp * 0.5;
      const returnP = easeOutElastic(wiggleProgress);

      gem1.position.lerpVectors(pos1.clone().lerp(pos2, 0.2), pos1, returnP);
      gem2.position.lerpVectors(pos2.clone().lerp(pos1, 0.2), pos2, returnP);
      gem1.position.x += wiggleX;
      gem1.position.y += wiggleY;
      gem2.position.x += wiggleX;
      gem2.position.y += wiggleY;
    }

    if (progress >= 1) {
      gem1.position.copy(pos1);
      gem2.position.copy(pos2);
      if (plane1 && plane1.material) plane1.material.color.setHex(0xffffff);
      if (plane2 && plane2.material) plane2.material.color.setHex(0xffffff);
      game.isAnimating = false;
      return;
    }
    requestAnimationFrame(step);
  };
  step();
}

export function animateGemDisappear(game, gemGroup, delay = 0) {
  const originalScale = gemGroup.scale.clone();
  const originalPos = gemGroup.position.clone();
  const visiblePlane = gemGroup.children[0];
  setTimeout(() => {
    let progress = 0;
    const duration = 400;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);
      const easeP = easeInBack(progress);
      const scale = (1 - easeP) * originalScale.x;
      gemGroup.scale.set(scale, scale, scale);
      gemGroup.rotation.x += 0.1;
      gemGroup.rotation.y += 0.15;
      gemGroup.rotation.z += 0.05;
      gemGroup.position.y = originalPos.y + easeP * 0.5;
      if (visiblePlane && visiblePlane.material) {
        visiblePlane.material.opacity = 1 - easeP;
      }
      if (progress >= 1) {
        game.scene.remove(gemGroup);
        return;
      }
      requestAnimationFrame(step);
    };
    step();
  }, delay);
}

export function animateGemFall(game, gemMesh, startY, endY, delay = 0) {
  setTimeout(() => {
    let progress = 0;
    const duration = 500;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);
      const easeP = easeOutBounce(progress);
      gemMesh.position.y = startY + (endY - startY) * easeP;
      const squash = 1 + Math.sin(progress * Math.PI * 3) * 0.1 * (1 - progress);
      gemMesh.scale.set(1, squash, 1);
      gemMesh.rotation.z += 0.02 * (1 - progress);
      if (progress >= 1) {
        gemMesh.position.y = endY;
        gemMesh.scale.set(1, 1, 1);
        gemMesh.rotation.set(0, 0, 0);
        return;
      }
      requestAnimationFrame(step);
    };
    step();
  }, delay);
}

export function animateGemAppear(game, gemMesh, startY, endY, delay = 0) {
  setTimeout(() => {
    let progress = 0;
    const appearDuration = 300;
    const fallDuration = 600;
    const total = appearDuration + fallDuration;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / total, 1);
      if (elapsed < appearDuration) {
        const appearP = elapsed / appearDuration;
        const easeP = easeOutBack(appearP);
        gemMesh.scale.set(easeP, easeP, easeP);
        const plane = gemMesh.children[0];
        if (plane && plane.material) {
          plane.material.opacity = appearP;
        }
        gemMesh.rotation.y += 0.2;
      } else {
        const fallP = (elapsed - appearDuration) / fallDuration;
        const easeP = easeOutBounce(fallP);
        gemMesh.scale.set(1, 1, 1);
        const plane = gemMesh.children[0];
        if (plane && plane.material) {
          plane.material.opacity = 1;
          plane.material.transparent = true;
        }
        gemMesh.position.y = startY + (endY - startY) * easeP;
        gemMesh.rotation.y += 0.1 * (1 - fallP);
      }
      if (progress >= 1) {
        gemMesh.position.y = endY;
        gemMesh.scale.set(1, 1, 1);
        gemMesh.rotation.set(0, 0, 0);
        const plane = gemMesh.children[0];
        if (plane && plane.material) {
          plane.material.opacity = 1;
          plane.material.transparent = true;
          plane.material.color.setHex(0xffffff);
        }
        return;
      }
      requestAnimationFrame(step);
    };
    step();
  }, delay);
} 