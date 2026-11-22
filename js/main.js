/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/main.js
 * 
 * Master Kernel Orchestrator & State Machine:
 * - Bootstraps Three.js r170 WebGL & HDR Post-Processing Pipeline
 * - Multi-State Manager: LOADING -> LOBBY -> SANDBOX (1920m Open-World) -> ARENA (5v5 MOBA)
 * - Decoupled 60 Hz Fixed Timestep Simulation Loop (FIXED_DT = 1/60)
 * - Full Asset Stitching (42 Heroes, 64 Props, Audio, VFX, Shaders, Network)
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { PHYSICS, CAMERA_PROFILES, QUALITY_PRESETS, ARENA_BOUNDS, WORLDS, MOBA_TIMINGS } from './config/constants.js';
import { getAllHeroes, getHeroById } from './config/rosterData.js';
import { FAST_TRAVEL_WAYPOINTS } from './config/worldLayoutData.js';

import { AssetManager } from './core/AssetManager.js';
import { AssetRegistry } from './core/AssetRegistry.js';
import { RealtimeSyncEngine } from './network/RealtimeSyncEngine.js';
import { SaveSystem } from './core/SaveSystem.js';
import { PortraitCropper } from './core/PortraitCropper.js';

import { SkyAndLighting } from './world/SkyAndLighting.js';
import { TerrainSystem, getTerrainHeight } from './world/TerrainSystem.js';
import { WaterSystem } from './world/WaterSystem.js';
import { FloraSystem } from './world/FloraSystem.js';
import { WorldBuilder } from './world/WorldBuilder.js';

import { CharacterRigController } from './character/CharacterRigController.js';
import { AnimationStateMachine } from './character/AnimationStateMachine.js';
import { LocomotionController } from './character/LocomotionController.js';

import { DamageEngine, calculateDamage, applyDamageToEntity } from './combat/DamageEngine.js';
import { HeroSkillExecutor } from './combat/HeroSkillExecutor.js';
import { TargetingSystem } from './combat/TargetingSystem.js';
import { MobaObjectiveSystem } from './combat/MobaObjectiveSystem.js';
import { BotAIController } from './combat/BotAIController.js';

import { VfxManager } from './vfx_audio/VfxManager.js';
import { AudioManager } from './vfx_audio/AudioManager.js';

import { LoadingAndLobbyUI } from './ui/LoadingAndLobbyUI.js';
import { CombatHudUI } from './ui/CombatHudUI.js';
import { ModalsUI } from './ui/ModalsUI.js';

export const GAME_STATES = {
    LOADING: 'LOADING',
    LOBBY: 'LOBBY',
    SANDBOX: 'SANDBOX',
    ARENA: 'ARENA'
};

class KernelEngine {
    constructor() {
        this.currentState = GAME_STATES.LOADING;
        this.canvas = document.getElementById('game-canvas');
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBar = document.getElementById('loading-bar-fill');
        this.loadingStatus = document.getElementById('loading-status-text');
        this.btnSkipLoading = document.getElementById('btn-skip-loading');

        this.lobbyContainer = document.getElementById('lobby-container');
        this.combatContainer = document.getElementById('combat-container');
        this.modalsContainer = document.getElementById('modals-container');

        // Global shortcut to guarantee button always enters lobby
        window.enterLobbyNow = () => this.transitionToLobby();

        // Bind skip button immediately in constructor
        if (this.btnSkipLoading) {
            this.btnSkipLoading.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.transitionToLobby();
            });
        }

        // Three.js Core
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.composer = null;
        this.clock = new THREE.Clock();
        this.fixedAccumulator = 0;
        this.FIXED_DT = 1 / 60; // 60 Hz physics

        // Managers
        this.audio = AudioManager;
        this.vfx = null;
        this.targeting = null;
        this.skillExecutor = null;
        this.mobaObjectives = null;
        this.modalsUI = null;
        this.lobbyUI = null;
        this.combatHudUI = null;
        this.syncEngine = new RealtimeSyncEngine();

        // World Components
        this.skyLighting = null;
        this.terrain = null;
        this.water = null;
        this.flora = null;
        this.worldBuilder = null;

        // Character State
        this.allHeroes = getAllHeroes();
        this.selectedHero = getHeroById('christy') || getHeroById('freya') || this.allHeroes[0];
        this.playerController = null;
        this.playerAnim = null;
        this.playerLoco = null;
        this.lobbyPedestalGroup = null;

        // Bots
        this.bots = [];

        // Loading flag
        this.hasTransitionedFromLoading = false;

        // Initialize graphics and modals immediately
        this.initGraphics();
        if (this.modalsContainer) {
            this.modalsUI = new ModalsUI(this.modalsContainer);
        }

        // Start loading process
        this.init();
    }

    async init() {
        console.log('[ONYXPURE] Booting Master Kernel Engine...');

        // Step 1: Reveal Background Backdrop after Calligraphy begins
        setTimeout(() => {
            const bgBackdrop = document.getElementById('loading-bg-backdrop');
            if (bgBackdrop) {
                bgBackdrop.classList.add('fade-in');
            }
        }, 900);

        // Step 2: Initialize Asset Manager & Probing
        this.updateLoadingProgress(25, 'Memindai Repository & Mendeteksi Aset 3D...');
        await AssetManager.init(this.renderer);
        AssetRegistry.auditUsage();

        this.updateLoadingProgress(60, 'Menyiapkan Pipeline Audio Spasial & VFX...');
        this.vfx = new VfxManager({
            scene: this.scene,
            camera: this.camera,
            damageContainer: document.body
        });

        this.updateLoadingProgress(85, 'Mempersiapkan Panggung Lobi 3D...');
        this.setupLobbyPedestal();

        this.updateLoadingProgress(100, 'Siap!');

        // Loading 100% Complete: Switch from progress bar to pulsating "KETUK LAYAR DI MANA SAJA UNTUK MASUK"
        const progressWrap = document.getElementById('loading-progress-wrap');
        const tapPrompt = document.getElementById('loading-tap-prompt');
        const loadingScreen = document.getElementById('loading-screen');

        if (progressWrap) progressWrap.style.display = 'none';
        if (tapPrompt) tapPrompt.style.display = 'flex';

        const enterTrigger = () => {
            if (this.hasTransitionedFromLoading) return;
            window.removeEventListener('keydown', keyHandler);
            if (loadingScreen) loadingScreen.removeEventListener('click', enterTrigger);
            if (tapPrompt) tapPrompt.removeEventListener('click', enterTrigger);

            // Legal AudioContext unlock on first user interaction
            try {
                if (THREE.AudioContext && THREE.AudioContext.getContext()) {
                    THREE.AudioContext.getContext().resume();
                }
            } catch (_) {}

            this.transitionToLobby();
        };

        const keyHandler = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                enterTrigger();
            }
        };

        if (loadingScreen) {
            loadingScreen.style.cursor = 'pointer';
            loadingScreen.addEventListener('click', enterTrigger, { once: true });
        }
        if (tapPrompt) {
            tapPrompt.addEventListener('click', enterTrigger, { once: true });
        }
        window.addEventListener('keydown', keyHandler);
        window.enterLobbyNow = enterTrigger;

        // Start 60 Hz Render Loop
        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    initGraphics() {
        if (this.renderer) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        // Renderer: Direct High-Performance Rendering (No Bloom/Composer freeze)
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            powerPreference: 'high-performance',
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap; // 1024 PCF Shadows

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05080e);

        // Camera
        this.camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 800);
        this.camera.position.set(0, 3.2, 7.5);
        this.camera.lookAt(0, 1.4, 0);

        // Targeted Direct Render (Composer disabled by default to eliminate WebGL NaN artifact)
        this.composer = null;

        // Targeting System
        this.targeting = new TargetingSystem({
            camera: this.camera,
            scene: this.scene,
            domElement: this.canvas
        });
    }

    updateLoadingProgress(percent, statusText) {
        if (this.loadingBar) {
            this.loadingBar.style.width = `${percent}%`;
        }
        if (this.loadingStatus) {
            this.loadingStatus.textContent = statusText;
        }
    }

    setupLobbyPedestal() {
        if (this.lobbyPedestalGroup) return;

        this.lobbyPedestalGroup = new THREE.Group();
        this.scene.add(this.lobbyPedestalGroup);

        // Thin Atmospheric Fog for Depth
        this.scene.fog = new THREE.FogExp2(0x0b1522, 0.0032);

        // Load 360° Fontaine Crystal Skybox for Lobby Background
        AssetManager.loadTexture(AssetManager.assetUrl('skyboxes_and_banners/skybox_fontaine_crystal.webp'), true).then(tex => {
            if (tex) {
                tex.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.background = tex;
            }
        }).catch(() => {});

        // Try load 3D Terrarium Dome Environment GLB
        AssetManager.loadGLTF(AssetManager.assetUrl('environments_glb/lobby_terrarium.glb')).then(gltf => {
            if (gltf && this.lobbyPedestalGroup) {
                gltf.scene.position.set(0, 0, 0);
                this.lobbyPedestalGroup.add(gltf.scene);
            }
        }).catch(() => {});

        // Elegant Ivory White Marble Pedestal (Radius 2.35m, Height 0.38m)
        const baseGeo = new THREE.CylinderGeometry(2.35, 2.55, 0.38, 48);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            roughness: 0.32,
            metalness: 0.12
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = -0.19;
        baseMesh.receiveShadow = true;
        this.lobbyPedestalGroup.add(baseMesh);

        // Gold Carved Ornamental Rim
        const rimGeo = new THREE.TorusGeometry(2.36, 0.035, 16, 64);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            roughness: 0.25,
            metalness: 0.85
        });
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        rimMesh.rotation.x = Math.PI / 2;
        rimMesh.position.y = 0.0;
        this.lobbyPedestalGroup.add(rimMesh);

        // Glowing Cyan Energy Ring
        const ringGeo = new THREE.TorusGeometry(2.05, 0.03, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 0.01;
        this.lobbyPedestalGroup.add(ringMesh);

        // 100 Floating Glowing Fireflies
        const fireflyCount = 100;
        const fireflyGeo = new THREE.BufferGeometry();
        const fireflyPos = new Float32Array(fireflyCount * 3);
        for (let i = 0; i < fireflyCount; i++) {
            fireflyPos[i * 3 + 0] = (Math.random() - 0.5) * 16;
            fireflyPos[i * 3 + 1] = Math.random() * 5 + 0.2;
            fireflyPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
        }
        fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
        const fireflyMat = new THREE.PointsMaterial({
            color: 0x38bdf8,
            size: 0.14,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });
        this.lobbyFireflies = new THREE.Points(fireflyGeo, fireflyMat);
        this.lobbyPedestalGroup.add(this.lobbyFireflies);

        // 3-Point Studio Lighting for Hero Showcase (Zero Pitch-Black Hero!)
        const ambLight = new THREE.AmbientLight(0xffffff, 1.35);
        this.lobbyPedestalGroup.add(ambLight);

        const hemiLight = new THREE.HemisphereLight(0xdff4ff, 0x6b8e5a, 1.2);
        this.lobbyPedestalGroup.add(hemiLight);

        const keyLight = new THREE.DirectionalLight(0xfff6e5, 2.2);
        keyLight.position.set(4, 7, 8);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        this.lobbyPedestalGroup.add(keyLight);

        const rimLight = new THREE.PointLight(0x38bdf8, 2.5, 12);
        rimLight.position.set(0, 3.5, -4.5);
        this.lobbyPedestalGroup.add(rimLight);
    }

    async loadLobbyHero(hero) {
        this.selectedHero = hero;

        // Remove old lobby hero if any
        if (this.playerController && this.playerController.root) {
            this.scene.remove(this.playerController.root);
            this.playerController = null;
            this.playerAnim = null;
        }

        // Try load hero 3D GLB
        const gltf = await AssetManager.loadHeroModel(hero.slug || hero.id);
        if (gltf) {
            this.playerController = new CharacterRigController({
                hero,
                templateScene: gltf.scene
            });
            this.playerAnim = new AnimationStateMachine({
                modelRoot: this.playerController.root,
                bones: this.playerController.bones,
                clips: gltf.animations || []
            });
            this.playerController.root.position.set(0, 0, 0);
            this.scene.add(this.playerController.root);
            this.playerAnim.setState('IDLE');
        } else {
            console.log(`[Kernel] 3D Model for ${hero.name} not found, displaying procedural hero stand.`);
            const placeholderGroup = new THREE.Group();
            const bodyGeo = new THREE.CapsuleGeometry(0.35, 1.15, 16, 32);
            const teamColor = hero.team === 'team_dream' ? 0x38bdf8 : hero.team === 'team_love' ? 0xec4899 : 0xf59e0b;
            const bodyMat = new THREE.MeshStandardMaterial({
                color: teamColor,
                roughness: 0.2,
                metalness: 0.8,
                emissive: teamColor,
                emissiveIntensity: 0.4
            });
            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            bodyMesh.position.y = 1.0;
            bodyMesh.castShadow = true;
            placeholderGroup.add(bodyMesh);

            this.playerController = {
                root: placeholderGroup,
                bones: {},
                hero,
                hp: hero.baseHp || 2600,
                maxHp: hero.baseHp || 2600,
                mana: hero.baseMana || 450,
                maxMana: hero.baseMana || 450,
                shield: 0,
                patk: hero.basePatk || 120,
                matk: hero.baseMatk || 35,
                pdef: hero.basePdef || 20,
                mdef: hero.baseMdef || 15,
                isHero: true
            };
            this.playerAnim = {
                update: () => {},
                setState: () => {},
                triggerAttack: () => {}
            };
            this.scene.add(this.playerController.root);
        }
    }

    // =========================================================================
    // STATE TRANSITIONS
    // =========================================================================

    transitionToLobby() {
        if (this.hasTransitionedFromLoading) return;
        this.hasTransitionedFromLoading = true;
        this.currentState = GAME_STATES.LOBBY;

        console.log('[Kernel] Entering 42-Hero Selection Lobby...');

        // Fade out loading screen smoothly
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 650);
        }

        // Show Lobby UI
        if (this.lobbyContainer) {
            this.lobbyContainer.style.display = 'block';
            this.lobbyUI = new LoadingAndLobbyUI({
                container: this.lobbyContainer,
                onSelectHero: (hero) => {
                    this.loadLobbyHero(hero);
                },
                onEnterSandbox: (hero, spawnLoc) => {
                    this.transitionToSandbox(hero, spawnLoc);
                },
                onEnterArena: (hero, arenaId, spellId) => {
                    this.transitionToArena(hero, arenaId, spellId);
                },
                onOpenModal: (modalId) => {
                    this.modalsUI?.openModal(modalId);
                }
            });
        }

        // Ensure Pedestal is active
        this.setupLobbyPedestal();
        if (this.lobbyPedestalGroup) {
            this.lobbyPedestalGroup.visible = true;
        }

        // Load Default Hero on Pedestal
        this.loadLobbyHero(this.selectedHero);

        // Start Lobby BGM if unlocked
        try {
            this.audio.playBgm('bgm_lobby');
        } catch (_) {}

        // Set Camera angle for Hero Inspection
        this.camera.position.set(0, 2.1, 5.2);
        this.camera.lookAt(0, 1.25, 0);
    }

    async transitionToSandbox(hero, spawnLoc) {
        const heroObj = typeof hero === 'object' ? hero : (getHeroById(hero) || this.selectedHero);
        const spawnX = spawnLoc?.x ?? 0;
        const spawnZ = spawnLoc?.z ?? 0;
        console.log(`[Kernel] Entering Mega Terrarium Sandbox with ${heroObj.name} at (${spawnX}, ${spawnZ})...`);
        this.currentState = GAME_STATES.SANDBOX;

        // Hide Lobby UI
        if (this.lobbyContainer) this.lobbyContainer.style.display = 'none';
        if (this.lobbyPedestalGroup) this.lobbyPedestalGroup.visible = false;

        // Synchronously show Combat HUD container immediately so UI never vanishes!
        if (this.combatContainer) {
            this.combatContainer.style.display = 'block';
            this.combatContainer.style.opacity = '1';
        }

        // Play Terrarium Exploration BGM
        this.audio.playBgm('bgm_terrarium');

        // Setup Sky & Lighting
        this.skyLighting = new SkyAndLighting(this.scene, this.renderer, this.camera, 'sandbox', SaveSystem.data.settings.graphicsQuality);
        await this.skyLighting.init();

        // Setup 1920m Terrain
        this.terrain = new TerrainSystem(this.scene, 'sandbox', SaveSystem.data.settings.graphicsQuality);
        await this.terrain.init();

        // Setup Water
        this.water = new WaterSystem(this.scene, this.camera, 'sandbox');
        await this.water.init();

        // Setup Flora
        this.flora = new FloraSystem(this.scene, SaveSystem.data.settings.graphicsQuality);
        await this.flora.init();

        // Setup World Props (Progressive stream near props first)
        this.worldBuilder = new WorldBuilder(this.scene, 'sandbox');
        await this.worldBuilder.init(spawnX, spawnZ);

        // Spawn Player Character
        await this.spawnPlayer(heroObj, spawnX, spawnZ);

        // Setup Skill Executor
        this.skillExecutor = new HeroSkillExecutor({
            vfxManager: this.vfx,
            audioManager: this.audio,
            allEntities: []
        });

        // Initialize Realtime Multiplayer Sync
        if (this.syncEngine) {
            this.syncEngine.setScene(this.scene);
            this.syncEngine.init('sandbox_terarium_01', heroObj.id, 'Player');
        }

        // Setup Combat HUD (Sandbox mode)
        if (this.combatContainer) {
            this.combatContainer.style.display = 'block';
            this.combatHudUI = new CombatHudUI({
                container: this.combatContainer,
                hero: heroObj,
                mode: 'sandbox',
                targetingSystem: this.targeting,
                onMoveInput: (x, y) => {
                    if (this.playerLoco) {
                        this.playerLoco.setMoveInput(x, y, this.targeting?.camYaw || 0);
                        if (Math.hypot(x, y) > 0.1) {
                            this.playerAnim?.setState(this.playerLoco.isSprinting ? 'SPRINT' : 'RUN');
                        } else {
                            this.playerAnim?.setState('IDLE');
                        }
                    }
                },
                onBasicAttack: () => {
                    this.executePlayerBasicAttack();
                },
                onSkillCast: (key, aimDir, groundPos) => {
                    this.executePlayerSkill(key, aimDir, groundPos);
                },
                onFastTravel: (wpId) => {
                    const wp = FAST_TRAVEL_WAYPOINTS.find(w => w.id === wpId) || { x: 0, z: 0 };
                    if (this.playerLoco) {
                        const y = getTerrainHeight(wp.x, wp.z, 'sandbox');
                        this.playerLoco.setPosition(wp.x, y, wp.z);
                        this.vfx?.triggerShockwave(new THREE.Vector3(wp.x, y, wp.z), 0x38bdf8, 4.0);
                        this.audio.playSfx('sfx_portal_warp');
                    }
                },
                onReturnToLobby: () => {
                    window.location.reload();
                }
            });
        }
    }

    async transitionToArena(hero, arenaId = 'arena_colosseum', spellId = 'spell_flicker') {
        const heroObj = typeof hero === 'object' ? hero : (getHeroById(hero) || this.selectedHero);
        console.log(`[Kernel] Entering 5v5 MOBA Arena: ${arenaId} with ${heroObj.name}...`);
        this.currentState = GAME_STATES.ARENA;

        // Hide Lobby UI
        if (this.lobbyContainer) this.lobbyContainer.style.display = 'none';
        if (this.lobbyPedestalGroup) this.lobbyPedestalGroup.visible = false;

        // Synchronously show Combat HUD container immediately!
        if (this.combatContainer) {
            this.combatContainer.style.display = 'block';
            this.combatContainer.style.opacity = '1';
        }

        // Play Arena Battle BGM
        this.audio.playBgm('bgm_battle');

        // Setup Arena Lighting
        this.skyLighting = new SkyAndLighting(this.scene, this.renderer, this.camera, arenaId, SaveSystem.data.settings.graphicsQuality);
        await this.skyLighting.init();

        // Setup Arena Terrain
        this.terrain = new TerrainSystem(this.scene, arenaId, SaveSystem.data.settings.graphicsQuality);
        await this.terrain.init();

        // Setup Arena Props
        this.worldBuilder = new WorldBuilder(this.scene, arenaId);
        await this.worldBuilder.init();

        // Spawn Player (Team Dream Base)
        const spawnX = -75;
        const spawnZ = 0;
        await this.spawnPlayer(heroObj, spawnX, spawnZ);
        this.playerController.team = 'team_dream';

        // Setup MOBA Objectives (Turrets, Minions, Bosses, Nexus)
        this.mobaObjectives = new MobaObjectiveSystem({
            scene: this.scene,
            arenaId,
            vfxManager: this.vfx,
            onMatchEnd: (winningTeam) => {
                this.audio.playBgm(winningTeam === 'team_dream' ? 'bgm_victory' : 'bgm_defeat');
                if (this.combatHudUI) {
                    this.combatHudUI.triggerKillstreak(winningTeam === 'team_dream' ? 'first_blood' : 'penta');
                }
                alert(winningTeam === 'team_dream' ? 'VICTORY! Nexus Lawan Hancur!' : 'DEFEAT! Nexus Kita Hancur!');
            }
        });

        // Setup Skill Executor with all combat targets
        this.skillExecutor = new HeroSkillExecutor({
            vfxManager: this.vfx,
            audioManager: this.audio,
            allEntities: []
        });

        // Spawn 4 Allied Bots + 5 Enemy Bots
        this.spawnBots(heroObj);

        // Initialize Realtime Multiplayer Sync
        if (this.syncEngine) {
            this.syncEngine.setScene(this.scene);
            this.syncEngine.init('arena_colosseum_01', heroObj.id, 'Player');
        }

        // Setup Combat HUD (Arena mode)
        if (this.combatContainer) {
            this.combatContainer.style.display = 'block';
            this.combatHudUI = new CombatHudUI({
                container: this.combatContainer,
                hero: heroObj,
                mode: 'arena',
                targetingSystem: this.targeting,
                onMoveInput: (x, y) => {
                    if (this.playerLoco) {
                        this.playerLoco.setMoveInput(x, y, this.targeting?.camYaw || 0);
                        if (Math.hypot(x, y) > 0.1) {
                            this.playerAnim?.setState(this.playerLoco.isSprinting ? 'SPRINT' : 'RUN');
                        } else {
                            this.playerAnim?.setState('IDLE');
                        }
                    }
                },
                onBasicAttack: () => {
                    this.executePlayerBasicAttack();
                },
                onSkillCast: (key, aimDir, groundPos) => {
                    this.executePlayerSkill(key, aimDir, groundPos);
                },
                onFastTravel: () => {},
                onReturnToLobby: () => {
                    window.location.reload();
                }
            });
        }
    }

    async spawnPlayer(hero, x, z) {
        const gltf = await AssetManager.loadHeroModel(hero.slug || hero.id);
        const templateScene = gltf ? gltf.scene : new THREE.Group();

        if (!gltf) {
            const bodyGeo = new THREE.CapsuleGeometry(0.35, 1.15, 16, 32);
            const teamColor = hero.team === 'team_dream' ? 0x38bdf8 : hero.team === 'team_love' ? 0xec4899 : 0xf59e0b;
            const bodyMat = new THREE.MeshStandardMaterial({
                color: teamColor,
                roughness: 0.2,
                metalness: 0.8,
                emissive: teamColor,
                emissiveIntensity: 0.4
            });
            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            bodyMesh.position.y = 1.0;
            bodyMesh.castShadow = true;
            templateScene.add(bodyMesh);
        }

        this.playerController = new CharacterRigController({
            hero,
            templateScene
        });

        this.playerAnim = new AnimationStateMachine({
            modelRoot: this.playerController.root,
            bones: this.playerController.bones,
            clips: gltf ? gltf.animations : []
        });

        this.playerLoco = new LocomotionController({
            characterRoot: this.playerController.root,
            sceneMode: this.currentState === GAME_STATES.SANDBOX ? 'sandbox' : 'arena',
            worldBuilder: this.worldBuilder,
            onFootstep: (surface, pos) => {
                this.audio.playFootstep(surface, pos);
            }
        });

        const y = getTerrainHeight(x, z, this.currentState === GAME_STATES.SANDBOX ? 'sandbox' : 'arena');
        this.playerLoco.setPosition(x, y, z);

        this.playerController.hero = hero;
        this.playerController.hp = hero.baseHp || 2600;
        this.playerController.maxHp = this.playerController.hp;
        this.playerController.mana = hero.baseMana || 450;
        this.playerController.maxMana = this.playerController.mana;
        this.playerController.shield = 0;
        this.playerController.patk = hero.basePatk || 120;
        this.playerController.matk = hero.baseMatk || 35;
        this.playerController.pdef = hero.basePdef || 20;
        this.playerController.mdef = hero.baseMdef || 15;
        this.playerController.isHero = true;

        this.scene.add(this.playerController.root);
        this.targeting.setPlayer(this.playerController);
    }

    spawnBots(playerHero) {
        const activeHeroes = this.allHeroes.filter(h => h.isReady && h.id !== playerHero.id);

        // 4 Allies
        const allyHeroes = activeHeroes.slice(0, 2);
        for (let i = 0; i < allyHeroes.length; i++) {
            const h = allyHeroes[i];
            const bot = new BotAIController({
                hero: h,
                team: 'team_dream',
                skillExecutor: this.skillExecutor,
                objectiveSystem: this.mobaObjectives
            });
            bot.position.set(-68 + (i * 4), 0, (i - 1) * 8);
            this.bots.push(bot);
        }

        // 5 Enemies
        const enemyHeroes = activeHeroes.slice(2, 5);
        for (let i = 0; i < enemyHeroes.length; i++) {
            const h = enemyHeroes[i];
            const bot = new BotAIController({
                hero: h,
                team: 'team_passion',
                skillExecutor: this.skillExecutor,
                objectiveSystem: this.mobaObjectives
            });
            bot.position.set(68 - (i * 4), 0, (i - 1) * 8);
            this.bots.push(bot);
        }
    }

    executePlayerBasicAttack() {
        if (!this.playerController || !this.skillExecutor) return;

        const target = this.targeting.softTarget || this.targeting.hardTarget;
        this.playerAnim.triggerAttack(1);
        this.skillExecutor.executeBasicAttack(this.playerController, target);

        // Sword Trail
        if (this.vfx) {
            this.vfx.triggerSwordTrail(this.playerController, 0.32);
        }
    }

    executePlayerSkill(key, aimDir, groundPos) {
        if (!this.playerController || !this.skillExecutor) return;

        this.playerAnim.triggerAttack(2);
        this.skillExecutor.executeSkill(this.playerController, key, {
            aimDir,
            groundPos,
            target: this.targeting.softTarget || this.targeting.hardTarget
        });
    }

    // =========================================================================
    // 60 HZ FIXED TIMESTEP SIMULATION & RENDER LOOP
    // =========================================================================

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = Math.min(this.clock.getDelta(), 0.1);
        this.fixedAccumulator += delta;

        // Run fixed 60 Hz physics updates
        while (this.fixedAccumulator >= this.FIXED_DT) {
            this.updateFixed(this.FIXED_DT);
            this.fixedAccumulator -= this.FIXED_DT;
        }

        // Render frame
        this.render(delta);
    }

    updateFixed(dt) {
        if (this.currentState === GAME_STATES.LOBBY) {
            // Slowly rotate pedestal hero
            if (this.playerController && this.playerController.root) {
                this.playerController.root.rotation.y += 0.45 * dt;
            }
            if (this.playerAnim) {
                this.playerAnim.update(dt);
            }
            if (this.lobbyFireflies) {
                this.lobbyFireflies.rotation.y += 0.06 * dt;
            }
            return;
        }

        if (this.currentState === GAME_STATES.SANDBOX || this.currentState === GAME_STATES.ARENA) {
            // Update Player Locomotion & Rig
            if (this.playerLoco) {
                this.playerLoco.update(dt);
            }
            if (this.playerAnim) {
                this.playerAnim.update(dt);
            }

            // Update Audio 3D Listener to player position
            if (this.playerController && this.playerController.root) {
                this.audio.updateListenerPosition(this.playerController.root.position, this.targeting.camYaw);
            }

            // Update MOBA Objectives
            if (this.mobaObjectives) {
                const allCombatants = [this.playerController, ...this.bots];
                this.mobaObjectives.update(dt, allCombatants);
            }

            // Update Bots AI
            if (this.bots.length > 0) {
                const allTargets = [
                    this.playerController,
                    ...(this.mobaObjectives ? this.mobaObjectives.minions : []),
                    ...(this.mobaObjectives ? this.mobaObjectives.turrets : []),
                    ...this.bots
                ];
                for (const bot of this.bots) {
                    bot.update(dt, allTargets);
                }
            }

            // Update Targeting System
            if (this.targeting) {
                const targets = [
                    ...(this.mobaObjectives ? this.mobaObjectives.turrets : []),
                    ...(this.mobaObjectives ? this.mobaObjectives.minions : []),
                    ...this.bots
                ];
                this.targeting.setEntities(targets);
                this.targeting.update(dt);
            }

            // Update HUD Status & Minimap
            if (this.combatHudUI && this.playerController) {
                this.combatHudUI.updateStatus(
                    this.playerController.hp,
                    this.playerController.maxHp,
                    this.playerController.shield,
                    this.playerController.mana,
                    this.playerController.maxMana
                );
                const allMinimapEntities = [
                    ...(this.mobaObjectives ? this.mobaObjectives.turrets : []),
                    ...(this.mobaObjectives ? this.mobaObjectives.minions : []),
                    ...this.bots
                ];
                this.combatHudUI.renderMinimap(this.playerController.position, allMinimapEntities);
            }

            // Update Realtime Multiplayer Sync & Telemetry
            if (this.syncEngine && this.playerController && this.playerLoco) {
                const isMoving = this.playerLoco.velocity ? this.playerLoco.velocity.lengthSq() > 0.01 : false;
                const animStateId = isMoving ? (this.playerLoco.isSprinting ? 3 : 2) : 0;
                this.syncEngine.updateLocalPlayer(
                    this.playerController.root.position,
                    this.playerLoco.velocity || new THREE.Vector3(),
                    this.playerController.root.rotation.y,
                    animStateId,
                    (this.playerController.hp || 1) / (this.playerController.maxHp || 1),
                    this.playerLoco.isGrounded,
                    this.playerLoco.isSprinting,
                    false
                );
                this.syncEngine.update(dt, this.currentState === GAME_STATES.ARENA ? 'arena' : 'sandbox');
                if (this.combatHudUI) {
                    this.combatHudUI.setNetworkStats(this.syncEngine.getStats());
                }
            }
        }
    }

    render(delta) {
        // Update Shaders & Environment Uniforms
        if (this.water) this.water.update(delta);
        if (this.flora && this.playerController) {
            this.flora.update(delta, this.playerController.root.position);
        }
        if (this.skyLighting && this.playerController) {
            this.skyLighting.update(delta, this.playerController.root.position);
        }

        // Update VFX (ribbons, particles, damage popups, hitstop)
        if (this.vfx) {
            this.vfx.update(delta);
        }

        // Direct High-Performance Render (Zero Bloom NaN artifact, Smooth 60 FPS)
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onWindowResize() {
        if (!this.renderer || !this.camera) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }
}

// Bootstrap Kernel Engine on DOM Load
window.addEventListener('DOMContentLoaded', () => {
    window.__ONYXPURE_KERNEL__ = new KernelEngine();
});
