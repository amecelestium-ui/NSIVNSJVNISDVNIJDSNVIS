/**
 * ONYXPURE — JKT48 3D Arena
 * js/heroSelect.js
 * 
 * 3D Lobby & Hero Selection Interface:
 * - 3D Turntable Stage with Neon Pedestal, PBR Lighting & Orbit Controls
 * - Dynamic Team Theming (Dream Cyan, Love Magenta, Passion Amber)
 * - Roster Filter Tabs, Search Bar & "3D Ready" Toggle
 * - Stylized 3D Hologram Fallback for heroes without an uploaded GLB
 * - Auto-mounting of 3D Weapon to hand bone
 * - Detailed Hero Lore, Weapon & 4-Skill Cards Inspector
 * - Instant Local GLB File Upload Handler
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { getAllHeroes, getHeroById } from './rosterData.js';
import { getHeroModelUrls, hasGlb, registerLocalGlb } from './githubScanner.js';

export class HeroSelectManager {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container
     * @param {Function} options.onEnterArena
     */
    constructor({ container, onEnterArena }) {
        this.container = container;
        this.onEnterArena = onEnterArena || (() => {});

        this.selectedHero = null;
        this.currentTeamFilter = 'all';
        this.onlyReadyFilter = false;
        this.searchQuery = '';

        // 3D Lobby Stage Components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.turntablePedestal = null;
        this.currentHeroModel = null;
        this.currentWeaponModel = null;
        this.hologramGroup = null;

        // Turntable Orbit Drag State
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.targetRotationY = 0;
        this.currentRotationY = 0;
        this.camDistance = 3.6;

        // Setup loaders
        this.initLoaders();

        // Build DOM & 3D Stage
        this.initDOM();
        this.initThreeStage();

        // Select default hero (Freya or first available)
        this.selectInitialHero();

        // Start render loop
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    /**
     * Initializes GLTFLoader with DRACO decompression
     */
    initLoaders() {
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://unpkg.com/three@0.170.0/examples/jsm/libs/draco/gltf/');

        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    /**
     * Initializes HTML layout for the Hero Selection Screen
     */
    initDOM() {
        this.container.innerHTML = `
            <div id="lobby-wrapper" class="lobby-screen">
                <!-- Top Header Bar -->
                <header class="lobby-header">
                    <div class="lobby-brand">
                        <span class="brand-sub">3D HERO ARENA</span>
                        <h1 class="brand-title">ONYXPURE</h1>
                    </div>
                    <div class="lobby-repo-status">
                        <span id="repo-badge" class="repo-badge">● GitHub Repo Connected</span>
                        <label class="btn-upload-label" title="Upload file .glb lokal untuk ditest">
                            📂 Upload .GLB Lokal
                            <input type="file" id="lobby-glb-uploader" accept=".glb,.gltf" style="display:none;">
                        </label>
                    </div>
                </header>

                <!-- 3-Column Layout: Left (Roster), Center (3D Stage), Right (Inspector) -->
                <div class="lobby-content">
                    <!-- Left: Hero Roster Selection -->
                    <aside class="panel-roster">
                        <div class="roster-filters">
                            <div class="team-tabs">
                                <button class="tab-btn active" data-team="all">SEMUA (42)</button>
                                <button class="tab-btn" data-team="team_dream">DREAM</button>
                                <button class="tab-btn" data-team="team_love">LOVE</button>
                                <button class="tab-btn" data-team="team_passion">PASSION</button>
                            </div>
                            <div class="search-filter-row">
                                <input type="text" id="roster-search" placeholder="Cari Hero atau Role..." class="search-input">
                                <label class="ready-toggle-label">
                                    <input type="checkbox" id="ready-toggle">
                                    <span>Hanya 3D Ready</span>
                                </label>
                            </div>
                        </div>
                        <div class="roster-list" id="roster-list-container">
                            <!-- Hero Cards Injected via JS -->
                        </div>
                    </aside>

                    <!-- Center: 3D Turntable Canvas -->
                    <main class="panel-stage" id="stage-panel">
                        <canvas id="stage-canvas"></canvas>
                        
                        <!-- 3D Stage Info Overlay -->
                        <div class="stage-overlay-top">
                            <div class="hero-stage-badge" id="stage-team-badge">TEAM DREAM</div>
                            <h2 class="hero-stage-name" id="stage-hero-name">FREYA</h2>
                            <p class="hero-stage-title" id="stage-hero-title">Caramel Cholerics • Fighter / EXP Lane</p>
                        </div>

                        <!-- Fallback Hologram Alert Message -->
                        <div id="stage-hologram-msg" class="stage-hologram-msg" style="display:none;">
                            <div class="hologram-icon">🔮</div>
                            <div class="hologram-text">
                                <strong>Mode Preview Hologram 3D</strong>
                                <span>File <code>.glb</code> belum ada di GitHub. Anda dapat mengupload file <code>.glb</code> melalui tombol di atas!</span>
                            </div>
                        </div>

                        <div class="stage-tip">
                            <span>↔ Drag untuk memutar 360° | Scroll untuk Zoom</span>
                        </div>
                    </main>

                    <!-- Right: Inspector (Lore, Weapon, Skills & Enter Arena Button) -->
                    <aside class="panel-inspector">
                        <div class="inspector-scroll">
                            <!-- Hero Overview -->
                            <div class="inspector-section">
                                <div class="section-tag">OVERVIEW & WEAPON</div>
                                <div class="weapon-info-card">
                                    <div class="weapon-icon">⚔️</div>
                                    <div class="weapon-details">
                                        <div class="weapon-title" id="insp-weapon-name">Valkyrie Twin Skyblades</div>
                                        <div class="weapon-desc" id="insp-weapon-desc">Dual enchanted blades infused with wind turbulence.</div>
                                    </div>
                                </div>
                                <p class="hero-lore-text" id="insp-hero-lore">
                                    Pemimpin gagah berani yang memandu Team Dream dengan tekad baja.
                                </p>
                            </div>

                            <!-- Skills Grid -->
                            <div class="inspector-section">
                                <div class="section-tag">SKILL ABILITIES</div>
                                <div class="skills-grid">
                                    <!-- Passive -->
                                    <div class="skill-card">
                                        <div class="skill-card-header">
                                            <span class="skill-type-pill passive">PASSIVE</span>
                                            <span class="skill-title" id="insp-passive-name">Caramel Cholerics</span>
                                        </div>
                                        <p class="skill-card-desc" id="insp-passive-desc">Meningkatkan attack speed dan shield setiap serangan dasar beruntun.</p>
                                    </div>

                                    <!-- Skill 1 (Q) -->
                                    <div class="skill-card">
                                        <div class="skill-card-header">
                                            <span class="skill-type-pill s1">SKILL 1 (Q)</span>
                                            <span class="skill-title" id="insp-s1-name">Skyfall Strike</span>
                                        </div>
                                        <p class="skill-card-desc" id="insp-s1-desc">Melompat ke depan menghantam tanah memberi efek airborne dan slow.</p>
                                    </div>

                                    <!-- Skill 2 (W) -->
                                    <div class="skill-card">
                                        <div class="skill-card-header">
                                            <span class="skill-type-pill s2">SKILL 2 (W)</span>
                                            <span class="skill-title" id="insp-s2-name">Vortex Guard</span>
                                        </div>
                                        <p class="skill-card-desc" id="insp-s2-desc">Membuat pelindung angin berputar yang menangkis proyektil lawan.</p>
                                    </div>

                                    <!-- Ultimate (R) -->
                                    <div class="skill-card ult-highlight">
                                        <div class="skill-card-header">
                                            <span class="skill-type-pill ult">ULTIMATE (R)</span>
                                            <span class="skill-title" id="insp-ult-name">Captain's Valkyrie Ascendance</span>
                                        </div>
                                        <p class="skill-card-desc" id="insp-ult-desc">Membangkitkan wujud sayap Valkyrie penuh dengan ledakan meteor celestial.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Enter Arena CTA Button -->
                        <div class="inspector-action-footer">
                            <button id="btn-enter-arena" class="btn-enter-arena">
                                <span class="btn-sparkle">⚔️</span>
                                <span class="btn-text">MASUK ARENA</span>
                            </button>
                        </div>
                    </aside>
                </div>
            </div>
        `;

        this.bindDOMEvents();
    }

    /**
     * Wires DOM interactions (tabs, search, upload, enter arena)
     */
    bindDOMEvents() {
        // Tab buttons
        const tabs = this.container.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTeamFilter = tab.dataset.team;
                this.renderRosterList();
            });
        });

        // Search Input
        const searchInput = this.container.querySelector('#roster-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderRosterList();
            });
        }

        // Ready Toggle
        const readyToggle = this.container.querySelector('#ready-toggle');
        if (readyToggle) {
            readyToggle.addEventListener('change', (e) => {
                this.onlyReadyFilter = e.target.checked;
                this.renderRosterList();
            });
        }

        // Local GLB Upload
        const uploader = this.container.querySelector('#lobby-glb-uploader');
        if (uploader) {
            uploader.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file || !this.selectedHero) return;

                console.log(`[HeroSelect] Uploaded local GLB for ${this.selectedHero.name}:`, file.name);
                registerLocalGlb(this.selectedHero.id, file, 'hero');

                // Reload 3D model immediately
                this.loadHeroModel(this.selectedHero);
                this.renderRosterList();
            });
        }

        // Enter Arena CTA
        const btnEnter = this.container.querySelector('#btn-enter-arena');
        if (btnEnter) {
            btnEnter.addEventListener('click', () => {
                if (this.selectedHero) {
                    this.onEnterArena(this.selectedHero);
                }
            });
        }
    }

    /**
     * Initializes the Three.js 3D Turntable Stage
     */
    initThreeStage() {
        const stagePanel = this.container.querySelector('#stage-panel');
        const canvas = this.container.querySelector('#stage-canvas');

        const width = stagePanel.clientWidth || 600;
        const height = stagePanel.clientHeight || 700;

        // Scene & Tone Mapping
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x08090d); // Dark obsidian

        // Camera
        this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
        this.camera.position.set(0, 1.45, this.camDistance);

        // Renderer with PBR & ACES Filmic
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.35;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Environment Map (Soft Studio Lighting)
        try {
            const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        } catch (e) {
            console.warn('[HeroSelect] RoomEnvironment fallback to ambient lighting:', e);
        }

        // Directional Key Light
        this.keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
        this.keyLight.position.set(3, 6, 5);
        this.keyLight.castShadow = true;
        this.keyLight.shadow.mapSize.set(1024, 1024);
        this.scene.add(this.keyLight);

        // Team Colored Rim Light
        this.rimLight = new THREE.DirectionalLight(0x38bdf8, 3.2);
        this.rimLight.position.set(-4, 3, -4);
        this.scene.add(this.rimLight);

        // Fill Ambient
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // Build Turntable Pedestal
        this.buildPedestal();

        // Mouse & Touch Controls on Canvas
        this.initTurntableControls(canvas);

        // Window resize handler
        window.addEventListener('resize', () => {
            if (!this.renderer || !stagePanel) return;
            const w = stagePanel.clientWidth;
            const h = stagePanel.clientHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        });
    }

    /**
     * Builds the futuristic circular neon pedestal
     */
    buildPedestal() {
        this.pedestalGroup = new THREE.Group();

        // Cylindrical Base
        const baseGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.25, 36);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x11131a,
            roughness: 0.35,
            metalness: 0.8
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = -0.125;
        base.receiveShadow = true;
        this.pedestalGroup.add(base);

        // Glowing Neon Accent Ring
        const ringGeo = new THREE.RingGeometry(1.35, 1.45, 48);
        ringGeo.rotateX(-Math.PI / 2);
        this.neonRingMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide
        });
        const neonRing = new THREE.Mesh(ringGeo, this.neonRingMat);
        neonRing.position.y = 0.005;
        this.pedestalGroup.add(neonRing);

        this.scene.add(this.pedestalGroup);
    }

    /**
     * Drag & zoom controls for 360 preview
     */
    initTurntableControls(canvas) {
        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.lastX;
            this.lastX = e.clientX;
            this.targetRotationY += dx * 0.009;
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Touch drag
        canvas.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            this.lastX = e.touches[0].clientX;
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!this.isDragging || !e.touches[0]) return;
            const dx = e.touches[0].clientX - this.lastX;
            this.lastX = e.touches[0].clientX;
            this.targetRotationY += dx * 0.009;
        }, { passive: true });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
        });

        // Mouse wheel zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.camDistance = THREE.MathUtils.clamp(
                this.camDistance + e.deltaY * 0.003,
                2.2,
                5.0
            );
            this.camera.position.z = this.camDistance;
        }, { passive: false });
    }

    /**
     * Selects initial hero
     */
    selectInitialHero() {
        const all = getAllHeroes();
        // Prefer Freya or first with GLB
        const readyHero = all.find(h => hasGlb(h.id));
        const initial = readyHero || all.find(h => h.id === 'freya') || all[0];
        this.selectHero(initial);
        this.renderRosterList();
    }

    /**
     * Renders the left-hand hero cards roster
     */
    renderRosterList() {
        const container = this.container.querySelector('#roster-list-container');
        if (!container) return;

        let heroes = getAllHeroes();

        // 1. Filter by Team
        if (this.currentTeamFilter !== 'all') {
            heroes = heroes.filter(h => h.team === this.currentTeamFilter);
        }

        // 2. Filter by Search Query
        if (this.searchQuery) {
            heroes = heroes.filter(h =>
                h.name.toLowerCase().includes(this.searchQuery) ||
                h.role.toLowerCase().includes(this.searchQuery) ||
                h.lane.toLowerCase().includes(this.searchQuery)
            );
        }

        // 3. Filter by 3D Ready
        if (this.onlyReadyFilter) {
            heroes = heroes.filter(h => hasGlb(h.id));
        }

        // Sort: 3D Ready heroes first
        heroes.sort((a, b) => {
            const aReady = hasGlb(a.id) ? 1 : 0;
            const bReady = hasGlb(b.id) ? 1 : 0;
            return bReady - aReady;
        });

        container.innerHTML = heroes.map(hero => {
            const isReady = hasGlb(hero.id);
            const isSelected = this.selectedHero && this.selectedHero.id === hero.id;
            const teamBadgeClass = hero.team.replace('_', '-');

            return `
                <div class="hero-card ${teamBadgeClass} ${isSelected ? 'selected' : ''}" data-hero-id="${hero.id}">
                    <div class="card-avatar">
                        <span class="avatar-initial">${hero.name.charAt(0)}</span>
                        ${isReady ? '<span class="badge-ready">3D READY</span>' : ''}
                    </div>
                    <div class="card-info">
                        <div class="card-name-row">
                            <span class="card-name">${hero.name}</span>
                        </div>
                        <div class="card-meta">
                            <span class="card-role">${hero.role}</span>
                            <span class="card-lane">${hero.lane}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Wire click events
        container.querySelectorAll('.hero-card').forEach(card => {
            card.addEventListener('click', () => {
                const heroId = card.dataset.heroId;
                const hero = getHeroById(heroId);
                if (hero) {
                    this.selectHero(hero);
                    this.renderRosterList();
                }
            });
        });
    }

    /**
     * Selects a hero and updates 3D preview, theme colors & inspector
     * @param {Object} hero 
     */
    selectHero(hero) {
        this.selectedHero = hero;

        // 1. Update Dynamic Team Theme
        this.applyTheme(hero.team);

        // 2. Update Overlay & Inspector text
        this.updateInspectorUI(hero);

        // 3. Load 3D Model onto Turntable
        this.loadHeroModel(hero);
    }

    /**
     * Applies team color theme to lights & CSS variables
     * @param {string} team 
     */
    applyTheme(team) {
        let colorHex = 0x38bdf8;
        let cssColor = '#38bdf8';

        if (team === 'team_love') {
            colorHex = 0xec4899;
            cssColor = '#ec4899';
        } else if (team === 'team_passion') {
            colorHex = 0xf59e0b;
            cssColor = '#f59e0b';
        }

        if (this.rimLight) this.rimLight.color.setHex(colorHex);
        if (this.neonRingMat) this.neonRingMat.color.setHex(colorHex);

        document.documentElement.style.setProperty('--team-theme-color', cssColor);
    }

    /**
     * Updates Right-Panel Inspector with hero stats & skill cards
     * @param {Object} hero 
     */
    updateInspectorUI(hero) {
        const teamFormatted = hero.team.replace('_', ' ').toUpperCase();

        // Stage Overlay
        const stageBadge = this.container.querySelector('#stage-team-badge');
        const stageName = this.container.querySelector('#stage-hero-name');
        const stageTitle = this.container.querySelector('#stage-hero-title');

        if (stageBadge) stageBadge.textContent = teamFormatted;
        if (stageName) stageName.textContent = hero.name.toUpperCase();
        if (stageTitle) stageTitle.textContent = `${hero.passive.name} • ${hero.role} / ${hero.lane}`;

        // Inspector Overview
        const elWeapName = this.container.querySelector('#insp-weapon-name');
        const elWeapDesc = this.container.querySelector('#insp-weapon-desc');
        const elLore = this.container.querySelector('#insp-hero-lore');

        if (elWeapName) elWeapName.textContent = hero.weapon.name;
        if (elWeapDesc) elWeapDesc.textContent = hero.weapon.description;
        if (elLore) elLore.textContent = hero.lore;

        // Skills
        const elPassName = this.container.querySelector('#insp-passive-name');
        const elPassDesc = this.container.querySelector('#insp-passive-desc');
        const elS1Name = this.container.querySelector('#insp-s1-name');
        const elS1Desc = this.container.querySelector('#insp-s1-desc');
        const elS2Name = this.container.querySelector('#insp-s2-name');
        const elS2Desc = this.container.querySelector('#insp-s2-desc');
        const elUltName = this.container.querySelector('#insp-ult-name');
        const elUltDesc = this.container.querySelector('#insp-ult-desc');

        if (elPassName) elPassName.textContent = hero.passive.name;
        if (elPassDesc) elPassDesc.textContent = hero.passive.description;

        if (elS1Name) elS1Name.textContent = hero.skills.q.name;
        if (elS1Desc) elS1Desc.textContent = `${hero.skills.q.description} (CD: ${hero.skills.q.cooldown}s)`;

        if (elS2Name) elS2Name.textContent = hero.skills.w.name;
        if (elS2Desc) elS2Desc.textContent = `${hero.skills.w.description} (CD: ${hero.skills.w.cooldown}s)`;

        if (elUltName) elUltName.textContent = hero.skills.r.name;
        if (elUltDesc) elUltDesc.textContent = `${hero.skills.r.description} (CD: ${hero.skills.r.cooldown}s)`;
    }

    /**
     * Loads the 3D GLB model for the hero or shows stylized Hologram fallback
     * @param {Object} hero 
     */
    async loadHeroModel(hero) {
        // Clear previous models
        if (this.currentHeroModel) {
            this.scene.remove(this.currentHeroModel);
            this.currentHeroModel = null;
        }
        if (this.currentWeaponModel) {
            this.scene.remove(this.currentWeaponModel);
            this.currentWeaponModel = null;
        }
        if (this.hologramGroup) {
            this.scene.remove(this.hologramGroup);
            this.hologramGroup = null;
        }

        const hologramMsg = this.container.querySelector('#stage-hologram-msg');
        const { heroGlbUrl, weaponGlbUrl } = getHeroModelUrls(hero.id);

        if (heroGlbUrl) {
            if (hologramMsg) hologramMsg.style.display = 'none';

            try {
                const gltf = await this.gltfLoader.loadAsync(heroGlbUrl);
                const model = gltf.scene;

                // Scale normalization to 1.85m height
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);

                const targetHeight = 1.85;
                const scale = size.y > 0 ? (targetHeight / size.y) : 1.0;
                model.scale.set(scale, scale, scale);

                // Place feet directly at Y = 0 on top of the pedestal
                box.setFromObject(model);
                model.position.y = -box.min.y;

                // Ensure SkinnedMeshes cast shadows and remain visible
                model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.frustumCulled = false;
                        if (child.material) {
                            child.material.roughness = THREE.MathUtils.clamp(child.material.roughness || 0.5, 0.2, 0.9);
                        }
                    }
                });

                this.currentHeroModel = model;
                this.scene.add(model);

                // If weapon GLB is available, auto-attach to right hand
                if (weaponGlbUrl) {
                    this.loadAndAttachWeapon(model, weaponGlbUrl);
                }

                console.log(`[HeroSelect] Loaded 3D GLB for ${hero.name}: ${heroGlbUrl}`);
            } catch (err) {
                console.warn(`[HeroSelect] Failed to load GLB for ${hero.name}, rendering hologram fallback:`, err);
                this.buildHologramFallback(hero);
                if (hologramMsg) hologramMsg.style.display = 'flex';
            }
        } else {
            // No GLB available -> Render Stylized 3D Hologram Fallback
            this.buildHologramFallback(hero);
            if (hologramMsg) hologramMsg.style.display = 'flex';
        }
    }

    /**
     * Loads weapon GLB and attaches to hand bone
     */
    async loadAndAttachWeapon(characterModel, weaponUrl) {
        try {
            const wGltf = await this.gltfLoader.loadAsync(weaponUrl);
            const wModel = wGltf.scene;

            // Normalize weapon size (~0.85m)
            const wBox = new THREE.Box3().setFromObject(wModel);
            const wSize = new THREE.Vector3();
            wBox.getSize(wSize);
            const maxDim = Math.max(wSize.x, wSize.y, wSize.z);
            const wScale = maxDim > 0 ? (0.85 / maxDim) : 1.0;
            wModel.scale.set(wScale, wScale, wScale);

            // Search for Right Hand Bone
            let handBone = null;
            const boneNames = ['weapon_socket.r', 'hand.r', 'righthand', 'mixamorigrighthand', 'hand_r'];
            characterModel.traverse(o => {
                if (o.isBone && !handBone) {
                    const bName = o.name.toLowerCase();
                    if (boneNames.some(target => bName.includes(target))) {
                        handBone = o;
                    }
                }
            });

            if (handBone) {
                wModel.position.set(0, 0, 0);
                wModel.rotation.set(0, 0, 0);
                handBone.add(wModel);
            } else {
                // Float gracefully near right shoulder
                wModel.position.set(0.65, 1.25, 0.2);
                characterModel.add(wModel);
            }

            this.currentWeaponModel = wModel;
        } catch (e) {
            console.warn('[HeroSelect] Weapon load skipped:', e);
        }
    }

    /**
     * Builds a glowing stylized 3D Hologram figure for un-uploaded heroes
     * @param {Object} hero 
     */
    buildHologramFallback(hero) {
        this.hologramGroup = new THREE.Group();

        let colorHex = 0x38bdf8;
        if (hero.team === 'team_love') colorHex = 0xec4899;
        if (hero.team === 'team_passion') colorHex = 0xf59e0b;

        const holoMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            wireframe: true,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending
        });

        // Head
        const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const head = new THREE.Mesh(headGeo, holoMat);
        head.position.y = 1.65;
        this.hologramGroup.add(head);

        // Torso
        const torsoGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.7, 16);
        const torso = new THREE.Mesh(torsoGeo, holoMat);
        torso.position.y = 1.15;
        this.hologramGroup.add(torso);

        // Floating Weapon Silhouette
        const weaponGeo = new THREE.OctahedronGeometry(0.3, 0);
        const weaponMesh = new THREE.Mesh(weaponGeo, holoMat);
        weaponMesh.position.set(0.65, 1.2, 0);
        this.hologramGroup.add(weaponMesh);

        // Orbiting Hologram Rings
        const ringGeo = new THREE.RingGeometry(0.5, 0.55, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ring1 = new THREE.Mesh(ringGeo, holoMat);
        ring1.position.y = 0.3;
        this.hologramGroup.add(ring1);

        const ring2 = new THREE.Mesh(ringGeo, holoMat);
        ring2.position.y = 1.1;
        ring2.scale.set(0.7, 0.7, 0.7);
        this.hologramGroup.add(ring2);

        this.scene.add(this.hologramGroup);
    }

    /**
     * Turntable Animation Render Loop
     */
    animate() {
        requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Smooth rotation interpolation
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.08;

        // Auto slow turntable spin if not dragging
        if (!this.isDragging) {
            this.targetRotationY += delta * 0.35;
        }

        // Apply rotation to hero model or hologram
        if (this.currentHeroModel) {
            this.currentHeroModel.rotation.y = this.currentRotationY;
            // Gentle procedural idle breathing
            this.currentHeroModel.position.y += Math.sin(time * 2.5) * 0.0006;
        } else if (this.hologramGroup) {
            this.hologramGroup.rotation.y = this.currentRotationY;
            this.hologramGroup.position.y = Math.sin(time * 3.0) * 0.04;
        }

        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Cleans up Three.js resources when transitioning to gameplay
     */
    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
        }
    }
}
