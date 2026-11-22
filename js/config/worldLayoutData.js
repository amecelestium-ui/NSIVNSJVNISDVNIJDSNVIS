/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/config/worldLayoutData.js
 * 
 * Exact 100% (64/64) Spatial Placement Mapping for world_props_3d/*.glb:
 * - Terrarium Central Hub (22 models)
 * - South Sunlit Meadows (14 models)
 * - East Azure Harbor (5 models)
 * - West Sakura Forest (5 models)
 * - North Crystal Canyon (5 models)
 * - 3 MOBA Arenas: Colosseum, Ocean Bridge, Sky Sakura (13 models)
 * - 8 Fast Travel Waypoint Coordinates
 */

export const FAST_TRAVEL_WAYPOINTS = [
    { id: 'plaza', name: 'Central Plaza (Titik Temu)', x: 0, z: 0, icon: 'ui_mega_pack/system/icon_home.webp' },
    { id: 'cafe', name: 'Onyx Botanical Cafe', x: 78, z: -4, icon: 'ui_mega_pack/economy/chest_common.webp' },
    { id: 'village', name: 'Desa Terarium & Kincir', x: -86, z: 0, icon: 'ui_mega_pack/system/icon_quest.webp' },
    { id: 'aquifer', name: 'Crystal Aquifer Shrine', x: 0, z: -84, icon: 'ui_mega_pack/spells/spell_revitalize.webp' },
    { id: 'south_gate', name: 'Gerbang Selatan Terarium', x: 0, z: 158, icon: 'ui_mega_pack/system/icon_teleport.webp' },
    { id: 'windrise', name: 'Pohon Kuno Windrise', x: 0, z: 440, icon: 'ui_mega_pack/system/icon_teleport.webp' },
    { id: 'east_harbor', name: 'Pelabuhan Azure Timur', x: 540, z: 0, icon: 'ui_mega_pack/system/icon_teleport.webp' },
    { id: 'west_pagoda', name: 'Pagoda Sakura Barat', x: -760, z: 0, icon: 'ui_mega_pack/system/icon_teleport.webp' }
];

export const WORLD_PROPS_LAYOUT = [
    // =========================================================================
    // 1. TERARIUM LOBBY & PUSAT SANDBOX (22 Model 3D)
    // =========================================================================
    {
        model: 'terrarium_conservatory_dome',
        x: 0, z: 0, scale: 1.0, rotY: 0,
        collisionRadius: 158, isDome: true, zone: 'terrarium'
    },
    {
        model: 'hero_marble_pedestal',
        x: 0, z: 0, scale: 1.15, rotY: 0,
        collisionRadius: 4.2, zone: 'terrarium'
    },
    {
        model: 'healing_sanctuary_fountain',
        x: 0, z: -24, scale: 1.0, rotY: 0,
        collisionRadius: 3.5, interactive: 'fountain', zone: 'terrarium'
    },
    {
        model: 'statue_of_onyx_goddess',
        x: 0, z: 32, scale: 1.25, rotY: Math.PI,
        collisionRadius: 3.8, interactive: 'statue_goddess', zone: 'terrarium'
    },
    {
        model: 'fantasy_streetlamp',
        x: 18, z: 18, scale: 0.95, rotY: 0,
        collisionRadius: 0.6, hasLight: true, zone: 'terrarium'
    },
    {
        model: 'fantasy_streetlamp',
        x: -18, z: 18, scale: 0.95, rotY: 0,
        collisionRadius: 0.6, hasLight: true, zone: 'terrarium'
    },
    {
        model: 'fantasy_streetlamp',
        x: 18, z: -18, scale: 0.95, rotY: 0,
        collisionRadius: 0.6, hasLight: true, zone: 'terrarium'
    },
    {
        model: 'fantasy_streetlamp',
        x: -18, z: -18, scale: 0.95, rotY: 0,
        collisionRadius: 0.6, hasLight: true, zone: 'terrarium'
    },
    {
        model: 'cozy_garden_bench',
        x: 14, z: 8, scale: 1.0, rotY: Math.PI / 4,
        collisionRadius: 1.2, zone: 'terrarium'
    },
    {
        model: 'cozy_garden_bench',
        x: -14, z: 8, scale: 1.0, rotY: -Math.PI / 4,
        collisionRadius: 1.2, zone: 'terrarium'
    },
    {
        model: 'onyx_botanical_cafe',
        x: 78, z: -4, scale: 1.1, rotY: -Math.PI / 6,
        collisionRadius: 14.5, isBuilding: true, zone: 'cafe'
    },
    {
        model: 'cafe_bistro_umbrella_set',
        x: 64, z: -14, scale: 1.0, rotY: 0.3,
        collisionRadius: 2.2, zone: 'cafe'
    },
    {
        model: 'cafe_bistro_umbrella_set',
        x: 68, z: 6, scale: 1.0, rotY: -0.2,
        collisionRadius: 2.2, zone: 'cafe'
    },
    {
        model: 'cafe_patisserie_stand',
        x: 88, z: 10, scale: 1.0, rotY: -Math.PI / 2,
        collisionRadius: 2.5, interactive: 'shop_stall', zone: 'cafe'
    },
    {
        model: 'village_cottage_a',
        x: -86, z: 16, scale: 1.0, rotY: Math.PI / 8,
        collisionRadius: 6.5, isBuilding: true, zone: 'village'
    },
    {
        model: 'village_cottage_b',
        x: -82, z: -22, scale: 1.0, rotY: -Math.PI / 6,
        collisionRadius: 6.8, isBuilding: true, zone: 'village'
    },
    {
        model: 'mondstadt_windmill',
        x: -96, z: -36, scale: 1.15, rotY: 0,
        collisionRadius: 7.5, isAnimatedWindmill: true, zone: 'village'
    },
    {
        model: 'village_wishing_well',
        x: -72, z: -2, scale: 1.0, rotY: 0,
        collisionRadius: 2.4, interactive: 'wishing_well', zone: 'village'
    },
    {
        model: 'flower_cart_merchant',
        x: -64, z: 10, scale: 1.0, rotY: Math.PI / 3,
        collisionRadius: 1.8, zone: 'village'
    },
    {
        model: 'wooden_direction_signpost',
        x: 0, z: 45, scale: 1.0, rotY: 0,
        collisionRadius: 0.5, interactive: 'signpost', zone: 'terrarium'
    },
    {
        model: 'wooden_fence_section',
        x: -54, z: -18, scale: 1.0, rotY: Math.PI / 2,
        collisionRadius: 1.5, zone: 'village'
    },
    {
        model: 'crystal_aquifer_shrine',
        x: 0, z: -84, scale: 1.2, rotY: 0,
        collisionRadius: 12.0, hasWaterLake: true, zone: 'aquifer'
    },
    {
        model: 'ornate_stone_arch_bridge',
        x: 0, z: -58, scale: 1.0, rotY: 0,
        collisionRadius: 4.5, isBridge: true, zone: 'aquifer'
    },
    {
        model: 'tree_weeping_willow_glow',
        x: -22, z: -78, scale: 1.1, rotY: 0.5,
        collisionRadius: 2.8, hasBioluminescence: true, zone: 'aquifer'
    },
    {
        model: 'giant_glowing_mushroom_pack',
        x: 20, z: -82, scale: 1.0, rotY: -0.4,
        collisionRadius: 2.0, hasBioluminescence: true, zone: 'aquifer'
    },
    {
        model: 'ambient_crystal_butterfly',
        x: 0, z: -70, scale: 1.0, rotY: 0,
        isFlockingCreature: true, count: 12, zone: 'aquifer'
    },
    {
        model: 'npc_spirit_fairy_seelie',
        x: -16, z: 24, scale: 1.0, rotY: 0,
        interactive: 'seelie_guide', guideTarget: { x: -35, z: 65 }, zone: 'terrarium'
    },

    // =========================================================================
    // 2. BIOMA SELATAN: PADANG ONYXPURE (14 Model 3D)
    // =========================================================================
    {
        model: 'tree_ancient_great_windrise',
        x: 0, z: 440, scale: 1.6, rotY: 0.2,
        collisionRadius: 9.5, isGreatTree: true, zone: 'south_meadow'
    },
    {
        model: 'tree_reia_sunlit_birch',
        x: -45, z: 280, scale: 1.0, rotY: 0.8,
        collisionRadius: 1.8, zone: 'south_meadow'
    },
    {
        model: 'tree_reia_sunlit_birch',
        x: 62, z: 320, scale: 1.1, rotY: -0.5,
        collisionRadius: 1.8, zone: 'south_meadow'
    },
    {
        model: 'giant_emerald_oak_tree',
        x: -120, z: 360, scale: 1.25, rotY: 0.4,
        collisionRadius: 3.2, zone: 'south_meadow'
    },
    {
        model: 'windmill_waterwheel_mill',
        x: 95, z: 260, scale: 1.1, rotY: -Math.PI / 4,
        collisionRadius: 6.2, zone: 'south_meadow'
    },
    {
        model: 'bridge_wooden_country',
        x: 75, z: 235, scale: 1.0, rotY: Math.PI / 3,
        collisionRadius: 3.0, isBridge: true, zone: 'south_meadow'
    },
    {
        model: 'camping_tent_bonfire_set',
        x: 160, z: 310, scale: 1.0, rotY: 0.6,
        collisionRadius: 4.0, hasCampfireLight: true, zone: 'south_meadow'
    },
    {
        model: 'ancient_ruin_stone_gazebo',
        x: -180, z: 360, scale: 1.15, rotY: 0,
        collisionRadius: 5.5, zone: 'south_meadow'
    },
    {
        model: 'mossy_boulder_cluster_a',
        x: -60, z: 210, scale: 1.2, rotY: 1.2,
        collisionRadius: 3.5, zone: 'south_meadow'
    },
    {
        model: 'mossy_cliff_archway',
        x: 0, z: 158, scale: 1.25, rotY: 0,
        collisionRadius: 5.0, isArchway: true, zone: 'south_meadow'
    },
    {
        model: 'ambient_meadow_slime_dream',
        x: -70, z: 260, scale: 1.0, rotY: 0,
        interactive: 'slime_dummy', team: 'dream', hp: 800, zone: 'south_meadow'
    },
    {
        model: 'ambient_meadow_slime_love',
        x: 80, z: 360, scale: 1.0, rotY: 0,
        interactive: 'slime_dummy', team: 'love', hp: 800, zone: 'south_meadow'
    },
    {
        model: 'ambient_meadow_slime_passion',
        x: 30, z: 490, scale: 1.0, rotY: 0,
        interactive: 'slime_dummy', team: 'passion', hp: 800, zone: 'south_meadow'
    },
    {
        model: 'fantasy_treasure_chest',
        x: -180, z: 360, scale: 1.0, rotY: 0.4,
        interactive: 'treasure_chest', chestId: 'chest_gazebo', zone: 'south_meadow'
    },
    {
        model: 'teleport_waypoint_statue',
        x: 0, z: 420, scale: 1.0, rotY: 0,
        interactive: 'waypoint', waypointId: 'windrise', zone: 'south_meadow'
    },

    // =========================================================================
    // 3. BIOMA TIMUR: PELABUHAN AZURE (5 Model 3D)
    // =========================================================================
    {
        model: 'harbor_lighthouse',
        x: 530, z: 120, scale: 1.3, rotY: -Math.PI / 4,
        collisionRadius: 8.5, hasRotatingLight: true, zone: 'east_harbor'
    },
    {
        model: 'fantasy_sailing_galleon',
        x: 690, z: -80, scale: 1.25, rotY: 0.35,
        collisionRadius: 18.0, isBuoyantShip: true, zone: 'east_harbor'
    },
    {
        model: 'dock_wooden_rowboat',
        x: 520, z: -35, scale: 1.0, rotY: -0.6,
        collisionRadius: 2.5, isBuoyantBoat: true, zone: 'east_harbor'
    },
    {
        model: 'wooden_barrel_crate_stack',
        x: 540, z: 15, scale: 1.0, rotY: 0.8,
        collisionRadius: 2.2, zone: 'east_harbor'
    },
    {
        model: 'tree_pine_cypress_tall',
        x: 480, z: 60, scale: 1.2, rotY: 0,
        collisionRadius: 2.0, zone: 'east_harbor'
    },

    // =========================================================================
    // 4. BIOMA BARAT: HUTAN SAKURA (5 Model 3D)
    // =========================================================================
    {
        model: 'inazuma_torii_gate',
        x: -320, z: 0, scale: 1.2, rotY: Math.PI / 2,
        collisionRadius: 4.2, isTorii: true, zone: 'west_sakura'
    },
    {
        model: 'sakura_pagoda_tower',
        x: -760, z: 0, scale: 1.4, rotY: 0,
        collisionRadius: 16.0, isPagoda: true, zone: 'west_sakura'
    },
    {
        model: 'giant_sakura_tree',
        x: -540, z: -60, scale: 1.35, rotY: 0.7,
        collisionRadius: 5.5, hasFallingPetals: true, zone: 'west_sakura'
    },
    {
        model: 'stone_garden_lantern_inazuma',
        x: -420, z: 20, scale: 1.0, rotY: 0,
        collisionRadius: 1.0, hasLanternLight: true, zone: 'west_sakura'
    },
    {
        model: 'tree_golden_ginkgo_liyue',
        x: -640, z: 80, scale: 1.25, rotY: -0.5,
        collisionRadius: 3.5, zone: 'west_sakura'
    },

    // =========================================================================
    // 5. BIOMA UTARA: NGARAI KRISTAL (5 Model 3D)
    // =========================================================================
    {
        model: 'liyue_rock_spire',
        x: -120, z: -460, scale: 1.5, rotY: 0.3,
        collisionRadius: 12.0, zone: 'north_canyon'
    },
    {
        model: 'floating_sky_island',
        x: 0, z: -580, scale: 1.3, rotY: 0, yOffset: 95,
        collisionRadius: 22.0, isFloatingIsland: true, zone: 'north_canyon'
    },
    {
        model: 'ancient_ruin_broken_pillar',
        x: 70, z: -480, scale: 1.1, rotY: 1.1,
        collisionRadius: 2.8, zone: 'north_canyon'
    },
    {
        model: 'crystal_cluster_prop',
        x: -40, z: -520, scale: 1.2, rotY: 0,
        collisionRadius: 3.2, hasCrystalGlow: true, zone: 'north_canyon'
    },
    {
        model: 'world_boss_phoenix_guardian',
        x: 0, z: -560, scale: 1.5, rotY: Math.PI,
        collisionRadius: 8.5, isWorldBoss: true, maxHp: 45000, zone: 'north_canyon'
    },

    // =========================================================================
    // 6. TIGA VARIASI ARENA MOBA (13 Model 3D)
    // =========================================================================
    {
        model: 'colosseum_grand_arch',
        x: 0, z: 0, scale: 1.0, rotY: 0,
        zone: 'arena_colosseum'
    },
    {
        model: 'ocean_bridge_gate_tower',
        x: -114, z: 0, scale: 1.0, rotY: 0,
        zone: 'arena_ocean_bridge'
    },
    {
        model: 'sky_sanctuary_altar',
        x: 0, z: 0, scale: 1.0, rotY: 0,
        zone: 'arena_sky_sakura'
    },
    {
        model: 'turret_team_dream',
        x: -35, z: 35, scale: 1.0, rotY: 0,
        isTurret: true, team: 'team_dream', hp: 5500, zone: 'arena_all'
    },
    {
        model: 'turret_team_love',
        x: 35, z: -35, scale: 1.0, rotY: 0,
        isTurret: true, team: 'team_love', hp: 5500, zone: 'arena_all'
    },
    {
        model: 'turret_team_passion',
        x: 0, z: 50, scale: 1.0, rotY: 0,
        isTurret: true, team: 'team_passion', hp: 5500, zone: 'arena_all'
    },
    {
        model: 'nexus_core_dream',
        x: -70, z: 70, scale: 1.2, rotY: 0,
        isNexus: true, team: 'team_dream', hp: 12000, zone: 'arena_all'
    },
    {
        model: 'nexus_core_love',
        x: 70, z: -70, scale: 1.2, rotY: 0,
        isNexus: true, team: 'team_love', hp: 12000, zone: 'arena_all'
    },
    {
        model: 'nexus_core_passion',
        x: 0, z: 85, scale: 1.2, rotY: 0,
        isNexus: true, team: 'team_passion', hp: 12000, zone: 'arena_all'
    },
    {
        model: 'minion_melee_knight',
        x: 0, z: 0, scale: 0.85, rotY: 0,
        isMinionTemplate: true, type: 'melee', zone: 'arena_all'
    },
    {
        model: 'minion_ranged_mage',
        x: 0, z: 0, scale: 0.85, rotY: 0,
        isMinionTemplate: true, type: 'ranged', zone: 'arena_all'
    },
    {
        model: 'boss_crystal_golem',
        x: -28, z: 0, scale: 1.2, rotY: Math.PI / 2,
        isBoss: true, bossId: 'golem', maxHp: 14000, zone: 'arena_colosseum'
    },
    {
        model: 'boss_celestial_dragon',
        x: 28, z: 0, scale: 1.4, rotY: -Math.PI / 2,
        isBoss: true, bossId: 'dragon', maxHp: 32000, zone: 'arena_colosseum'
    }
];

export function getPropsForZone(zone) {
    return WORLD_PROPS_LAYOUT.filter(p => p.zone === zone || p.zone === 'arena_all');
}
