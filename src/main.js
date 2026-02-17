import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';

const COLORS = {
    bg: 0x121212,
    playerX: '#ff4757',
    playerO: '#2e86de',
    border: '#000000',
    face: '#eeeeee',
    win: '#2ed573'
};

class RubiksTicTacToe {
    constructor() {
        this.currentPlayer = 'X';
        this.moveCount = 0;
        this.cubies = [];
        this.winner = null;
        this.isAnimating = false; // Guard to prevent overlapping turns
        
        this._setupScene();
        this._setupUI();
        this.resetGame();
        this._addEventListeners();
        this._animate();
    }

    _setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(COLORS.bg);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(4, 4, 7);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        const point = new THREE.PointLight(0xffffff, 0.8);
        point.position.set(10, 10, 10);
        this.scene.add(ambient, point);
    }

    _setupUI() {
        this.ui = document.createElement('div');
        this.ui.style.cssText = 'position:fixed; top:20px; left:20px; color:white; font-family:sans-serif; pointer-events:none;';
        document.body.appendChild(this.ui);
    }

    updateUI() {
        let statusText = this.winner ? `WINNER: ${this.winner}!` : `Turn: ${this.currentPlayer}`;
        this.ui.innerHTML = `
            <h2 style="margin:0; color: ${this.winner ? COLORS.win : 'white'}">${statusText}</h2>
            <p>Moves: ${this.moveCount}</p>
            <div style="pointer-events:auto; background:rgba(0,0,0,0.5); padding:10px; border-radius:5px;">
                <small>1,2,3: Verticals (Down) | Q,W,E: Horizontals (Right)</small><br>
                <button id="resetBtn" style="margin-top:10px; cursor:pointer;">Reset Game</button>
            </div>
        `;
        document.getElementById('resetBtn').onclick = () => this.resetGame();
    }

    _createMaterial(mark = null) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = COLORS.face;
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 20;
        ctx.strokeRect(0, 0, 256, 256);

        if (mark) {
            ctx.fillStyle = mark === 'X' ? COLORS.playerX : COLORS.playerO;
            ctx.font = 'bold 160px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mark, 128, 128);
        }
        return new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(canvas) });
    }

    resetGame() {
        this.cubies.forEach(c => this.scene.remove(c));
        this.cubies = [];
        this.currentPlayer = 'X';
        this.moveCount = 0;
        this.winner = null;
        this.isAnimating = false;

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const materials = Array(6).fill(0).map(() => this._createMaterial());
                    const cubie = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), materials);
                    cubie.position.set(x, y, z);
                    cubie.userData.marks = Array(6).fill(null);
                    this.scene.add(cubie);
                    this.cubies.push(cubie);
                }
            }
        }
        this.updateUI();
    }

    _getFrontFaceIndex(cubie) {
        const worldNormal = new THREE.Vector3();
        const localNormals = [
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
        ];
        
        for (let i = 0; i < 6; i++) {
            worldNormal.copy(localNormals[i]).applyQuaternion(cubie.quaternion);
            if (Math.round(worldNormal.z) === 1) return i;
        }
        return -1;
    }

    checkWin() {
        const grid = Array(3).fill(null).map(() => Array(3).fill(null));
        const frontCubies = this.cubies.filter(c => Math.round(c.position.z) === 1);

        frontCubies.forEach(c => {
            const faceIdx = this._getFrontFaceIndex(c);
            const x = Math.round(c.position.x) + 1;
            const y = Math.round(c.position.y) + 1;
            grid[y][x] = c.userData.marks[faceIdx];
        });

        const lines = [];
        for(let i=0; i<3; i++) {
            lines.push([grid[i][0], grid[i][1], grid[i][2]]);
            lines.push([grid[0][i], grid[1][i], grid[2][i]]);
        }
        lines.push([grid[0][0], grid[1][1], grid[2][2]]);
        lines.push([grid[0][2], grid[1][1], grid[2][0]]);

        for (let line of lines) {
            if (line[0] && line[0] === line[1] && line[0] === line[2]) {
                this.winner = line[0];
                this.updateUI();
                return;
            }
        }
    }

    /**
     * ANIMATED ROTATION LOGIC
     */
    async rotateLayer(axis, val, angle) {
        if (this.winner || this.isAnimating) return;
        this.isAnimating = true;

        const group = new THREE.Group();
        this.scene.add(group);
        const targets = this.cubies.filter(c => Math.round(c.position[axis]) === val);
        targets.forEach(c => group.attach(c));
        
        // Animation Settings
        const duration = 400; // ms
        const startTime = performance.now();
        const startRotation = group.rotation[axis];

        return new Promise(resolve => {
            const animateRotation = (time) => {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease out cubic function
                const ease = 1 - Math.pow(1 - progress, 3);
                group.rotation[axis] = startRotation + (angle * ease);

                if (progress < 1) {
                    requestAnimationFrame(animateRotation);
                } else {
                    // Finalize positions
                    targets.forEach(c => {
                        this.scene.attach(c);
                        c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
                        c.rotation.set(
                            Math.round(c.rotation.x / (Math.PI/2)) * (Math.PI/2),
                            Math.round(c.rotation.y / (Math.PI/2)) * (Math.PI/2),
                            Math.round(c.rotation.z / (Math.PI/2)) * (Math.PI/2)
                        );
                    });
                    this.scene.remove(group);
                    this.isAnimating = false;
                    this.moveCount++;
                    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
                    this.checkWin();
                    this.updateUI();
                    resolve();
                }
            };
            requestAnimationFrame(animateRotation);
        });
    }

    _addEventListeners() {
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            // 1,2,3 now rotate 'x' with -Math.PI/2 (Downwards)
            if (k === '1') this.rotateLayer('x', -1, -Math.PI/2);
            if (k === '2') this.rotateLayer('x', 0, -Math.PI/2);
            if (k === '3') this.rotateLayer('x', 1, -Math.PI/2);
            
            // Q,W,E now rotate 'y' with Math.PI/2 (Rightwards)
            if (k === 'q') this.rotateLayer('y', 1, Math.PI/2);
            if (k === 'w') this.rotateLayer('y', 0, Math.PI/2);
            if (k === 'e') this.rotateLayer('y', -1, Math.PI/2);
        });

        window.addEventListener('click', (e) => {
            if (this.winner || this.isAnimating || e.target.tagName === 'BUTTON') return;
            const mouse = new THREE.Vector2((e.clientX/window.innerWidth)*2-1, -(e.clientY/window.innerHeight)*2+1);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);
            const hits = raycaster.intersectObjects(this.cubies);

            if (hits.length > 0) {
                const cubie = hits[0].object;
                if (Math.round(cubie.position.z) === 1) {
                    const faceIdx = this._getFrontFaceIndex(cubie);
                    if (!cubie.userData.marks[faceIdx]) {
                        cubie.userData.marks[faceIdx] = this.currentPlayer;
                        cubie.material[faceIdx] = this._createMaterial(this.currentPlayer);
                        this.moveCount++;
                        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
                        this.checkWin();
                        this.updateUI();
                    }
                }
            }
        });
    }

    _animate() {
        requestAnimationFrame(() => this._animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new RubiksTicTacToe();