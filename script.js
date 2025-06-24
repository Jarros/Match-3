/**
 * Match-3 TEST TASK
 */
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
    }

    init() {
        this.initMRAID();
        this.setupScene();
        this.loadGemTextures(() => {
            this.createGrid();
            this.setupEventListeners();
            this.animate();
            this.showTutorial();
        });
    }

    loadGemTextures(callback) {
        this.gemTextures = [];
        const loader = new THREE.TextureLoader();
        let loadedCount = 0;
        const totalTextures = 6;
        
        console.log('Loading gem textures...');
        
        
        for (let i = 1; i <= totalTextures; i++) {
            loader.load(
                `https://cyborea.io/Match-3/assets/${i}.png`,
                (texture) => {
                    
                    texture.magFilter = THREE.LinearFilter;
                    texture.minFilter = THREE.LinearMipMapLinearFilter;
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    
                    this.gemTextures[i - 1] = texture;
                    loadedCount++;
                    
                    console.log(`Loaded texture ${i}/${totalTextures}`);
                    
                    if (loadedCount === totalTextures) {
                        console.log('All gem textures loaded successfully!');
                        callback();
                    }
                },
                undefined,
                (error) => {
                    console.error(`FAILED to load texture ${i}:`, error);
                    console.error('Make sure you are running a local server (npx http-server)');
                    console.error('Textures cannot load from file:// protocol due to CORS');
                }
            );
        }
    }

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

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2c3e50);

        
        const maxWidth = Math.min(window.innerWidth - 40, 360);
        const aspectRatio = 1; 
        const canvasWidth = maxWidth;
        const canvasHeight = maxWidth;

        
        this.camera = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 100);
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
    }

    createGrid() {
        this.grid = [];

        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                let gemType;
                do {
                    gemType = Math.floor(Math.random() * this.gemTypes);
                } while (this.wouldCreateMatch(row, col, gemType));

                const gem = this.createGem(gemType, null, row, col);
                this.grid[row][col] = {
                    mesh: gem,
                    type: gemType,
                    row: row,
                    col: col
                };
                this.scene.add(gem);
            }
        }
    }

    createGem(type, color, row, col) {
        
        const gemGroup = new THREE.Group();
        
        
        const planeGeometry = new THREE.PlaneGeometry(1.0, 1.0);
        const planeMaterial = new THREE.MeshBasicMaterial({ 
            map: this.gemTextures[type],
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });
        const visibleGem = new THREE.Mesh(planeGeometry, planeMaterial);
        
        
        const hitboxGeometry = new THREE.BoxGeometry(0.95, 0.95, 0.2);
        const hitboxMaterial = new THREE.MeshBasicMaterial({ 
            transparent: true,
            opacity: 0,
            visible: false 
        });
        const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        
        
        gemGroup.add(visibleGem);
        gemGroup.add(hitbox);
        
        
        gemGroup.position.set(
            col - this.gridSize / 2 + 0.5,
            -(row - this.gridSize / 2 + 0.5),
            0
        );
        
        
        gemGroup.userData = { row: row, col: col, type: type };
        
        
        hitbox.userData = { row: row, col: col, type: type };
        
        return gemGroup;
    }

    wouldCreateMatch(row, col, type) {
        
        let horizontalCount = 1;
        
        for (let c = col - 1; c >= 0 && this.grid[row] && this.grid[row][c] && this.grid[row][c].type === type; c--) {
            horizontalCount++;
        }
        
        for (let c = col + 1; c < this.gridSize && this.grid[row] && this.grid[row][c] && this.grid[row][c].type === type; c++) {
            horizontalCount++;
        }

        
        let verticalCount = 1;
        
        for (let r = row - 1; r >= 0 && this.grid[r] && this.grid[r][col] && this.grid[r][col].type === type; r--) {
            verticalCount++;
        }
        
        for (let r = row + 1; r < this.gridSize && this.grid[r] && this.grid[r][col] && this.grid[r][col].type === type; r++) {
            verticalCount++;
        }

        return horizontalCount >= 3 || verticalCount >= 3;
    }

    /**
     * Setup event listeners for desktop and mobile interaction
     */
    setupEventListeners() {
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
            const maxWidth = Math.min(window.innerWidth - 40, 360);
            this.camera.aspect = 1;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(maxWidth, maxWidth);
        });
    }

    /**
     * Handle pointer/touch start - begin drag operation
     */
    onPointerStart(event) {
        if (this.isAnimating || this.moves <= 0 || this.gameEnded) return;
        
        this.hideTutorial();
        
        const canvas = document.getElementById('game-canvas');
        const rect = canvas.getBoundingClientRect();
        
        
        const clientX = event.clientX || (event.touches && event.touches[0].clientX) || 0;
        const clientY = event.clientY || (event.touches && event.touches[0].clientY) || 0;
        
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        
        this.touchStartPos = { x: clientX, y: clientY };

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        
        const gemObjects = [];
        this.scene.traverse((child) => {
            if (child.isMesh && child.userData && child.userData.row !== undefined && child.material.visible === false) {
                
                const row = child.userData.row;
                const col = child.userData.col;
                
                
                if (this.grid[row] && this.grid[row][col] && this.grid[row][col].mesh) {
                    const gemMesh = this.grid[row][col].mesh;
                    const expectedY = -(row - this.gridSize / 2 + 0.5);
                    
                    
                    if (Math.abs(gemMesh.position.y - expectedY) < 0.1 && gemMesh.scale.x > 0.9) {
                        gemObjects.push(child);
                    }
                }
            }
        });
        
        const intersects = this.raycaster.intersectObjects(gemObjects);

        if (intersects.length > 0) {
            
            intersects.sort((a, b) => a.distance - b.distance);
            const clickedGem = intersects[0].object;
            
            
            const row = clickedGem.userData.row;
            const col = clickedGem.userData.col;
            if (this.grid[row] && this.grid[row][col] && this.grid[row][col].mesh) {
                this.dragStartGem = clickedGem;
                this.isDragging = true;
                this.selectGem(clickedGem);
                
                
                console.log('Gem selected:', row, col, 'at distance:', intersects[0].distance, 'pos:', this.grid[row][col].mesh.position.y);
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
                        
                        if (deltaX > 0 && startCol < this.gridSize - 1 && this.grid[startRow][startCol + 1]) {
                            targetGem = this.grid[startRow][startCol + 1];
                        } else if (deltaX < 0 && startCol > 0 && this.grid[startRow][startCol - 1]) {
                            targetGem = this.grid[startRow][startCol - 1];
                        }
                    } else {
                        
                        if (deltaY > 0 && startRow < this.gridSize - 1 && this.grid[startRow + 1] && this.grid[startRow + 1][startCol]) {
                            targetGem = this.grid[startRow + 1][startCol];
                        } else if (deltaY < 0 && startRow > 0 && this.grid[startRow - 1] && this.grid[startRow - 1][startCol]) {
                            targetGem = this.grid[startRow - 1][startCol];
                        }
                    }
                    
                    if (targetGem) {
                        console.log('Attempting swap from', startRow, startCol, 'to', targetGem.row, targetGem.col);
                        this.attemptSwap(this.selectedGem, targetGem);
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
        
        const gridGem = this.grid[gem.userData.row][gem.userData.col];
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
                this.selectedGem.col - this.gridSize / 2 + 0.5,
                -(this.selectedGem.row - this.gridSize / 2 + 0.5),
                0
            );
            this.selectedGem = null;
        }
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
            
            
            this.deselectGem();
            
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
        this.isAnimating = true;
        const gem1 = this.grid[row1][col1].mesh;
        const gem2 = this.grid[row2][col2].mesh;
        
        const pos1 = gem1.position.clone();
        const pos2 = gem2.position.clone();

        let progress = 0;
        const duration = 300;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / duration, 1);
            
            gem1.position.lerpVectors(pos1, pos2, progress);
            gem2.position.lerpVectors(pos2, pos1, progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };
        
        animate();
    }

    /**
     * Animate invalid move with visual feedback
     */
    animateInvalidMove(row1, col1, row2, col2) {
        this.isAnimating = true;
        const gem1 = this.grid[row1][col1].mesh;
        const gem2 = this.grid[row2][col2].mesh;
        
        const pos1 = gem1.position.clone();
        const pos2 = gem2.position.clone();

        
        const plane1 = gem1.children[0]; 
        const plane2 = gem2.children[0];

        
        let progress = 0;
        const totalDuration = 400;
        const startTime = Date.now();

        
        if (plane1 && plane1.material) {
            plane1.material.color.setHex(0xff4444);
        }
        if (plane2 && plane2.material) {
            plane2.material.color.setHex(0xff4444);
        }

        const animate = () => {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / totalDuration, 1);
            
            if (progress < 0.25) {
                
                const moveProgress = progress / 0.25;
                const easeProgress = this.easeOutCubic(moveProgress);
                
                gem1.position.lerpVectors(pos1, pos2, easeProgress * 0.2);
                gem2.position.lerpVectors(pos2, pos1, easeProgress * 0.2);
                
            } else {
                
                const wiggleProgress = (progress - 0.25) / 0.75;
                
                
                const wiggleFreq = 12;
                const dampening = 1 - wiggleProgress;
                const wiggleAmplitude = 0.08 * dampening;
                const wiggleX = Math.sin(wiggleProgress * wiggleFreq * Math.PI) * wiggleAmplitude;
                const wiggleY = Math.cos(wiggleProgress * wiggleFreq * Math.PI * 0.7) * wiggleAmplitude * 0.5;
                
                
                const returnProgress = this.easeOutElastic(wiggleProgress);
                
                gem1.position.lerpVectors(
                    pos1.clone().lerp(pos2, 0.2),
                    pos1,
                    returnProgress
                );
                gem1.position.x += wiggleX;
                gem1.position.y += wiggleY;
                
                gem2.position.lerpVectors(
                    pos2.clone().lerp(pos1, 0.2),
                    pos2,
                    returnProgress
                );
                gem2.position.x += wiggleX;
                gem2.position.y += wiggleY;
            }
            
            if (progress >= 1) {
                
                gem1.position.copy(pos1);
                gem2.position.copy(pos2);
                
                
                if (plane1 && plane1.material) {
                    plane1.material.color.setHex(0xffffff);
                }
                if (plane2 && plane2.material) {
                    plane2.material.color.setHex(0xffffff);
                }
                
                this.isAnimating = false;
                return;
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    /**
     * Easing function for smooth animation
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Bounce easing for snap-back effect
     */
    easeOutBounce(t) {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    }

    /**
     * Elastic easing for wiggle effect
     */
    easeOutElastic(t) {
        if (t === 0) return 0;
        if (t === 1) return 1;
        
        const p = 0.3;
        const s = p / 4;
        return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
    }

    /**
     * Back easing for disappearing effect
     */
    easeInBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    }

    /**
     * Back easing for appearing effect
     */
    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    findMatches(row, col) {
        
        if (!this.grid[row] || !this.grid[row][col] || this.grid[row][col].type === undefined) {
            return [];
        }
        
        const type = this.grid[row][col].type;
        const matches = [];

        
        const horizontal = [{ row, col }];
        
        
        for (let c = col - 1; c >= 0 && this.grid[row][c] && this.grid[row][c].type === type; c--) {
            horizontal.unshift({ row, col: c });
        }
        
        for (let c = col + 1; c < this.gridSize && this.grid[row][c] && this.grid[row][c].type === type; c++) {
            horizontal.push({ row, col: c });
        }

        if (horizontal.length >= 3) {
            matches.push(...horizontal);
        }

        
        const vertical = [{ row, col }];
        
        
        for (let r = row - 1; r >= 0 && this.grid[r][col] && this.grid[r][col].type === type; r--) {
            vertical.unshift({ row: r, col });
        }
        
        for (let r = row + 1; r < this.gridSize && this.grid[r][col] && this.grid[r][col].type === type; r++) {
            vertical.push({ row: r, col });
        }

        if (vertical.length >= 3) {
            matches.push(...vertical);
        }

        
        const uniqueMatches = [];
        matches.forEach(match => {
            if (!uniqueMatches.some(m => m.row === match.row && m.col === match.col)) {
                uniqueMatches.push(match);
            }
        });

        return uniqueMatches;
    }

    processMatches() {
        let allMatches = [];
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                
                if (this.grid[row] && this.grid[row][col]) {
                    const matches = this.findMatches(row, col);
                    matches.forEach(match => {
                        if (!allMatches.some(m => m.row === match.row && m.col === match.col)) {
                            allMatches.push(match);
                        }
                    });
                }
            }
        }

        if (allMatches.length > 0) {
            this.score += allMatches.length * 10;
            this.updateUI();
            this.removeMatches(allMatches);
            
            setTimeout(() => {
                this.applyGravity();
                setTimeout(() => {
                    this.fillEmptySpaces();
                    setTimeout(() => {
                        this.cleanupGemStates(); 
                        this.processMatches(); 
                    }, 500);
                }, 500);
            }, 300);
        }
    }

    /**
     * Remove matched gems with fancy disappearing animation
     */
    removeMatches(matches) {
        matches.forEach((match, index) => {
            const gem = this.grid[match.row][match.col];
            if (gem && gem.mesh) {
                
                if (this.selectedGem === gem) {
                    this.selectedGem = null;
                }
                gem.mesh.scale.set(1, 1, 1); 
                
                
                this.animateGemDisappear(gem.mesh, index * 50);
                this.grid[match.row][match.col] = null;
            }
        });
    }

    /**
     * Animate gem disappearing with fancy effects
     */
    animateGemDisappear(gemGroup, delay = 0) {
        const originalScale = gemGroup.scale.clone();
        const originalPosition = gemGroup.position.clone();
        
        
        const visiblePlane = gemGroup.children[0];
        
        setTimeout(() => {
            let progress = 0;
            const duration = 400;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                progress = Math.min(elapsed / duration, 1);
                
                
                const easeProgress = this.easeInBack(progress);
                
                
                const scale = (1 - easeProgress) * originalScale.x;
                gemGroup.scale.set(scale, scale, scale);
                
                
                gemGroup.rotation.x += 0.1;
                gemGroup.rotation.y += 0.15;
                gemGroup.rotation.z += 0.05;
                
                
                gemGroup.position.y = originalPosition.y + easeProgress * 0.5;
                
                
                visiblePlane.material.opacity = 1 - easeProgress;
                
                if (progress >= 1) {
                    
                    this.scene.remove(gemGroup);
                    return;
                }
                
                requestAnimationFrame(animate);
            };
            
            animate();
        }, delay);
    }

    /**
     * Apply gravity with smooth falling animations
     */
    applyGravity() {
        const fallAnimations = [];
        
        for (let col = 0; col < this.gridSize; col++) {
            let writePos = this.gridSize - 1;
            
            for (let row = this.gridSize - 1; row >= 0; row--) {
                if (this.grid[row][col] !== null) {
                    if (row !== writePos) {
                        
                        this.grid[writePos][col] = this.grid[row][col];
                        this.grid[row][col] = null;
                        
                        
                        const gem = this.grid[writePos][col];
                        const oldRow = gem.row;
                        gem.row = writePos;
                        gem.mesh.userData.row = writePos;
                        
                        if (gem.mesh.children[1] && gem.mesh.children[1].userData) {
                            gem.mesh.children[1].userData.row = writePos;
                        }
                        
                        
                        const fallDistance = writePos - oldRow;
                        fallAnimations.push({
                            gem: gem.mesh,
                            startY: gem.mesh.position.y,
                            endY: -(writePos - this.gridSize / 2 + 0.5),
                            delay: oldRow * 60 
                        });
                    }
                    writePos--;
                }
            }
        }
        
        
        fallAnimations.forEach(animation => {
            this.animateGemFall(animation.gem, animation.startY, animation.endY, animation.delay);
        });
    }

    /**
     * Animate gem falling with bouncy effect
     */
    animateGemFall(gemMesh, startY, endY, delay = 0) {
        setTimeout(() => {
            let progress = 0;
            const duration = 500;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                progress = Math.min(elapsed / duration, 1);
                
                
                const easeProgress = this.easeOutBounce(progress);
                
                
                gemMesh.position.y = startY + (endY - startY) * easeProgress;
                
                
                const squashFactor = 1 + Math.sin(progress * Math.PI * 3) * 0.1 * (1 - progress);
                gemMesh.scale.set(1, squashFactor, 1);
                
                
                gemMesh.rotation.z += 0.02 * (1 - progress);
                
                if (progress >= 1) {
                    
                    gemMesh.position.y = endY;
                    gemMesh.scale.set(1, 1, 1);
                    gemMesh.rotation.set(0, 0, 0);
                    return;
                }
                
                requestAnimationFrame(animate);
            };
            
            animate();
        }, delay);
    }

    /**
     * Fill empty spaces with new gems and fancy appearing animations
     */
    fillEmptySpaces() {
        const newGems = [];
        
        for (let col = 0; col < this.gridSize; col++) {
            let emptyCount = 0;
            
            for (let row = 0; row < this.gridSize; row++) {
                if (this.grid[row][col] === null) {
                    const gemType = Math.floor(Math.random() * this.gemTypes);
                    const gem = this.createGem(gemType, null, row, col);
                    
                    
                    const startY = this.gridSize / 2 + 2 + emptyCount * 1.2;
                    const endY = -(row - this.gridSize / 2 + 0.5);
                    const correctX = col - this.gridSize / 2 + 0.5;
                    gem.position.set(correctX, startY, 0);
                    
                    
                    gem.userData = { row: row, col: col, type: gemType };
                    const hitbox = gem.children[1]; 
                    if (hitbox) {
                        hitbox.userData = { row: row, col: col, type: gemType };
                    }
                    
                    
                    gem.scale.set(0, 0, 0);
                    
                    
                    const visiblePlane = gem.children[0];
                    if (visiblePlane && visiblePlane.material) {
                        visiblePlane.material.transparent = true;
                        visiblePlane.material.opacity = 0;
                    }
                    
                    this.grid[row][col] = {
                        mesh: gem,
                        type: gemType,
                        row: row,
                        col: col
                    };
                    
                    this.scene.add(gem);
                    
                    
                    newGems.push({
                        gem: gem,
                        startY: startY,
                        endY: endY,
                        delay: emptyCount * 150 
                    });
                    
                    emptyCount++;
                }
            }
        }
        
        
        newGems.forEach((gemData, index) => {
            this.animateGemAppear(gemData.gem, gemData.startY, gemData.endY, gemData.delay);
        });
    }

    /**
     * Animate new gem appearing with magical effect
     */
    animateGemAppear(gemMesh, startY, endY, delay = 0) {
        setTimeout(() => {
            let progress = 0;
            const appearDuration = 300;
            const fallDuration = 600;
            const totalDuration = appearDuration + fallDuration;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                progress = Math.min(elapsed / totalDuration, 1);
                
                if (elapsed < appearDuration) {
                    
                    const appearProgress = elapsed / appearDuration;
                    const easeProgress = this.easeOutBack(appearProgress);
                    
                    
                    const scale = easeProgress;
                    gemMesh.scale.set(scale, scale, scale);
                    
                    
                    const visiblePlane = gemMesh.children[0];
                    if (visiblePlane && visiblePlane.material) {
                        visiblePlane.material.opacity = appearProgress;
                    }
                    
                    
                    
                    
                    
                    gemMesh.rotation.y += 0.2;
                    
                } else {
                    
                    const fallProgress = (elapsed - appearDuration) / fallDuration;
                    const easeProgress = this.easeOutBounce(fallProgress);
                    
                    
                    gemMesh.scale.set(1, 1, 1);
                    const visiblePlane = gemMesh.children[0];
                    if (visiblePlane && visiblePlane.material) {
                        visiblePlane.material.opacity = 1;
                        
                        visiblePlane.material.transparent = true;
                    }
                    
                    
                    gemMesh.position.y = startY + (endY - startY) * easeProgress;
                    
                    
                    
                    
                    
                    gemMesh.rotation.y += 0.1 * (1 - fallProgress);
                }
                
                if (progress >= 1) {
                    
                    gemMesh.position.y = endY;
                    gemMesh.scale.set(1, 1, 1);
                    gemMesh.rotation.set(0, 0, 0); 
                    const visiblePlane = gemMesh.children[0];
                    if (visiblePlane && visiblePlane.material) {
                        visiblePlane.material.opacity = 1;
                        
                        visiblePlane.material.transparent = true;
                        visiblePlane.material.color.setHex(0xffffff); 
                    }
                    return;
                }
                
                requestAnimationFrame(animate);
            };
            
            animate();
        }, delay);
    }

    /**
     * Clean up any weird gem states (outline, scale, rotation issues)
     */
    cleanupGemStates() {
        
        this.deselectGem();
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const gem = this.grid[row][col];
                if (gem && gem.mesh) {
                    
                    gem.mesh.scale.set(1, 1, 1);
                    
                    gem.mesh.rotation.set(0, 0, 0);
                    
                    gem.mesh.position.set(
                        col - this.gridSize / 2 + 0.5,
                        -(row - this.gridSize / 2 + 0.5),
                        0
                    );
                    
                    
                    const visiblePlane = gem.mesh.children[0];
                    if (visiblePlane && visiblePlane.material) {
                        visiblePlane.material.opacity = 1;
                        
                        visiblePlane.material.transparent = true;
                        visiblePlane.material.color.setHex(0xffffff); 
                    }
                }
            }
        }
    }

    /**
     * Update UI elements with current game state
     */
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('moves').textContent = this.moves;
        
        
        if (this.moves <= 0 && !this.gameEnded) {
            this.gameEnded = true;
            setTimeout(() => {
                this.showGameOverModal();
            }, 500);
        }
    }

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
    showTutorial() {
        const tutorial = document.getElementById('tutorial-overlay');
        tutorial.classList.add('tutorial-active');
        
        
        setTimeout(() => {
            this.hideTutorial();
        }, 5000);
    }

    /**
     * Hide tutorial overlay
     */
    hideTutorial() {
        const tutorial = document.getElementById('tutorial-overlay');
        tutorial.classList.add('hidden');
    }

    /**
     * Show game over modal with CTA
     */
    showGameOverModal() {
        const modal = document.getElementById('game-over-modal');
        const finalScore = document.getElementById('final-score');
        
        finalScore.textContent = this.score;
        modal.classList.remove('hidden');
        
        
        if (this.mraid) {
            
            console.log('Game completed, score:', this.score);
        }
    }

    /**
     * Handle Call-to-Action button clicks
     */
    handleCTAClick() {
        
        if (this.mraid) {
            try {
                
                this.mraid.open('https://example-game-store-link.com');
            } catch (error) {
                console.log('MRAID open failed, using fallback');
                window.open('https://example-game-store-link.com', '_blank');
            }
        } else {
            
            window.open('https://example-game-store-link.com', '_blank');
        }
    }

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

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new Match3Game();
}); 