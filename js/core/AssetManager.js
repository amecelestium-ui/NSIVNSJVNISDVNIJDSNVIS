/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/core/AssetManager.js
 * 
 * Master Asset Pipeline & Anti-404 Discovery:
 * - Dual-Root Discovery (./model/ vs ./models/)
 * - GitHub Trees API Case-Insensitive Indexer
 * - 4-Way Auto-Probe for 6 Active Hero GLBs
 * - URL Encoding for spaces in paths (asset game/team dream/ -> asset%20game/team%20dream/)
 * - Singleton Draco, KTX2, Meshopt & GLTFLoader
 * - Deep GPU Memory Disposal (Anti-VRAM Leaks)
 * - Dynamic Local GLB Model Upload Registration
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

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
     * Initializes loaders and discovers asset root
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

        this.isInitialized = true;
        console.log(`⚡ [AssetManager] Ready. Root path: ${this.rootPath}, Indexed files: ${this.gitTreeMap.size}`);
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
        // Default
        this.rootPath = './models';
    }

    /**
     * Scans GitHub Trees API to build case-insensitive file mapping
     */
    async scanGithubRepo() {
        let owner = 'ashazeneca-cyber';
        let repo = 'skunvfucjsdheocjs';

        // Extract owner/repo if hosted on github.io
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
                // Ignore API rate limits or network issues, fall back to local direct resolution
            }
        }
    }

    /**
     * Builds safe, segment-encoded URL from relative path
     * @param {string} relPath e.g. "asset game/team dream/Freya.jpg"
     * @returns {string} e.g. "asset%20game/team%20dream/Freya.jpg"
     */
    assetUrl(relPath) {
        if (!relPath) return '';
        if (relPath.startsWith('blob:') || relPath.startsWith('http://') || relPath.startsWith('https://')) {
            return relPath;
        }

        // Clean leading slashes and roots
        let clean = relPath.replace(/^(\.\/)?(models?\/)?/, '');

        // Check if git tree has exact case
        const mapped = this.gitTreeMap.get(clean.toLowerCase()) || clean;

        // Encode each segment to handle spaces cleanly
        const encoded = mapped.split('/').map(encodeURIComponent).join('/');
        return `${this.rootPath}/${encoded}`;
    }

    /**
     * Resolves hero GLB with 4-way auto-probe
     * @param {Object} hero 
     * @returns {Promise<string>}
     */
    async resolveHeroGlbUrl(hero) {
        if (!hero) return '';

        // Check user-uploaded local override first
        if (this.localGlbOverrides.has(hero.id)) {
            return this.localGlbOverrides.get(hero.id);
        }

        const teamShort = hero.team ? hero.team.replace('team_', '') : '';
        const capName = hero.name.charAt(0).toUpperCase() + hero.name.slice(1);
        const teamCap = teamShort.charAt(0).toUpperCase() + teamShort.slice(1);

        const candidates = [
            `${capName}${teamShort}.glb`,      // Christypassion.glb, Freyadream.glb
            `${hero.slug}${teamShort}.glb`,     // christypassion.glb, freyadream.glb
            `${capName}${teamCap}.glb`,       // ChristyPassion.glb, FreyaDream.glb
            `${hero.slug}.glb`,                 // christy.glb, freya.glb
            `${capName}.glb`                    // Christy.glb, Freya.glb
        ];

        // 1. Check in GitHub tree map first
        for (const cand of candidates) {
            // Check direct root
            const treeMatch = this.gitTreeMap.get(cand.toLowerCase()) || 
                              this.gitTreeMap.get(`models/${cand.toLowerCase()}`) ||
                              this.gitTreeMap.get(`model/${cand.toLowerCase()}`);
            if (treeMatch) {
                return this.assetUrl(treeMatch);
            }
        }

        // 2. Parallel HTTP HEAD probe
        for (const cand of candidates) {
            const url = `${this.rootPath}/${cand}`;
            try {
                const resp = await fetch(url, { method: 'HEAD' });
                if (resp.ok) return url;
            } catch (_) {}
        }

        // Fallback default
        return `${this.rootPath}/${candidates[0]}`;
    }

    /**
     * Registers a local GLB model file directly from user device
     * @param {string} heroId 
     * @param {File} file 
     * @returns {string} objectURL
     */
    registerLocalGlb(heroId, file) {
        const objectUrl = URL.createObjectURL(file);
        this.localGlbOverrides.set(heroId.toLowerCase(), objectUrl);
        console.log(`[AssetManager] Registered local GLB override for hero ${heroId}: ${objectUrl}`);
        return objectUrl;
    }

    /**
     * Loads GLB model with DRACO/Meshopt support
     * @param {string} url 
     * @param {Function} onProgress 
     * @returns {Promise<THREE.Group>}
     */
    loadGLTF(url, onProgress = null) {
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
                (err) => reject(err)
            );
        });
    }

    /**
     * Loads a texture with automatic sRGB color space for color maps
     * @param {string} url 
     * @param {boolean} isColorMap 
     * @returns {Promise<THREE.Texture>}
     */
    loadTexture(url, isColorMap = true) {
        if (this.textureCache.has(url)) {
            return Promise.resolve(this.textureCache.get(url));
        }

        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                url,
                (tex) => {
                    if (isColorMap) {
                        tex.colorSpace = THREE.SRGBColorSpace;
                    } else {
                        tex.colorSpace = THREE.NoColorSpace;
                    }
                    this.textureCache.set(url, tex);
                    resolve(tex);
                },
                undefined,
                (err) => reject(err)
            );
        });
    }

    /**
     * Thorough GPU memory cleaner (Anti-VRAM Leak)
     * @param {THREE.Object3D} root 
     * @param {THREE.WebGLRenderer} renderer 
     */
    disposeSceneTree(root, renderer = null) {
        if (!root) return;

        root.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }

                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    for (const mat of materials) {
                        // Dispose all texture properties
                        for (const key of Object.keys(mat)) {
                            const val = mat[key];
                            if (val && typeof val.dispose === 'function') {
                                val.dispose();
                                if (val.source && val.source.data && typeof val.source.data.close === 'function') {
                                    val.source.data.close(); // Close ImageBitmap
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
