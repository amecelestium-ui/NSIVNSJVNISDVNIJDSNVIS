/**
 * ONYXPURE — JKT48 3D Arena
 * js/arenaEngine.js
 * 
 * Full 3D MOBA Gameplay Engine:
 * - Three.js r170 PBR Renderer with ACES Filmic Tone Mapping & RoomEnvironment
 * - Circular 28m Arena with Nexus Crystals, Stone Grid Floor & Obstacle Sliding Collisions
 * - Rigging, Height Normalization (1.85m), Bone-Attached Weapons & AnimationMixer
 * - Procedural Animation Fallback for Static GLBs
 * - 3 Enemy Training Dummies with Overhead HP Bars, Hit Flash, Knockback & Auto-Respawn
 * - Integration with VFXSystem and ControlsManager
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { VFXSystem } from './vfxSystem.js';
import { ControlsManager } from './controls.js';
import { getHeroModelUrls, registerLocalGlb } from './githubScanner.js';

export class ArenaEngine {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container
     * @param {Object} options.hero
     * @param {Function} options.onBackToLobby
     */
    constructor({ container, hero, onBackToLobby }) {
        this.container = container;
        this.hero = hero;
        this.onBackToLobby = onBackToLobby || (() => {});

        // Engine loop state
        this.isRunning = false;
        this.clock = new THREE.Clock();

        // Player Stats & State
        this.player = {
            mesh: null,
            mixer: null,
            actions: {},
            currentAction: null,
            weaponMesh: null,
            pos: new THREE.Vector3(0, 0, 8), // Start slightly offset from center
            rotY: 0,
            hp: 2400,
            maxHp: 2400,
            moveSpeed: 7.2,
            isAttacking: false,
            comboStep: 0,
            lastAttackTime: 0,
            isDashing: false,
            dashVelocity: new THREE.Vector3(),
            proceduralTimer: 0
        };

        // Enemy Training Dummies
        this.enemies = [];
        this.killCount = 0;

        // Obstacles for collision
        this.obstacles = [];

        // Setup loaders
        this.initLoaders();

        // Setup DOM HUD
        this.initDOM();

        // Setup Three.js scene, camera, renderer
        this.initThreeScene();

        // Build Arena World
        this.buildArenaEnvironment();

        // Spawn 3 Training Dummies
        this.spawnTrainingDummies();

        // Initialize VFX System
        this.vfx = new VFXSystem(this.scene, this.camera);

        // Load Player Character 3D Model
        this.loadPlayerHero();

        // Initialize Controls (Analog, Keyboard, Follow Camera, Skill Reticles)
        this.initControls();

        // Start Gameplay Loop
        this.isRunning = true;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    /**
     * GLTF & DRACO Loaders
     */
    initLoaders() {
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://unpkg.com/three@0.170.0/examples/jsm/libs/draco/gltf/');

        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    /**
     * Injects Arena Floating HUD and Control Overlays
     */
    initDOM() {
        this.container.innerHTML = `
            <div id="arena-viewport" class="arena-viewport">
                <!-- 3D Gameplay WebGL Canvas -->
                <canvas id="arena-canvas"></canvas>

                <!-- Top HUD Bar -->
                <div class="arena-top-hud hud-interactive">
                    <div class="hud-hero-profile">
                        <div class="hud-avatar">
                            <span class="hud-avatar-text">${this.hero.name.charAt(0)}</span>
                        </div>
                        <div class="hud-bars">
                            <div class="hud-hero-header">
                                <span class="hud-hero-name">${this.hero.name}</span>
                                <span class="hud-hero-team ${this.hero.team.replace('_', '-')}">${this.hero.team.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <!-- Player HP Bar -->
                            <div class="stat-bar-track hp-track">
                                <div id="player-hp-bar" class="stat-bar-fill hp-fill" style="width: 100%;"></div>
                                <span id="player-hp-text" class="stat-bar-label">2400 / 2400</span>
                            </div>
                            <!-- Player Energy Bar -->
                            <div class="stat-bar-track energy-track">
                                <div id="player-energy-bar" class="stat-bar-fill energy-fill" style="width: 100%;"></div>
                                <span id="player-energy-text" class="stat-bar-label">100 / 100</span>
                            </div>
                        </div>
                    </div>

                    <!-- Center Score / Dummy Target Tracker -->
                    <div class="hud-score-board">
                        <div class="score-label">TRAINING DUMMIES SLAIN</div>
                        <div id="hud-score-count" class="score-number">0</div>
                    </div>

                    <!-- Right Controls / Settings -->
                    <div class="hud-top-actions">
                        <label class="btn-hud-small" title="Upload GLB model langsung di arena">
                            📂 Ganti .GLB
                            <input type="file" id="arena-glb-uploader" accept=".glb,.gltf" style="display:none;">
                        </label>
                        <button id="btn-back-lobby" class="btn-hud-small btn-lobby-return">
                            ↩ Ganti Hero
                        </button>
                    </div>
                </div>

                <!-- Bottom Left: Virtual Joystick -->
                <div class="joystick-zone">
                    <div id="joystick-base" class="joystick-base">
                        <div id="joystick-thumb" class="joystick-thumb"></div>
                    </div>
                </div>

                <!-- Bottom Right: MOBA Skill Cluster -->
                <div class="moba-skill-cluster hud-interactive">
                    <!-- Skill 1 (Q) -->
                    <div class="skill-btn-wrapper">
                        <button id="btn-skill-q" class="moba-btn skill-q" title="Skill 1 (Hotkey: Q)">
                            <span class="skill-shortcut-badge">Q</span>
                            <span class="skill-icon-text">S1</span>
                            <div id="cd-overlay-q" class="cd-overlay"></div>
                            <span id="cd-text-q" class="cd-number"></span>
                        </button>
                        <span class="skill-btn-label">${this.hero.skills.q.name}</span>
                    </div>

                    <!-- Skill 2 (W) -->
                    <div class="skill-btn-wrapper">
                        <button id="btn-skill-w" class="moba-btn skill-w" title="Skill 2 (Hotkey: W / E)">
                            <span class="skill-shortcut-badge">W</span>
                            <span class="skill-icon-text">S2</span>
                            <div id="cd-overlay-w" class="cd-overlay"></div>
                            <span id="cd-text-w" class="cd-number"></span>
                        </button>
                        <span class="skill-btn-label">${this.hero.skills.w.name}</span>
                    </div>

                    <!-- Ultimate (R) -->
                    <div class="skill-btn-wrapper ult-wrapper">
                        <button id="btn-skill-r" class="moba-btn skill-r" title="Ultimate (Hotkey: R)">
                            <span class="skill-shortcut-badge">R</span>
                            <span class="skill-icon-text">ULT</span>
                            <div id="cd-overlay-r" class="cd-overlay"></div>
                            <span id="cd-text-r" class="cd-number"></span>
                        </button>
                        <span class="skill-btn-label">${this.hero.skills.r.name}</span>
                    </div>

                    <!-- Big Basic Attack (Space / J) -->
                    <div class="attack-btn-wrapper">
                        <button id="btn-attack" class="moba-btn btn-attack" title="Basic Attack (Hotkey: Space / J)">
                            <span class="attack-shortcut-badge">SPACE</span>
                            <span class="attack-icon">⚔️</span>
                        </button>
                    </div>
                </div>

                <!-- Center Banner Notifications (Respawn / Double Kill) -->
                <div id="arena-announcement" class="arena-announcement" style="opacity: 0;">
                    <span id="announcement-text">BATTLE ARENA READY</span>
                </div>
            </div>
        `;

        // Wire Back to Lobby
        const btnBack = this.container.querySelector('#btn-back-lobby');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                this.destroy();
                this.onBackToLobby();
            });
        }

        // Wire In-Game GLB Upload
        const uploader = this.container.querySelector('#arena-glb-uploader');
        if (uploader) {
            uploader.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                console.log(`[ArenaEngine] In-game GLB upload for ${this.hero.name}:`, file.name);
                registerLocalGlb(this.hero.id, file, 'hero');
                this.loadPlayerHero();
            });
        }
    }

    /**
     * Initializes Three.js Scene, Camera & Renderer
     */
    initThreeScene() {
        const canvas = this.container.querySelector('#arena-canvas');
        const viewport = this.container.querySelector('#arena-viewport');

        const width = viewport.clientWidth || window.innerWidth;
        const height = viewport.clientHeight || window.innerHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06080e);
        this.scene.fog = new THREE.FogExp2(0x06080e, 0.015);

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 100);
        this.camera.position.set(0, 7.5, 16);

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.35;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // PBR Studio Environment
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.05).texture;

        // Directional Sun / Arena Light
        this.sunLight = new THREE.DirectionalLight(0xfff5e6, 2.8);
        this.sunLight.position.set(14, 25, 14);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.set(2048, 2048);
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 60;
        const shadowD = 28;
        this.sunLight.shadow.camera.left = -shadowD;
        this.sunLight.shadow.camera.right = shadowD;
        this.sunLight.shadow.camera.top = shadowD;
        this.sunLight.shadow.camera.bottom = -shadowD;
        this.sunLight.shadow.bias = -0.0005;
        this.scene.add(this.sunLight);

        // Ambient Fill Light
        const ambient = new THREE.AmbientLight(0x2a3b5c, 1.2);
        this.scene.add(ambient);

        // Resize Listener
        window.addEventListener('resize', () => {
            if (!this.renderer || !viewport) return;
            const w = viewport.clientWidth || window.innerWidth;
            const h = viewport.clientHeight || window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        });
    }

    /**
     * Builds circular 28m arena with stone grid floor, central nexus & pillars
     */
    buildArenaEnvironment() {
        const arenaRadius = 28.0;

        // 1. Circular Arena Stone Floor with Concentric Rune Rings
        const floorGeo = new THREE.CircleGeometry(arenaRadius, 64);
        floorGeo.rotateX(-Math.PI / 2);

        // Procedural Grid Texture on Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111522';
        ctx.fillRect(0, 0, 1024, 1024);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        for (let i = 0; i <= 1024; i += 64) {
            ctx.beginPath();
            ctx.moveTo(i, 0); ctx.lineTo(i, 1024);
            ctx.moveTo(0, i); ctx.lineTo(1024, i);
            ctx.stroke();
        }

        const floorTexture = new THREE.CanvasTexture(canvas);
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(12, 12);

        const floorMat = new THREE.MeshStandardMaterial({
            map: floorTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 2. Glowing Outer Boundary Ring
        const boundRingGeo = new THREE.RingGeometry(arenaRadius - 0.4, arenaRadius, 64);
        boundRingGeo.rotateX(-Math.PI / 2);
        const boundRingMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75
        });
        const boundRing = new THREE.Mesh(boundRingGeo, boundRingMat);
        boundRing.position.y = 0.02;
        this.scene.add(boundRing);

        // 3. Central Nexus Crystal
        const crystalGeo = new THREE.OctahedronGeometry(1.6, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x0284c7,
            emissiveIntensity: 0.6
        });
        this.nexusCrystal = new THREE.Mesh(crystalGeo, crystalMat);
        this.nexusCrystal.position.set(0, 3.2, 0);
        this.nexusCrystal.castShadow = true;
        this.scene.add(this.nexusCrystal);

        // Nexus Pedestal
        const nPedGeo = new THREE.CylinderGeometry(2.2, 2.8, 1.2, 24);
        const nPedMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
        const nPed = new THREE.Mesh(nPedGeo, nPedMat);
        nPed.position.y = 0.6;
        nPed.receiveShadow = true;
        this.scene.add(nPed);

        // Nexus is also an obstacle
        this.obstacles.push({ x: 0, z: 0, radius: 2.8 });

        // 4. Four Symmetrical Obstacle Pillars with collision sliding
        const pillarPositions = [
            { x: 12, z: 12 },
            { x: -12, z: 12 },
            { x: 12, z: -12 },
            { x: -12, z: -12 }
        ];

        for (const pos of pillarPositions) {
            const pGeo = new THREE.CylinderGeometry(1.2, 1.4, 6.0, 16);
            const pMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
            const pillar = new THREE.Mesh(pGeo, pMat);
            pillar.position.set(pos.x, 3.0, pos.z);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            this.scene.add(pillar);

            // Pillar glowing ring cap
            const cGeo = new THREE.TorusGeometry(1.3, 0.12, 8, 24);
            cGeo.rotateX(Math.PI / 2);
            const cMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
            const cap = new THREE.Mesh(cGeo, cMat);
            cap.position.set(pos.x, 6.0, pos.z);
            this.scene.add(cap);

            this.obstacles.push({ x: pos.x, z: pos.z, radius: 1.5 });
        }
    }

    /**
     * Spawns 3 Enemy Training Dummies with overhead HP bars
     */
    spawnTrainingDummies() {
        const dummySpawnPoints = [
            { id: 1, name: 'Dummy Melee Alpha', x: 0, z: -10, color: 0xef4444 },
            { id: 2, name: 'Dummy Marksman Beta', x: -11, z: 2, color: 0xf97316 },
            { id: 3, name: 'Dummy Tank Omega', x: 11, z: 2, color: 0xa855f7 }
        ];

        for (const dp of dummySpawnPoints) {
            const group = new THREE.Group();
            group.position.set(dp.x, 0, dp.z);

            // Body Mesh (Stylized MOBA Golem)
            const bodyGeo = new THREE.CylinderGeometry(0.5, 0.4, 1.8, 16);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: dp.color,
                roughness: 0.4,
                metalness: 0.6
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.9;
            body.castShadow = true;
            body.receiveShadow = true;
            group.add(body);

            // Head Mesh
            const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 2.0;
            head.castShadow = true;
            group.add(head);

            // Glowing Core Eye
            const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(0, 2.0, 0.32);
            group.add(eye);

            // Overhead Floating 3D HP Bar Canvas Sprite
            const hpCanvas = document.createElement('canvas');
            hpCanvas.width = 256;
            hpCanvas.height = 64;
            const hpTex = new THREE.CanvasTexture(hpCanvas);
            const hpMat = new THREE.SpriteMaterial({ map: hpTex, depthTest: false });
            const hpSprite = new THREE.Sprite(hpMat);
            hpSprite.position.y = 2.65;
            hpSprite.scale.set(2.2, 0.55, 1);
            group.add(hpSprite);

            this.scene.add(group);

            const enemyData = {
                id: dp.id,
                name: dp.name,
                group,
                body,
                origColor: dp.color,
                spawnPos: new THREE.Vector3(dp.x, 0, dp.z),
                hp: 1800,
                maxHp: 1800,
                isAlive: true,
                respawnTimer: 0,
                hpCanvas,
                hpTex,
                hitFlashTimer: 0,
                knockbackVel: new THREE.Vector3()
            };

            this.updateDummyHpSprite(enemyData);
            this.enemies.push(enemyData);
        }
    }

    /**
     * Updates enemy overhead HP bar canvas
     * @param {Object} enemy 
     */
    updateDummyHpSprite(enemy) {
        const ctx = enemy.hpCanvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 64);

        // Background Track
        ctx.fillStyle = '#0f172a';
        ctx.roundRect(16, 20, 224, 24, 6);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.roundRect(16, 20, 224, 24, 6);
        ctx.stroke();

        // Health Fill
        const ratio = Math.max(0, enemy.hp / enemy.maxHp);
        let barColor = '#22c55e'; // Green
        if (ratio < 0.3) barColor = '#ef4444'; // Red
        else if (ratio < 0.6) barColor = '#f59e0b'; // Amber

        ctx.fillStyle = barColor;
        ctx.roundRect(18, 22, 220 * ratio, 20, 4);
        ctx.fill();

        // Enemy Name
        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${enemy.name} (${Math.ceil(enemy.hp)})`, 128, 14);

        enemy.hpTex.needsUpdate = true;
    }

    /**
     * Loads Player Hero 3D GLB Model and attaches weapon
     */
    async loadPlayerHero() {
        const { heroGlbUrl, weaponGlbUrl } = getHeroModelUrls(this.hero.id);

        if (this.player.mesh) {
            this.scene.remove(this.player.mesh);
            this.player.mesh = null;
        }

        if (heroGlbUrl) {
            try {
                const gltf = await this.gltfLoader.loadAsync(heroGlbUrl);
                const model = gltf.scene;

                // Height Normalization (1.85m)
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const scale = size.y > 0 ? (1.85 / size.y) : 1.0;
                model.scale.set(scale, scale, scale);

                // Align feet to Y = 0
                box.setFromObject(model);
                model.position.copy(this.player.pos);
                model.position.y = 0;

                // SkinnedMesh shadows & frustum settings
                model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.frustumCulled = false;
                        if (child.material) {
                            child.material.roughness = THREE.MathUtils.clamp(child.material.roughness || 0.5, 0.25, 0.85);
                        }
                    }
                });

                // AnimationMixer Setup
                if (gltf.animations && gltf.animations.length > 0) {
                    this.player.mixer = new THREE.AnimationMixer(model);
                    this.bindAnimations(gltf.animations);
                }

                // Attach Weapon
                if (weaponGlbUrl) {
                    this.loadAndAttachWeapon(model, weaponGlbUrl);
                }

                this.player.mesh = model;
                this.scene.add(model);

                // Attach Passive VFX Aura
                this.vfx.attachPassiveAura(model, this.hero.team);

                console.log(`[ArenaEngine] Player Hero 3D Loaded: ${this.hero.name}`);
            } catch (err) {
                console.warn(`[ArenaEngine] Error loading hero GLB, fallback mannequin:`, err);
                this.buildPlayerMannequin();
            }
        } else {
            this.buildPlayerMannequin();
        }
    }

    /**
     * Builds fallback stylized mannequin if hero has no GLB
     */
    buildPlayerMannequin() {
        const group = new THREE.Group();
        group.position.copy(this.player.pos);

        let colorHex = 0x38bdf8;
        if (this.hero.team === 'team_love') colorHex = 0xec4899;
        if (this.hero.team === 'team_passion') colorHex = 0xf59e0b;

        const mat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.3,
            metalness: 0.7
        });

        // Torso
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 1.0, 16), mat);
        torso.position.y = 1.1;
        torso.castShadow = true;
        group.add(torso);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), mat);
        head.position.y = 1.75;
        head.castShadow = true;
        group.add(head);

        this.player.mesh = group;
        this.scene.add(group);

        this.vfx.attachPassiveAura(group, this.hero.team);
    }

    /**
     * Loads Weapon GLB and mounts to right hand bone
     */
    async loadAndAttachWeapon(characterModel, weaponUrl) {
        try {
            const wGltf = await this.gltfLoader.loadAsync(weaponUrl);
            const wModel = wGltf.scene;

            const wBox = new THREE.Box3().setFromObject(wModel);
            const wSize = new THREE.Vector3();
            wBox.getSize(wSize);
            const maxDim = Math.max(wSize.x, wSize.y, wSize.z);
            const wScale = maxDim > 0 ? (0.85 / maxDim) : 1.0;
            wModel.scale.set(wScale, wScale, wScale);

            let handBone = null;
            const boneKeywords = ['weapon_socket.r', 'hand.r', 'righthand', 'mixamorigrighthand', 'hand_r'];
            characterModel.traverse(o => {
                if (o.isBone && !handBone) {
                    const bName = o.name.toLowerCase();
                    if (boneKeywords.some(kw => bName.includes(kw))) {
                        handBone = o;
                    }
                }
            });

            if (handBone) {
                handBone.add(wModel);
            } else {
                wModel.position.set(0.65, 1.25, 0.2);
                characterModel.add(wModel);
            }

            this.player.weaponMesh = wModel;
        } catch (e) {
            console.warn('[ArenaEngine] Weapon attachment error:', e);
        }
    }

    /**
     * Maps animations by keyword to state actions
     */
    bindAnimations(animations) {
        for (const clip of animations) {
            const name = clip.name.toLowerCase();
            const action = this.player.mixer.clipAction(clip);

            if (name.includes('idle')) this.player.actions.idle = action;
            else if (name.includes('run') || name.includes('walk')) this.player.actions.run = action;
            else if (name.includes('attack') || name.includes('hit')) this.player.actions.attack = action;
            else if (name.includes('skill') || name.includes('cast')) this.player.actions.skill = action;
        }

        // Play idle by default
        if (this.player.actions.idle) {
            this.player.currentAction = this.player.actions.idle;
            this.player.currentAction.play();
        }
    }

    /**
     * Switches animation action with 0.2s crossfade
     */
    playAction(name) {
        if (!this.player.actions || !this.player.actions[name]) return;
        const next = this.player.actions[name];
        if (this.player.currentAction !== next) {
            if (this.player.currentAction) {
                this.player.currentAction.fadeOut(0.2);
            }
            next.reset().fadeIn(0.2).play();
            this.player.currentAction = next;
        }
    }

    /**
     * Initializes ControlsManager
     */
    initControls() {
        this.controls = new ControlsManager({
            domElement: this.container.querySelector('#arena-viewport'),
            camera: this.camera,
            scene: this.scene,
            onMove: (dir, intensity, delta) => this.handlePlayerMovement(dir, intensity, delta),
            onBasicAttack: () => this.handleBasicAttack(),
            onSkillCast: (slot, dir, pos) => this.handleSkillCast(slot, dir, pos)
        });
    }

    /**
     * Handles Player Movement and Obstacle Collision Sliding
     */
    handlePlayerMovement(moveDir, intensity, delta) {
        if (!this.player.mesh || intensity <= 0.001) {
            if (this.player.actions.idle) this.playAction('idle');
            return;
        }

        if (this.player.actions.run) this.playAction('run');

        const speed = this.player.moveSpeed * intensity;
        const nextX = this.player.pos.x + moveDir.x * speed * delta;
        const nextZ = this.player.pos.z + moveDir.z * speed * delta;

        // 1. Boundary Collision Check (Arena circle radius 27.5m)
        const arenaMaxR = 27.5;
        const nextDist = Math.hypot(nextX, nextZ);
        if (nextDist > arenaMaxR) {
            // Push back inside boundary
            const angle = Math.atan2(nextZ, nextX);
            this.player.pos.x = Math.cos(angle) * arenaMaxR;
            this.player.pos.z = Math.sin(angle) * arenaMaxR;
        } else {
            this.player.pos.x = nextX;
            this.player.pos.z = nextZ;
        }

        // 2. Obstacle Sliding Collision
        for (const obs of this.obstacles) {
            const dx = this.player.pos.x - obs.x;
            const dz = this.player.pos.z - obs.z;
            const dist = Math.hypot(dx, dz);
            const minDist = obs.radius + 0.6; // player radius

            if (dist < minDist) {
                // Slide out of obstacle
                const angle = Math.atan2(dz, dx);
                this.player.pos.x = obs.x + Math.cos(angle) * minDist;
                this.player.pos.z = obs.z + Math.sin(angle) * minDist;
            }
        }

        // Apply updated position
        this.player.mesh.position.x = this.player.pos.x;
        this.player.mesh.position.z = this.player.pos.z;

        // Smooth character rotation towards movement direction
        const targetRotY = Math.atan2(moveDir.x, moveDir.z);
        this.player.mesh.rotation.y = THREE.MathUtils.lerp(this.player.mesh.rotation.y, targetRotY, 0.2);
    }

    /**
     * Handles Basic Attack Combo & Enemy Hit Detection
     */
    handleBasicAttack() {
        const now = performance.now();
        if (now - this.player.lastAttackTime < 280) return; // Attack speed limiter
        this.player.lastAttackTime = now;

        this.player.comboStep = (this.player.comboStep + 1) % 3;

        // Procedural attack lunge if no clip
        if (this.player.actions.attack) {
            this.player.actions.attack.reset().play();
        } else if (this.player.mesh) {
            const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.mesh.rotation.y);
            this.player.mesh.position.addScaledVector(forward, 0.35);
        }

        // Attack Cone Detection in Front of Player (2.8m range)
        const playerForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.mesh.rotation.y);
        const attackRange = 2.8;

        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const toEnemy = new THREE.Vector3().subVectors(enemy.group.position, this.player.pos);
            const dist = toEnemy.length();

            if (dist <= attackRange) {
                toEnemy.normalize();
                const dot = playerForward.dot(toEnemy);

                if (dot > 0.4) { // within ~70 degree frontal cone
                    const isCrit = Math.random() < 0.28;
                    const dmg = isCrit ? Math.floor(320 + Math.random() * 80) : Math.floor(160 + Math.random() * 40);

                    this.damageEnemy(enemy, dmg, isCrit, toEnemy.multiplyScalar(3.2));
                    this.vfx.spawnBurst(enemy.group.position, 0xffffff, 16);
                }
            }
        }
    }

    /**
     * Handles Skill 1, 2, and Ultimate Casts
     */
    handleSkillCast(slot, dir, pos) {
        if (slot === 'q') {
            // SKILL 1: Projectile Blast in aimed direction
            this.showAnnouncement(`${this.hero.name.toUpperCase()}: ${this.hero.skills.q.name.toUpperCase()}!`);

            const targetPos = this.player.pos.clone().addScaledVector(dir, 16.0);
            this.vfx.spawnProjectile(this.player.pos, targetPos, this.hero.team, (hitPos) => {
                // Splash damage on projectile explosion
                for (const enemy of this.enemies) {
                    if (!enemy.isAlive) continue;
                    if (enemy.group.position.distanceTo(hitPos) < 3.2) {
                        const dmg = Math.floor(480 + Math.random() * 90);
                        this.damageEnemy(enemy, dmg, true, dir.clone().multiplyScalar(4.5));
                    }
                }
            });

        } else if (slot === 'w') {
            // SKILL 2: Dash Forward + Protective Shield Dome + Heal
            this.showAnnouncement(`${this.hero.name.toUpperCase()}: ${this.hero.skills.w.name.toUpperCase()}!`);

            // Dash hero forward
            const dashDist = 5.5;
            this.player.pos.addScaledVector(dir, dashDist);
            if (this.player.mesh) {
                this.player.mesh.position.copy(this.player.pos);
            }

            // Spawn Shield Dome
            if (this.player.mesh) {
                this.vfx.spawnShieldDome(this.player.mesh, this.hero.team, 3.5);
            }

            // Heal Player
            const healAmt = 450;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
            this.vfx.spawnFloatingText(`+${healAmt}`, this.player.pos, 'heal');
            this.updatePlayerHpBar();

        } else if (slot === 'r') {
            // ULTIMATE: Giant Celestial Beam & Magic Circle
            this.showAnnouncement(`⚡ ULTIMATE: ${this.hero.skills.r.name.toUpperCase()}! ⚡`);

            const aoeTarget = pos.lengthSq() > 0.1 ? pos : this.player.pos.clone().addScaledVector(dir, 8.0);

            this.vfx.spawnUltimateAoE(aoeTarget, this.hero.team, (impactPos) => {
                // Giant AoE Damage to all enemies in 6m radius
                for (const enemy of this.enemies) {
                    if (!enemy.isAlive) continue;
                    const dist = enemy.group.position.distanceTo(impactPos);
                    if (dist < 6.0) {
                        const dmg = Math.floor(950 + Math.random() * 250);
                        const knockDir = new THREE.Vector3().subVectors(enemy.group.position, impactPos).normalize();
                        this.damageEnemy(enemy, dmg, true, knockDir.multiplyScalar(7.5));
                    }
                }
            });
        }
    }

    /**
     * Applies damage, floating combat text, hit-flash and knockback to an enemy dummy
     */
    damageEnemy(enemy, damage, isCrit = false, knockbackVel = null) {
        if (!enemy.isAlive) return;

        enemy.hp = Math.max(0, enemy.hp - damage);
        this.updateDummyHpSprite(enemy);

        // Spawn Floating Text
        this.vfx.spawnFloatingText(
            isCrit ? `-${damage} CRIT!` : `-${damage}`,
            enemy.group.position,
            isCrit ? 'crit' : 'damage'
        );

        // Hit Flash White
        enemy.body.material.color.setHex(0xffffff);
        enemy.hitFlashTimer = 0.12;

        // Apply Knockback
        if (knockbackVel) {
            enemy.knockbackVel.copy(knockbackVel);
        }

        // Check for Death
        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }
    }

    /**
     * Handles enemy defeat and 4s auto-respawn timer
     */
    killEnemy(enemy) {
        enemy.isAlive = false;
        enemy.respawnTimer = 4.0;
        enemy.group.visible = false;

        this.killCount++;
        const scoreEl = this.container.querySelector('#hud-score-count');
        if (scoreEl) scoreEl.textContent = this.killCount;

        this.showAnnouncement(`💀 ${enemy.name.toUpperCase()} DESTROYED! (Respawn in 4s)`);
    }

    /**
     * Respawns an enemy dummy
     */
    respawnEnemy(enemy) {
        enemy.isAlive = true;
        enemy.hp = enemy.maxHp;
        enemy.group.position.copy(enemy.spawnPos);
        enemy.group.visible = true;
        enemy.body.material.color.setHex(enemy.origColor);
        this.updateDummyHpSprite(enemy);

        this.vfx.spawnBurst(enemy.spawnPos, 0x10b981, 35);
        this.showAnnouncement(`✨ ${enemy.name.toUpperCase()} RESPAWNED!`);
    }

    /**
     * Updates Player HP Bar in HUD
     */
    updatePlayerHpBar() {
        const bar = this.container.querySelector('#player-hp-bar');
        const text = this.container.querySelector('#player-hp-text');

        if (bar) {
            const pct = (this.player.hp / this.player.maxHp) * 100;
            bar.style.width = `${pct}%`;
        }
        if (text) {
            text.textContent = `${Math.floor(this.player.hp)} / ${this.player.maxHp}`;
        }
    }

    /**
     * Displays a notification announcement banner in the center
     */
    showAnnouncement(msg) {
        const banner = this.container.querySelector('#arena-announcement');
        const txt = this.container.querySelector('#announcement-text');
        if (!banner || !txt) return;

        txt.textContent = msg;
        banner.style.opacity = '1';
        banner.style.transform = 'translate(-50%, -50%) scale(1.08)';

        clearTimeout(this.announcementTimeout);
        this.announcementTimeout = setTimeout(() => {
            banner.style.opacity = '0';
            banner.style.transform = 'translate(-50%, -50%) scale(0.95)';
        }, 1800);
    }

    /**
     * Main Gameplay Render & Update Loop
     */
    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // 1. Rotate Central Nexus Crystal
        if (this.nexusCrystal) {
            this.nexusCrystal.rotation.y += delta * 0.8;
            this.nexusCrystal.position.y = 3.2 + Math.sin(time * 2.0) * 0.25;
        }

        // 2. Update Controls & Follow Camera
        if (this.controls) {
            this.controls.update(delta, this.player.pos);
        }

        // 3. Update AnimationMixer or Procedural Breathing
        if (this.player.mixer) {
            this.player.mixer.update(delta);
        } else if (this.player.mesh) {
            this.player.proceduralTimer += delta * 3.0;
            // Gentle procedural idle breathing
            this.player.mesh.position.y = Math.sin(this.player.proceduralTimer) * 0.04;
        }

        // 4. Update Enemy Dummies (Hit Flash, Knockback, Respawn)
        for (const enemy of this.enemies) {
            // Hit flash timer decay
            if (enemy.hitFlashTimer > 0) {
                enemy.hitFlashTimer -= delta;
                if (enemy.hitFlashTimer <= 0) {
                    enemy.body.material.color.setHex(enemy.origColor);
                }
            }

            // Knockback physics decay
            if (enemy.knockbackVel.lengthSq() > 0.01) {
                enemy.group.position.addScaledVector(enemy.knockbackVel, delta);
                enemy.knockbackVel.multiplyScalar(0.88); // friction
            }

            // Respawn countdown
            if (!enemy.isAlive) {
                enemy.respawnTimer -= delta;
                if (enemy.respawnTimer <= 0) {
                    this.respawnEnemy(enemy);
                }
            }
        }

        // 5. Update VFX System
        if (this.vfx) {
            this.vfx.update(delta);
        }

        // 6. Render 3D Frame
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Cleans up all WebGL context and DOM resources
     */
    destroy() {
        this.isRunning = false;
        if (this.vfx) this.vfx.clearAll();
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
        }
    }
}
