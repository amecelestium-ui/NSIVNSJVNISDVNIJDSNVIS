/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/config/constants.js
 * 
 * Master Engine Constants, System Profiles, Network Rules, and Arena Parameters.
 */

export const ENGINE_INFO = {
    NAME: 'ONYXPURE Engine',
    VERSION: '2.5.0-Release',
    BUILD_TARGET: 'GitHub Pages + Hugging Face Spaces'
};

// Network & Backend
export const NETWORK = {
    BACKEND_URL: 'https://shinezzzz-newkhonikonixpure.hf.space',
    WS_URL: 'wss://shinezzzz-newkhonikonixpure.hf.space',
    WS_PORT: 7860,
    HEARTBEAT_INTERVAL_MS: 25000,
    HEARTBEAT_TIMEOUT_MS: 75000,
    COLD_START_TIMEOUT_MS: 8000,
    RECONNECT_BASE_MS: 1000,
    RECONNECT_MAX_MS: 8000,
    ENTITY_INTERPOLATION_OFFSET_MS: 100,
    INPUT_PREDICTION_SMOOTHING: 0.22,
    SNAP_DISTANCE_METERS: 2.5
};
export const WS_URL = NETWORK.WS_URL;
export const BACKEND_URL = NETWORK.BACKEND_URL;

// Physics Simulation
export const PHYSICS = {
    FIXED_DT: 1 / 60,
    MAX_FRAME_DT: 0.05,
    GRAVITY: -22.0,
    JUMP_VELOCITY: 8.4,
    MAX_SLOPE_ANGLE_RAD: 35 * (Math.PI / 180),
    BASE_GROUND_ACCEL: 48.0,
    BASE_GROUND_DECEL: 38.0,
    BASE_AIR_ACCEL: 16.0,
    COLLISION_PUSH_RESOLVE: 0.85
};

// Combat Rules (MLBB Exact)
export const COMBAT_RULES = {
    MAX_LEVEL: 15,
    MAX_ITEMS: 6,
    MAX_ATTACK_SPEED: 3.0,
    MAX_CDR: 0.40,
    MIN_EFF_DEF: -60,
    BASE_CRIT_MULTIPLIER: 2.0,
    DEFENSE_CONSTANT: 120, // Formula: 120 / (120 + EffDEF)
    PASSIVE_GOLD_PER_SEC: 3,
    HERO_KILL_GOLD_BASE: 200,
    HERO_KILL_GOLD_MAX: 450,
    ASSIST_GOLD_RATIO: 0.50
};

// Camera Profiles
export const CAMERA_PROFILES = {
    GENSHIN: {
        id: 'genshin',
        name: '3D Action Third-Person',
        distance: 5.5,
        heightOffset: 1.65,
        fov: 54,
        minPitch: 0.12,
        maxPitch: 1.28,
        minDist: 3.0,
        maxDist: 18.0,
        orbitSpeed: 0.0032,
        zoomSpeed: 0.0015
    },
    MLBB: {
        id: 'mlbb',
        name: 'Tactical Isometric MOBA',
        pitch: 48 * (Math.PI / 180),
        distance: 16.5,
        heightOffset: 1.2,
        fov: 42,
        lookAheadFactor: 0.35,
        damping: 0.08
    }
};

// Arena Profiles & World Boundaries
export const WORLDS = {
    SANDBOX: {
        id: 'sandbox',
        name: 'Mega Terrarium & Open-World',
        size: 1920,
        bounds: { minX: -930, maxX: 930, minZ: -930, maxZ: 930 },
        domeRadius: 158,
        skybox: 'skybox_reia_golden_meadow.webp'
    },
    ARENA_COLOSSEUM: {
        id: 'arena_colosseum',
        name: 'Celestial Colosseum',
        radius: 106,
        lanes: 2,
        hasJungle: true,
        skybox: 'skybox_passion_horizon.webp',
        floorTexture: 'tex_marble_gold.png'
    },
    ARENA_OCEAN_BRIDGE: {
        id: 'arena_ocean_bridge',
        name: 'Grand Ocean Bridge',
        width: 44,
        length: 240,
        bounds: { minX: -114, maxX: 114, minZ: -20, maxZ: 20 },
        lanes: 1,
        hasJungle: false,
        skybox: 'skybox_sunset_ocean.webp',
        floorTexture: 'tex_bridge_stone.png'
    },
    ARENA_SKY_SAKURA: {
        id: 'arena_sky_sakura',
        name: 'Sky Sakura Sanctuary',
        radius: 96,
        lanes: 3,
        hasJungle: true,
        skybox: 'skybox_twilight_sakura.webp',
        floorTexture: 'tex_cobble.png'
    }
};

export const ARENA_BOUNDS = WORLDS;

// Graphics Presets
export const QUALITY_PRESETS = {
    LOW: {
        id: 'low',
        name: 'Battery Saver',
        shadows: false,
        shadowMapSize: 1024,
        dpr: 1.0,
        terrainSegments: 120,
        grassCount: 8000,
        flowerCount: 2000,
        bloom: false,
        msaaSamples: 0
    },
    MEDIUM: {
        id: 'medium',
        name: 'Balanced 60 FPS',
        shadows: true,
        shadowMapSize: 1024,
        dpr: window.devicePixelRatio > 1.5 ? 1.25 : 1.0,
        terrainSegments: 170,
        grassCount: 18000,
        flowerCount: 4500,
        bloom: true,
        msaaSamples: 2
    },
    HIGH: {
        id: 'high',
        name: 'Ultra High Definition',
        shadows: true,
        shadowMapSize: 2048,
        dpr: Math.min(2.0, window.devicePixelRatio || 1.5),
        terrainSegments: 220,
        grassCount: 36000,
        flowerCount: 9000,
        bloom: true,
        msaaSamples: 4
    }
};

// Objectives & Boss Timers
export const MOBA_TIMINGS = {
    MINION_FIRST_WAVE_SEC: 10,
    MINION_WAVE_INTERVAL_SEC: 30,
    MINION_GOLD_LANE_BONUS: 0.45,
    MINION_EXP_LANE_BONUS: 0.35,
    MINION_EARLY_WAVES_COUNT: 10,
    MINION_PROXIMITY_GOLD_SHARE: 0.80,
    
    TURRET_ENERGY_SHIELD_EXPIRE_SEC: 300, // 5 min
    TURRET_DAMAGE_BASE: 320,
    TURRET_DAMAGE_GROWTH_PER_MIN: 25,
    TURRET_ESCALATION_PER_HIT: 0.55,
    TURRET_MAX_ESCALATION_STACKS: 4,
    TURRET_NO_MINION_DR: 0.60,
    
    BOSS_GOLEM_SPAWN_SEC: 120, // 2:00
    BOSS_GOLEM_RESPAWN_SEC: 180,
    BOSS_DRAGON_SPAWN_SEC: 480, // 8:00
    BOSS_DRAGON_RESPAWN_SEC: 240
};
