/**
 * ONYXPURE — JKT48 3D Arena
 * js/githubScanner.js
 * 
 * Auto-detects GitHub repository or local environment, scans for hero .glb models,
 * weapons, and VFX assets with fast timeout protection,
 * and supports custom user drag-and-drop / file input local upload testing.
 */

import { ROSTER_DATA } from './rosterData.js';

// Cache for detected assets
const scannedAssets = {
    heroes: new Map(),   // heroId -> { heroGlbUrl, isLocal: boolean, fileName: string }
    weapons: new Map(),  // heroId -> { weaponGlbUrl, isLocal: boolean }
    vfx: new Map(),      // heroId -> { vfxGlbUrl, isLocal: boolean }
    remoteTreePaths: []  // List of raw paths from GitHub tree
};

// Pre-register known local models so they are immediately available offline
const KNOWN_DEFAULT_MODELS = [
    { heroId: 'chelsea', url: './models/chelsea.glb', isWeapon: false },
    { heroId: 'chelsea', url: './models/weapons/chelsea_weapon.glb', isWeapon: true },
    { heroId: 'freya', url: './models/freyadream.glb', isWeapon: false },
    { heroId: 'christy', url: './models/christypassion.glb', isWeapon: false },
    { heroId: 'delynn', url: './models/delynn.glb', isWeapon: false }
];

for (const m of KNOWN_DEFAULT_MODELS) {
    if (m.isWeapon) {
        scannedAssets.weapons.set(m.heroId, { weaponGlbUrl: m.url, isLocal: true });
    } else {
        scannedAssets.heroes.set(m.heroId, { heroGlbUrl: m.url, isLocal: true, fileName: m.url.split('/').pop() });
    }
}

/**
 * Normalizes name strings for fuzzy matching
 * @param {string} str 
 * @returns {string}
 */
export function normalizeSlug(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Detects GitHub owner & repository name from window location
 * Defaults to 'ashazeneca-cyber' and 'skunvfucjsdheocjs'
 */
export function detectRepo() {
    let owner = 'ashazeneca-cyber';
    let repo = 'skunvfucjsdheocjs';

    try {
        const hostname = window.location.hostname || '';
        const pathname = window.location.pathname || '';

        if (hostname.endsWith('.github.io')) {
            const hostUser = hostname.split('.')[0];
            if (hostUser) owner = hostUser;

            const pathSegments = pathname.split('/').filter(Boolean);
            if (pathSegments.length > 0) {
                repo = pathSegments[0];
            }
        }
    } catch (e) {
        console.warn('[Scanner] Unable to parse window.location, using default repo:', e);
    }

    return { owner, repo };
}

/**
 * Fetches URL with a strict timeout to prevent hangs
 * @param {string} url 
 * @param {number} timeoutMs 
 * @param {Object} options 
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, timeoutMs = 2500, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timer);
        return response;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

/**
 * Matches a filename against known heroes
 * @param {string} filePath 
 * @returns {string|null} heroId
 */
function findMatchingHeroId(filePath) {
    const cleanPath = filePath.toLowerCase().replace(/\\/g, '/');
    const fileName = cleanPath.split('/').pop().replace(/\.glb$/, '');
    const cleanFileName = normalizeSlug(fileName);

    for (const [heroId, hero] of Object.entries(ROSTER_DATA)) {
        const hSlug = normalizeSlug(hero.id);
        const hName = normalizeSlug(hero.name);
        const hTeam = normalizeSlug(hero.team);

        if (
            cleanFileName === hSlug ||
            cleanFileName === hName ||
            cleanFileName === `${hSlug}${hTeam}` ||
            cleanFileName === `${hName}${hTeam}` ||
            cleanFileName === `${hTeam}${hSlug}` ||
            cleanFileName.startsWith(`${hSlug}_`) ||
            cleanFileName.startsWith(`${hName}_`) ||
            cleanFileName.startsWith(`${hSlug}-`) ||
            cleanFileName.startsWith(`${hName}-`)
        ) {
            return heroId;
        }
    }
    return null;
}

/**
 * Scans repository via GitHub Trees API with branch fallback (main -> master)
 * Max timeout: 2500ms
 * @param {string} owner 
 * @param {string} repo 
 * @returns {Promise<string[]>} List of .glb file paths
 */
async function fetchGitHubTree(owner, repo) {
    const branches = ['main', 'master'];
    for (const branch of branches) {
        try {
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
            const resp = await fetchWithTimeout(apiUrl, 2500, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });

            if (resp.status === 403) {
                console.warn('[Scanner] GitHub API rate limit hit (403), using cached/local list.');
                return [];
            }

            if (!resp.ok) continue;

            const data = await resp.json();
            if (data && Array.isArray(data.tree)) {
                return data.tree
                    .filter(node => node.type === 'blob' && node.path.toLowerCase().endsWith('.glb'))
                    .map(node => node.path);
            }
        } catch (err) {
            console.warn(`[Scanner] GitHub API fetch notice (${branch}):`, err.message);
        }
    }
    return [];
}

/**
 * Checks if a candidate URL exists with a strict 400ms timeout
 * @param {string} url 
 * @returns {Promise<boolean>}
 */
async function checkUrlFast(url) {
    try {
        const res = await fetchWithTimeout(url, 400, { method: 'HEAD', cache: 'no-cache' });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Fast targeted scan for local candidate models
 */
async function scanLocalFallbacksFast() {
    // Only check candidate paths for heroes that don't already have a model
    const heroesToCheck = Object.entries(ROSTER_DATA)
        .filter(([heroId]) => !scannedAssets.heroes.has(heroId))
        .slice(0, 15); // limit to first batch to guarantee zero delay

    const tasks = heroesToCheck.map(async ([heroId, hero]) => {
        const slug = hero.id;
        const candidates = [
            `./models/${slug}.glb`,
            `./models/${slug}${normalizeSlug(hero.team)}.glb`
        ];

        for (const url of candidates) {
            if (await checkUrlFast(url)) {
                scannedAssets.heroes.set(heroId, {
                    heroGlbUrl: url,
                    isLocal: true,
                    fileName: `${slug}.glb`
                });
                break;
            }
        }
    });

    await Promise.allSettled(tasks);
}

/**
 * Main scan function with fail-safe maximum execution time (max 1.5 seconds)
 * @param {Function} onProgress Optional progress callback (percent, message)
 * @returns {Promise<{ scannedCount: number, availableHeroes: string[] }>}
 */
export async function scanRepository(onProgress = null) {
    const scanPromise = (async () => {
        if (onProgress) onProgress(20, 'Detecting Repository & Environment...');
        const { owner, repo } = detectRepo();

        if (onProgress) onProgress(45, `Scanning Repository Assets (${owner}/${repo})...`);
        const glbPaths = await fetchGitHubTree(owner, repo);
        scannedAssets.remoteTreePaths = glbPaths;

        if (glbPaths.length > 0) {
            for (const filePath of glbPaths) {
                const clean = filePath.toLowerCase();
                const matchedHeroId = findMatchingHeroId(filePath);

                if (matchedHeroId) {
                    if (clean.includes('weapon') || clean.includes('_wp')) {
                        scannedAssets.weapons.set(matchedHeroId, {
                            weaponGlbUrl: `./${filePath}`,
                            isLocal: false
                        });
                    } else if (clean.includes('vfx') || clean.includes('skill')) {
                        scannedAssets.vfx.set(matchedHeroId, {
                            vfxGlbUrl: `./${filePath}`,
                            isLocal: false
                        });
                    } else {
                        scannedAssets.heroes.set(matchedHeroId, {
                            heroGlbUrl: `./${filePath}`,
                            isLocal: false,
                            fileName: filePath.split('/').pop()
                        });
                    }
                }
            }
        }

        if (onProgress) onProgress(80, 'Finalizing Available 3D Heroes...');
        await scanLocalFallbacksFast();

        if (onProgress) onProgress(100, `Found ${scannedAssets.heroes.size} 3D Ready Heroes!`);

        return {
            scannedCount: scannedAssets.heroes.size,
            availableHeroes: Array.from(scannedAssets.heroes.keys()),
            owner,
            repo
        };
    })();

    // Hard fail-safe: never block loading for more than 1800ms
    const timeoutPromise = new Promise(resolve => {
        setTimeout(() => {
            resolve({
                scannedCount: scannedAssets.heroes.size,
                availableHeroes: Array.from(scannedAssets.heroes.keys()),
                owner: 'ashazeneca-cyber',
                repo: 'skunvfucjsdheocjs'
            });
        }, 1800);
    });

    return Promise.race([scanPromise, timeoutPromise]);
}

/**
 * Returns available asset URLs for a hero
 * @param {string} heroId 
 * @returns {{ heroGlbUrl: string|null, weaponGlbUrl: string|null, vfxGlbUrl: string|null, isReady: boolean }}
 */
export function getHeroModelUrls(heroId) {
    const heroEntry = scannedAssets.heroes.get(heroId);
    const weaponEntry = scannedAssets.weapons.get(heroId);
    const vfxEntry = scannedAssets.vfx.get(heroId);

    return {
        heroGlbUrl: heroEntry ? heroEntry.heroGlbUrl : null,
        weaponGlbUrl: weaponEntry ? weaponEntry.weaponGlbUrl : null,
        vfxGlbUrl: vfxEntry ? vfxEntry.vfxGlbUrl : null,
        isReady: Boolean(heroEntry)
    };
}

/**
 * Checks whether a hero has an available .glb model
 * @param {string} heroId 
 * @returns {boolean}
 */
export function hasGlb(heroId) {
    return scannedAssets.heroes.has(heroId);
}

/**
 * Registers a locally selected or dropped GLB file for a hero
 * @param {string} heroId 
 * @param {File} file 
 * @param {'hero'|'weapon'|'vfx'} assetType 
 * @returns {string} Object URL for Three.js GLTFLoader
 */
export function registerLocalGlb(heroId, file, assetType = 'hero') {
    const blobUrl = URL.createObjectURL(file);
    if (assetType === 'weapon') {
        scannedAssets.weapons.set(heroId, {
            weaponGlbUrl: blobUrl,
            isLocal: true,
            fileName: file.name
        });
    } else if (assetType === 'vfx') {
        scannedAssets.vfx.set(heroId, {
            vfxGlbUrl: blobUrl,
            isLocal: true,
            fileName: file.name
        });
    } else {
        scannedAssets.heroes.set(heroId, {
            heroGlbUrl: blobUrl,
            isLocal: true,
            fileName: file.name
        });
    }

    console.log(`[Scanner] Registered local ${assetType} for ${heroId}: ${file.name} (${blobUrl})`);
    return blobUrl;
}

/**
 * Returns read-only snapshot of current scanner cache
 */
export function getScannedCache() {
    return {
        heroes: new Map(scannedAssets.heroes),
        weapons: new Map(scannedAssets.weapons),
        vfx: new Map(scannedAssets.vfx)
    };
}
