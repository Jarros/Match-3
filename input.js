
import { UIHelper } from './ui.js';

/**
 * Setup event listeners for desktop and mobile interaction
 */

export class InteractionHandler {

     setupEventListeners() {
        // console.log("LISTENER");
        const canvas = document.getElementById('game-canvas');


        canvas.addEventListener('mousedown', (event) => this.onPointerStart(event));
        canvas.addEventListener('mousemove', (event) => this.onPointerMove(event));
        canvas.addEventListener('mouseup', (event) => this.onPointerEnd(event));


        canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.touches.length === 1) {
                this.onPointerStart(event.touches[0]);
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.touches.length === 1) { 
                this.onPointerMove(event.touches[0]);
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.changedTouches.length === 1) {
                this.onPointerEnd(event.changedTouches[0]);
            }
        }, { passive: false });


        document.getElementById('install-btn').addEventListener('click', () => {
            this.handleCTAClick();
        });

        document.getElementById('play-full-game').addEventListener('click', () => {
            this.handleCTAClick();
        });


        window.addEventListener('resize', () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            let maxSize;
            if (isLandscape) {
                const reserved = 140;
                maxSize = Math.min(window.innerHeight - reserved, 300);
            } else {
                const viewportMin = Math.min(window.innerWidth, window.innerHeight);
                maxSize = Math.min(viewportMin - 40, 360);
            }
            this.game.camera.aspect = 1;
            this.game.camera.updateProjectionMatrix();
            this.game.renderer.setSize(maxSize, maxSize);
        });
    }

    bindGame(game){
        this.game = game;
    }

    /**
     * Handle pointer/touch start - begin drag operation
     */
     onPointerStart(event) {
        if (this.isAnimating || this.moves <= 0 || this.gameEnded) return;

        UIHelper.hideTutorial();

        const canvas = document.getElementById('game-canvas');
        const rect = canvas.getBoundingClientRect();


        const clientX = event.clientX || (event.touches && event.touches[0].clientX) || 0;
        const clientY = event.clientY || (event.touches && event.touches[0].clientY) || 0;

        this.game.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.game.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.touchStartPos = { x: clientX, y: clientY };

        this.game.raycaster.setFromCamera(this.game.mouse, this.game.camera);


        const gemObjects = [];
        this.game.scene.traverse((child) => {
            if (child.isMesh && child.userData && child.userData.row !== undefined && child.material.visible === false) {

                const row = child.userData.row;
                const col = child.userData.col;


                if (this.game.grid[row] && this.game.grid[row][col] && this.game.grid[row][col].mesh) {
                    const gemMesh = this.game.grid[row][col].mesh;
                    const expectedY = -(row - this.game.gridSize / 2 + 0.5);


                    if (Math.abs(gemMesh.position.y - expectedY) < 0.1 && gemMesh.scale.x > 0.9) {
                        gemObjects.push(child);
                    }
                }
            }
        });

        const intersects = this.game.raycaster.intersectObjects(gemObjects);

        if (intersects.length > 0) {

            intersects.sort((a, b) => a.distance - b.distance);
            const clickedGem = intersects[0].object;


            const row = clickedGem.userData.row;
            const col = clickedGem.userData.col;
            if (this.game.grid[row] && this.game.grid[row][col] && this.game.grid[row][col].mesh) {
                this.dragStartGem = clickedGem;
                this.isDragging = true;
                this.selectGem(clickedGem);


                console.log('Gem selected:', row, col, 'at distance:', intersects[0].distance, 'pos:', this.game.grid[row][col].mesh.position.y);
            } else {
                console.log('Invalid gem selected - not in grid');
                this.deselectGem();
                this.isDragging = false;
                this.dragStartGem = null;
            }
        } else {

            console.log('No gems hit, available gems:', gemObjects.length);
            this.deselectGem();
            this.isDragging = false;
            this.dragStartGem = null;
        }
    }

    /**
     * Handle pointer/touch move - track drag direction
     */
     onPointerMove(event) {
        if (this.isAnimating) return;


        const clientX = event.clientX || (event.touches && event.touches[0].clientX) || 0;
        const clientY = event.clientY || (event.touches && event.touches[0].clientY) || 0;

        this.touchEndPos = { x: clientX, y: clientY };


        if (this.touchStartPos && this.touchEndPos && this.dragStartGem) {
            const deltaX = this.touchEndPos.x - this.touchStartPos.x;
            const deltaY = this.touchEndPos.y - this.touchStartPos.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);


            if (distance > 10 && !this.isDragging) {
                this.isDragging = true;
            }
        }
    }

    /**
     * Handle pointer/touch end - complete drag operation
     */
     onPointerEnd(event) {
        if (this.isAnimating) return;


        if (this.dragStartGem && this.touchStartPos) {

            if (this.touchEndPos) {
                const deltaX = this.touchEndPos.x - this.touchStartPos.x;
                const deltaY = this.touchEndPos.y - this.touchStartPos.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const minDragDistance = 20;

                console.log('Drag distance:', distance, 'Delta X:', deltaX, 'Delta Y:', deltaY);


                if (distance > minDragDistance) {
                    let targetGem = null;
                    const startRow = this.dragStartGem.userData.row;
                    const startCol = this.dragStartGem.userData.col;

                    if (Math.abs(deltaX) > Math.abs(deltaY)) {

                        if (deltaX > 0 && startCol < this.game.gridSize - 1 && this.game.grid[startRow][startCol + 1]) {
                            targetGem = this.game.grid[startRow][startCol + 1];
                        } else if (deltaX < 0 && startCol > 0 && this.game.grid[startRow][startCol - 1]) {
                            targetGem = this.game.grid[startRow][startCol - 1];
                        }
                    } else {

                        if (deltaY > 0 && startRow < this.game.gridSize - 1 && this.game.grid[startRow + 1] && this.game.grid[startRow + 1][startCol]) {
                            targetGem = this.game.grid[startRow + 1][startCol];
                        } else if (deltaY < 0 && startRow > 0 && this.game.grid[startRow - 1] && this.game.grid[startRow - 1][startCol]) {
                            targetGem = this.game.grid[startRow - 1][startCol];
                        }
                    }

                    if (targetGem) {
                        console.log('Attempting swap from', startRow, startCol, 'to', targetGem.row, targetGem.col);
                        this.game.attemptSwap(this.selectedGem, targetGem);
                    } else {
                        console.log('No valid target gem found');
                    }
                } else {

                    console.log('Tap detected, gem remains selected');
                }
            }
        }


        if (this.isDragging) {
            this.deselectGem();
        }

        this.isDragging = false;
        this.dragStartGem = null;
        this.touchStartPos = null;
        this.touchEndPos = null;
    }

     selectGem(gem) {

        if (!gem || !gem.userData || gem.userData.row === undefined || gem.userData.col === undefined) {
            return;
        }

        const gridGem = this.game.grid[gem.userData.row][gem.userData.col];
        if (!gridGem || !gridGem.mesh) {
            return;
        }

        this.selectedGem = gridGem;

    }

     deselectGem() {
        if (this.selectedGem && this.selectedGem.mesh) {

            this.selectedGem.mesh.scale.set(1, 1, 1);
            this.selectedGem.mesh.rotation.set(0, 0, 0);
            this.selectedGem.mesh.position.set(
                this.selectedGem.col - this.game.gridSize / 2 + 0.5,
                -(this.selectedGem.row - this.game.gridSize / 2 + 0.5),
                0
            );
            this.selectedGem = null;
        }
    }

}
