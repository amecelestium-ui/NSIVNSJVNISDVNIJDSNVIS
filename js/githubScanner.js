/**
 * ONYXPURE — JKT48 3D Arena
 * js/githubScanner.js
 * 
 * Auto-detects GitHub repository or local environment, scans for hero .glb models,
 * weapons, and VFX assets via GitHub Trees API or parallel HTTP HEAD checks,
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

        // Check if running on github.io
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
 * Checks if a relative URL exists using HTTP HEAD request
 * @param {string} url 
 * @returns {Promise<boolean>}
 */
async function checkUrlExists(url) {
    try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        return res.ok;
    } catch {
        return false;
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

        // Variations: 'freya', 'freyadream', 'teamdream_freya', etc.
        if (
            cleanFileName === hSlug ||
            cleanFileName === hName ||
            cleanFileName === `${hSlug}${hTeam}` ||
            cleanFileName === `${hName}${hTeam}` ||
            cleanFileName === `${hTeam}${hSlug}` ||
            cleanFileName === `${hTeam}_${hSlug}` ||
            cleanFileName.startsWith(`${hSlug}_`) ||
            cleanFileName.startsWith(`${hName}_`)
        ) {
            return heroId;
        }
    }
    return null;
}

/**
 * Scans repository via GitHub Trees API with branch fallback (main -> master)
 * @param {string} owner 
 * @param {string} repo 
 * @returns {Promise<string[]>} List of .glb file paths
 */
async function fetchGitHubTree(owner, repo) {
    const branches = ['main', 'master'];
    for (const branch of branches) {
        try {
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
            const resp = await fetch(apiUrl, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });

            if (resp.status === 403) {
                console.warn('[Scanner] GitHub API rate limit hit (403), falling back to direct checks.');
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
            console.warn(`[Scanner] GitHub API fetch failed for branch ${branch}:`, err);
        }
    }
    return [];
}

/**
 * Scans for locally hosted models using parallel HTTP HEAD requests
 */
async function scanLocalFallbacks() {
    const checkPromises = [];

    for (const [heroId, hero] of Object.entries(ROSTER_DATA)) {
        const slug = hero.id;
        const nameSlug = normalizeSlug(hero.name);
        const teamSlug = normalizeSlug(hero.team);

        // Candidate paths for hero model
        const heroCandidates = [
            `./models/${slug}.glb`,
            `./models/${nameSlug}.glb`,
            `./models/${nameSlug}${teamSlug}.glb`,
            `./models/${teamSlug}/${nameSlug}.glb`,
            `./models/heroes/${slug}.glb`,
            `models/${slug}.glb`,
            `models/${nameSlug}.glb`,
            `models/${nameSlug}${teamSlug}.glb`
        ];

        // Candidate paths for weapon
        const weaponCandidates = [
            `./models/weapons/${slug}_weapon.glb`,
            `./models/weapons/${nameSlug}_weapon.glb`,
            `./models/weapons/${hero.team}/${slug}_weapon.glb`,
            `models/weapons/${slug}_weapon.glb`,
            `models/weapons/${nameSlug}_weapon.glb`
        ];

        // Candidate paths for vfx
        const vfxCandidates = [
            `./models/vfx/${slug}_skills_vfx.glb`,
            `./models/vfx/${nameSlug}_skills_vfx.glb`,
            `./models/vfx/${hero.team}/${slug}_skills_vfx.glb`,
            `models/vfx/${slug}_skills_vfx.glb`
        ];

        // Test hero candidate
        const p1 = (async () => {
            if (scannedAssets.heroes.has(heroId)) return;
            for (const url of heroCandidates) {
                if (await checkUrlExists(url)) {
                    scannedAssets.heroes.set(heroId, { heroGlbUrl: url, isLocal: true, fileName: `${slug}.glb` });
                    break;
                }
            }
        })();

        // Test weapon candidate
        const p2 = (async () => {
            if (scannedAssets.weapons.has(heroId)) return;
            for (const url of weaponCandidates) {
                if (await checkUrlExists(url)) {
                    scannedAssets.weapons.set(heroId, { weaponGlbUrl: url, isLocal: true });
                    break;
                }
            }
        })();

        // Test vfx candidate
        const p3 = (async () => {
            if (scannedAssets.vfx.has(heroId)) return;
            for (const url of vfxCandidates) {
                if (await checkUrlExists(url)) {
                    scannedAssets.vfx.set(heroId, { vfxGlbUrl: url, isLocal: true });
                    break;
                }
            }
        })();

        checkPromises.push(p1, p2, p3);
    }

    await Promise.allSettled(checkPromises);
}

/**
 * Main scan function
 * Scans GitHub repository trees first; if empty or offline, checks relative paths.
 * @param {Function} onProgress Optional progress callback (percent, message)
 * @returns {Promise<{ scannedCount: number, availableHeroes: string[] }>}
 */
export async function scanRepository(onProgress = null) {
    if (onProgress) onProgress(20, 'Detecting Repository & Environment...');
    const { owner, repo } = detectRepo();

    if (onProgress) onProgress(40, `Scanning GitHub Trees API (${owner}/${repo})...`);
    const glbPaths = await fetchGitHubTree(owner, repo);
    scannedAssets.remoteTreePaths = glbPaths;

    // Process GitHub API results if found
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

    if (onProgress) onProgress(75, 'Verifying Local & Cached GLB Models...');
    // Always run fallback checks to detect locally cloned or staged models
    await scanLocalFallbacks();

    if (onProgress) onProgress(100, `Found ${scannedAssets.heroes.size} 3D Ready Heroes!`);

    return {
        scannedCount: scannedAssets.heroes.size,
        availableHeroes: Array.from(scannedAssets.heroes.keys()),
        owner,
        repo
    };
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
