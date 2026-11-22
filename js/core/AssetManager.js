/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/core/AssetManager.js
 * 
 * Master Asset Pipeline & Anti-404 Discovery:
 * - Dual-Root Discovery (./model/ vs ./models/)
 * - Integrated with AssetRegistry (100% 900 assets bound)
 * - GitHub Trees API Case-Insensitive Indexer
 * - 4-Way Auto-Probe for 6 Active Hero GLBs
 * - URL Encoding for spaces in paths
 * - Singleton Draco, KTX2, Meshopt & GLTFLoader
 * - Deep GPU Memory Disposal (Anti-VRAM Leaks)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { AssetRegistry } from './AssetRegistry.js';

class AssetManagerClass {
    constructor() {
        this.rootPath = './models';
        this.gitTreeMap = new Map(); // lowercase path -> original path
        this.localGlbOverrides = new Map(); // heroId -> objectURL
        this.textureCache = new Map();
        this.glbCache = new Map();

        this.isInitialized = false;
        this.dracoLoader = null;
        this.ktx2Loader = null;
        this.gltfLoader = null;
        this.textureLoader = new THREE.TextureLoader();
    }

    /**
     * Initializes loaders, discovers asset root, and loads core manifests
     * @param {THREE.WebGLRenderer} renderer 
     */
    async init(renderer = null) {
        if (this.isInitialized) return;

        // Initialize DRACOLoader singleton
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        this.dracoLoader.setWorkerLimit(2);

        // Initialize GLTFLoader
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
        this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);

        // Initialize KTX2Loader if renderer provided
        if (renderer) {
            try {
                this.ktx2Loader = new KTX2Loader();
                this.ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/basis/');
                this.ktx2Loader.detectSupport(renderer);
                this.gltfLoader.setKTX2Loader(this.ktx2Loader);
            } catch (err) {
                console.warn('[AssetManager] KTX2Loader init skipped:', err);
            }
        }

        // Run root discovery and GitHub Tree scan in parallel
        await Promise.allSettled([
            this.detectAssetRoot(),
            this.scanGithubRepo()
        ]);

        AssetRegistry.setRoot(this.rootPath);

        // Load core manifests as specified in directive (Item #1)
        await this.loadCoreManifests();

        this.isInitialized = true;
        console.log(`[AssetManager] Ready. Root path: ${this.rootPath}, Indexed files: ${this.gitTreeMap.size}`);
    }

    /**
     * Probes ./model/ and ./models/ to establish real asset root
     */
    async detectAssetRoot() {
        const candidates = ['./models', './model'];
        for (const candidate of candidates) {
            try {
                const resp = await fetch(`${candidate}/roster_web_manifest.json`, { method: 'HEAD' });
                if (resp.ok) {
                    this.rootPath = candidate;
                    return;
                }
            } catch (_) {}
        }
        try {
            const remoteResp = await fetch('https://onyxpure.my.id/models/roster_web_manifest.json', { method: 'HEAD' });
            if (remoteResp.ok) {
                this.rootPath = 'https://onyxpure.my.id/models';
                return;
            }
        } catch (_) {}
        this.rootPath = './models';
    }

    /**
     * Loads master_asset_inventory.json & roster_web_manifest.json
     */
    async loadCoreManifests() {
        try {
            const [inv, ros] = await Promise.allSettled([
                fetch(this.assetUrl('master_asset_inventory.json')).then(r => r.ok ? r.json() : null),
                fetch(this.assetUrl('roster_web_manifest.json')).then(r => r.ok ? r.json() : null)
            ]);
            if (inv.status === 'fulfilled' && inv.value) {
                AssetRegistry.markUsed('master_asset_inventory.json');
            }
            if (ros.status === 'fulfilled' && ros.value) {
                AssetRegistry.markUsed('roster_web_manifest.json');
            }
        } catch (_) {}
    }

    /**
     * Scans GitHub Trees API to build case-insensitive file mapping
     */
    async scanGithubRepo() {
        let owner = 'ashazeneca-cyber';
        let repo = 'skunvfucjsdheocjs';

        try {
            const host = window.location.hostname;
            const pathSegments = window.location.pathname.split('/').filter(Boolean);
            if (host.includes('github.io')) {
                owner = host.split('.')[0];
                if (pathSegments.length > 0) {
                    repo = pathSegments[0];
                }
            }
        } catch (_) {}

        const branches = ['main', 'master'];
        for (const branch of branches) {
            try {
                const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
                const resp = await fetch(apiUrl, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
                if (resp.ok) {
                    const data = await resp.json();
                    if (Array.isArray(data.tree)) {
                        for (const item of data.tree) {
                            if (item.type === 'blob') {
                                this.gitTreeMap.set(item.path.toLowerCase(), item.path);
                            }
                        }
                        console.log(`[AssetManager] GitHub Tree Indexed ${this.gitTreeMap.size} entries from ${branch}`);
                        return;
                    }
                }
            } catch (e) {
                // Ignore API limits
            }
        }
    }

    /**
     * Builds safe, segment-encoded URL from relative path and registers with AssetRegistry
     * @param {string} relPath 
     * @returns {string}
     */
    assetUrl(relPath) {
        if (!relPath) return '';
        if (relPath.startsWith('blob:') || relPath.startsWith('http://') || relPath.startsWith('https://')) {
            AssetRegistry.markUsed(relPath);
            return relPath;
        }

        let clean = relPath.replace(/^(\.\/)?(models?\/)?/, '');
        const mapped = this.gitTreeMap.get(clean.toLowerCase()) || clean;

        return AssetRegistry.resolve(mapped);
    }

    /**
     * Resolves hero GLB with 4-way auto-probe
     * @param {Object} hero 
     * @returns {Promise<string>}
     */
    async resolveHeroGlbUrl(hero) {
        if (!hero) return '';

        if (this.localGlbOverrides.has(hero.id)) {
            return this.localGlbOverrides.get(hero.id);
        }

        const teamShort = hero.team ? hero.team.replace('team_', '') : '';
        const capName = hero.name.charAt(0).toUpperCase() + hero.name.slice(1);
        const teamCap = teamShort.charAt(0).toUpperCase() + teamShort.slice(1);

        const candidates = [
            `${hero.slug}${teamShort}.glb`.toLowerCase(), // freyadream.glb, christypassion.glb
            `${hero.slug}.glb`.toLowerCase(),              // freya.glb, christy.glb
            `${capName}${teamShort}.glb`,                   // Freyadream.glb
            `${capName}${teamCap}.glb`,                    // FreyaDream.glb
            `${capName}.glb`                               // Freya.glb
        ];

        // 1. Check in GitHub tree map first
        for (const cand of candidates) {
            const treeMatch = this.gitTreeMap.get(cand.toLowerCase()) || 
                              this.gitTreeMap.get(`models/${cand.toLowerCase()}`) ||
                              this.gitTreeMap.get(`model/${cand.toLowerCase()}`);
            if (treeMatch) {
                return this.assetUrl(treeMatch);
            }
        }

        // 2. Parallel HTTP HEAD probe across local paths and raw GitHub
        for (const cand of candidates) {
            const probePaths = [
                `${this.rootPath}/${cand}`,
                `./models/${cand}`,
                `./model/${cand}`,
                `https://raw.githubusercontent.com/ashazeneca-cyber/skunvfucjsdheocjs/main/models/${cand}`
            ];
            for (const url of probePaths) {
                try {
                    const resp = await fetch(url, { method: 'HEAD' });
                    if (resp.ok) {
                        AssetRegistry.markUsed(cand);
                        return url;
                    }
                } catch (_) {}
            }
        }

        return `${this.rootPath}/${candidates[0]}`;
    }

    /**
     * Loads a Hero 3D GLB model
     * @param {Object|string} heroOrSlug 
     * @returns {Promise<Object|null>}
     */
    async loadHeroModel(heroOrSlug) {
        let hero = typeof heroOrSlug === 'object' ? heroOrSlug : null;
        if (!hero && typeof heroOrSlug === 'string') {
            const { getHeroById } = await import('../config/rosterData.js');
            hero = getHeroById(heroOrSlug);
        }
        if (!hero) return null;

        const glbUrl = await this.resolveHeroGlbUrl(hero);
        if (!glbUrl) return null;

        try {
            return await this.loadGLTF(glbUrl);
        } catch (err) {
            console.warn(`[AssetManager] Could not load GLB for ${hero.name} from ${glbUrl}:`, err);
            return null;
        }
    }

    registerLocalGlb(heroId, file) {
        const objectUrl = URL.createObjectURL(file);
        this.localGlbOverrides.set(heroId.toLowerCase(), objectUrl);
        console.log(`[AssetManager] Registered local GLB override for hero ${heroId}: ${objectUrl}`);
        return objectUrl;
    }

    loadGLTF(url, onProgress = null) {
        AssetRegistry.markUsed(url);
        return new Promise((resolve, reject) => {
            if (!this.gltfLoader) {
                this.init();
            }
            this.gltfLoader.load(
                url,
                (gltf) => resolve(gltf),
                (xhr) => {
                    if (onProgress && xhr.total > 0) {
                        onProgress(xhr.loaded / xhr.total);
                    }
                },
                (err) => {
                    AssetRegistry.markFailed(url, 'GLTF Load Failed');
                    reject(err);
                }
            );
        });
    }

    loadTexture(url, isColorMap = true) {
        AssetRegistry.markUsed(url);
        if (this.textureCache.has(url)) {
            return Promise.resolve(this.textureCache.get(url));
        }

        return new Promise((resolve) => {
            this.textureLoader.load(
                url,
                (tex) => {
                    tex.colorSpace = isColorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace;
                    this.textureCache.set(url, tex);
                    resolve(tex);
                },
                undefined,
                (err) => {
                    AssetRegistry.markFailed(url, 'Texture 404 Fallback');
                    const canvas = document.createElement('canvas');
                    canvas.width = 16;
                    canvas.height = 16;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = isColorMap ? '#4a7c36' : '#808080';
                    ctx.fillRect(0, 0, 16, 16);
                    const fallbackTex = new THREE.CanvasTexture(canvas);
                    fallbackTex.colorSpace = isColorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace;
                    this.textureCache.set(url, fallbackTex);
                    resolve(fallbackTex);
                }
            );
        });
    }

    disposeSceneTree(root, renderer = null) {
        if (!root) return;

        root.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    for (const mat of materials) {
                        for (const key of Object.keys(mat)) {
                            const val = mat[key];
                            if (val && typeof val.dispose === 'function') {
                                val.dispose();
                                if (val.source && val.source.data && typeof val.source.data.close === 'function') {
                                    val.source.data.close();
                                }
                            }
                        }
                        mat.dispose();
                    }
                }
            }
        });

        if (renderer && renderer.renderLists) {
            renderer.renderLists.dispose();
        }
    }
}

export const AssetManager = new AssetManagerClass();
