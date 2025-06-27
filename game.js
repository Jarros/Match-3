/**
 * Main game module containing the Match3Game class.
 */
import { GridHelper } from './grid.js';
import {
    animateSwap as doAnimateSwap,
    animateInvalidMove as doAnimateInvalidMove,
    animateGemDisappear as doAnimateGemDisappear,
    animateGemFall as doAnimateGemFall,
    animateGemAppear as doAnimateGemAppear
} from './animations.js';
import { UIHelper } from './ui.js';
import gemURIs from './textures.js';
import { InteractionHandler } from './input.js';
import * as THREE from 'three';

class Match3Game {
    constructor() {

        this.scene = null;
        this.camera = null;
        this.renderer = null;


        this.grid = [];
        this.gridSize = 6;
        this.gemTypes = 6;
        this.selectedGem = null;
        this.score = 0;
        this.moves = 10;
        this.isAnimating = false;
        this.gameEnded = false;


        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isDragging = false;
        this.dragStartGem = null;


        this.touchStartPos = { x: 0, y: 0 };
        this.touchEndPos = { x: 0, y: 0 };


        this.mraid = null;

        this.init();

        this.input = new InteractionHandler();
        this.input.setupEventListeners();
        this.input.bindGame(this);
    }

    /**
     * Initialize the game and MRAID
     */
    init() {
        this.initMRAID();
        this.setupScene();
        this.loadGemTextures(() => {
            this.createGrid();
            //   this.setupEventListeners();
            this.animate();
            this.showTutorial();
        });
    }

    /**
     * Load gem texture assets (required for game to work)
     */

    loadGemTextures(cb) {
        const loader = new THREE.TextureLoader();
        this.gemTextures = [];
        let done = 0;
        gemURIs.forEach((uri, i) =>
            loader.load(uri, tex => {
                tex.colorSpace = THREE.SRGBColorSpace;   // r152+
                this.gemTextures[i] = tex;
                if (++done === gemURIs.length) cb();
            })
        );
    }

    /**
     * Initialize MRAID v2.0 for mobile advertising
     */
    initMRAID() {
        if (typeof mraid !== 'undefined') {
            this.mraid = mraid;

            if (this.mraid.getState() === 'loading') {
                this.mraid.addEventListener('ready', () => {
                    console.log('MRAID ready');
                });
            }


            this.mraid.addEventListener('viewableChange', (viewable) => {
                if (viewable) {
                    console.log('Ad became viewable');
                }
            });
        }
    }

    /**
     * Setup Three.js scene optimized for mobile performance
     */
    setupScene() {

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2c3e50);


        // Calculate optimal canvas size that fits in both portrait and landscape
        const isLandscape = window.innerWidth > window.innerHeight;
        let maxSize;
        if (isLandscape) {
            // Reserve some vertical space for header / UI / CTA (~160px)
            const reserved = 140;
            maxSize = Math.min(window.innerHeight - reserved, 300); // cap at 300 in landscape
        } else {
            const viewportMin = Math.min(window.innerWidth, window.innerHeight);
            maxSize = Math.min(viewportMin - 40, 360);
        }
        const canvasWidth = maxSize;
        const canvasHeight = maxSize;


        // Create camera with mobile-optimized settings (square aspect)
        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        this.camera.position.set(0, 0, 6);


        const canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: false,
            alpha: true,
            powerPreference: 'low-power'
        });

        this.renderer.setSize(canvasWidth, canvasHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = false;


        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;   // r152+
    }


    createGrid() { GridHelper.createGrid(this); }

    createGem(type, color, row, col) { return GridHelper.createGem(this, type, color, row, col); }

    wouldCreateMatch(row, col, type) { return GridHelper.wouldCreateMatch(this, row, col, type); }

    findMatches(row, col) { return GridHelper.findMatches(this, row, col); }

    processMatches() { GridHelper.processMatches(this); }

    removeMatches(matches) { GridHelper.removeMatches(this, matches); }

    applyGravity() { GridHelper.applyGravity(this); }

    fillEmptySpaces() { GridHelper.fillEmptySpaces(this); }

    cleanupGemStates() { GridHelper.cleanupGemStates(this); }

    // Gem animation wrappers (previously removed)
    animateGemDisappear(gemGroup, delay = 0) {
        doAnimateGemDisappear(this, gemGroup, delay);
    }

    animateGemFall(gemMesh, startY, endY, delay = 0) {
        doAnimateGemFall(this, gemMesh, startY, endY, delay);
    }

    animateGemAppear(gemMesh, startY, endY, delay = 0) {
        doAnimateGemAppear(this, gemMesh, startY, endY, delay);
    }

    /**
     * Attempt to swap two adjacent gems
     */
    attemptSwap(gem1, gem2) {

        if (!gem1 || !gem2 || gem1.row === undefined || gem1.col === undefined ||
            gem2.row === undefined || gem2.col === undefined) {
            return;
        }

        const row1 = gem1.row, col1 = gem1.col;
        const row2 = gem2.row, col2 = gem2.col;


        const isAdjacent = (Math.abs(row1 - row2) === 1 && col1 === col2) ||
            (Math.abs(col1 - col2) === 1 && row1 === row2);

        if (isAdjacent) {
            this.swapGems(row1, col1, row2, col2);
        }
    }

    swapGems(row1, col1, row2, col2) {
        if (this.isAnimating) return;


        const temp = this.grid[row1][col1];
        this.grid[row1][col1] = this.grid[row2][col2];
        this.grid[row2][col2] = temp;


        this.grid[row1][col1].row = row1;
        this.grid[row1][col1].col = col1;
        this.grid[row2][col2].row = row2;
        this.grid[row2][col2].col = col2;


        const gemMesh1 = this.grid[row1][col1].mesh;
        const gemMesh2 = this.grid[row2][col2].mesh;

        if (gemMesh1 && gemMesh1.userData) {
            gemMesh1.userData.row = row1;
            gemMesh1.userData.col = col1;
        }
        if (gemMesh2 && gemMesh2.userData) {
            gemMesh2.userData.row = row2;
            gemMesh2.userData.col = col2;
        }


        if (gemMesh1 && gemMesh1.children[1] && gemMesh1.children[1].userData) {
            gemMesh1.children[1].userData.row = row1;
            gemMesh1.children[1].userData.col = col1;
        }
        if (gemMesh2 && gemMesh2.children[1] && gemMesh2.children[1].userData) {
            gemMesh2.children[1].userData.row = row2;
            gemMesh2.children[1].userData.col = col2;
        }

        const matches1 = this.findMatches(row1, col1);
        const matches2 = this.findMatches(row2, col2);

        if (matches1.length > 0 || matches2.length > 0) {

            this.animateSwap(row1, col1, row2, col2);
            this.moves--;
            this.updateUI();


            this.input.deselectGem();

            setTimeout(() => {
                this.processMatches();
            }, 300);
        } else {

            this.animateInvalidMove(row1, col1, row2, col2);


            const temp = this.grid[row1][col1];
            this.grid[row1][col1] = this.grid[row2][col2];
            this.grid[row2][col2] = temp;


            this.grid[row1][col1].row = row1;
            this.grid[row1][col1].col = col1;
            this.grid[row2][col2].row = row2;
            this.grid[row2][col2].col = col2;


            const revertMesh1 = this.grid[row1][col1].mesh;
            const revertMesh2 = this.grid[row2][col2].mesh;
            if (revertMesh1 && revertMesh1.userData) {
                revertMesh1.userData.row = row1;
                revertMesh1.userData.col = col1;
            }
            if (revertMesh2 && revertMesh2.userData) {
                revertMesh2.userData.row = row2;
                revertMesh2.userData.col = col2;
            }
            if (revertMesh1 && revertMesh1.children[1] && revertMesh1.children[1].userData) {
                revertMesh1.children[1].userData.row = row1;
                revertMesh1.children[1].userData.col = col1;
            }
            if (revertMesh2 && revertMesh2.children[1] && revertMesh2.children[1].userData) {
                revertMesh2.children[1].userData.row = row2;
                revertMesh2.children[1].userData.col = col2;
            }

            console.log('Invalid move - no matches would be created');
        }
    }

    /**
     * Animate valid gem swap
     */
    animateSwap(row1, col1, row2, col2) {
        doAnimateSwap(this, row1, col1, row2, col2);
    }

    /**
     * Animate invalid move with visual feedback
     */
    animateInvalidMove(row1, col1, row2, col2) {
        doAnimateInvalidMove(this, row1, col1, row2, col2);
    }

    /**
     * Update UI elements with current game state
     */
    updateUI() { UIHelper.updateUI(this); }

    resetGame() {

        this.grid.forEach(row => {
            row.forEach(cell => {
                if (cell && cell.mesh) {
                    this.scene.remove(cell.mesh);
                }
            });
        });


        this.score = 0;
        this.moves = 30;
        this.selectedGem = null;
        this.isAnimating = false;


        this.createGrid();
        this.updateUI();
    }

    animate() {
        requestAnimationFrame(() => this.animate());


        const t = performance.now() * 0.001;

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.grid[row][col];
                if (!cell || !cell.mesh) continue;


                if (cell.mesh.scale.x < 0.99) continue;


                const phase = (row + col) * 0.4;
                const angle = Math.sin(t * 2 + phase) * 0.12;


                cell.mesh.rotation.z = angle;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Show tutorial overlay for first-time users
     */
    showTutorial() { UIHelper.showTutorial(this); }

    /**
     * Hide tutorial overlay
     */
    hideTutorial() { UIHelper.hideTutorial(this); }

    /**
     * Show game over modal with CTA
     */
    showGameOverModal() { UIHelper.showGameOverModal(this); }


    /**
     * Debug method to check raycasting and gem detection
     */
    debugRaycast(event) {
        const canvas = document.getElementById('game-canvas');
        const rect = canvas.getBoundingClientRect();

        const clientX = event.clientX || (event.touches && event.touches[0].clientX) || 0;
        const clientY = event.clientY || (event.touches && event.touches[0].clientY) || 0;

        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const gemObjects = [];
        this.scene.traverse((child) => {
            if (child.isMesh && child.userData && child.userData.row !== undefined) {
                gemObjects.push(child);
            }
        });

        const intersects = this.raycaster.intersectObjects(gemObjects);

        console.log('Debug raycast:', {
            mouseCoords: { x: this.mouse.x, y: this.mouse.y },
            screenCoords: { x: clientX, y: clientY },
            rectInfo: rect,
            totalGems: gemObjects.length,
            intersections: intersects.length,
            firstHit: intersects.length > 0 ? intersects[0].object.userData : null
        });

        return intersects;
    }
}

export { Match3Game }; 