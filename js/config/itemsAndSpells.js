/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/config/itemsAndSpells.js
 * 
 * 24 Shop Items, 8 Battle Spells, 9 Rank Tiers, EXP Progression Curve, and Gacha Chest Loot Tables.
 */

export const SHOP_ITEMS = [
    // ==========================================
    // PHYSICAL ITEMS (6)
    // ==========================================
    {
        id: 'item_phys_01_blade',
        name: 'Lunar Silver Blade',
        category: 'physical',
        cost: 1950,
        icon: 'ui_mega_pack/items/item_phys_01_blade.webp',
        stats: { patk: 65, physLifesteal: 0.10, attackSpeed: 0.15 },
        description: '+65 Physical ATK, +10% Physical Lifesteal, +15% Attack Speed.'
    },
    {
        id: 'item_phys_02_greatsword',
        name: 'Solaris Molten Greatsword',
        category: 'physical',
        cost: 3010,
        icon: 'ui_mega_pack/items/item_phys_02_greatsword.webp',
        stats: { patk: 155, moveSpeedPct: 0.05 },
        passive: { name: 'Despair Surge', desc: '+25% Physical ATK saat menyerang musuh dengan HP di bawah 50%.' },
        description: '+155 Physical ATK, +5% Movement Speed. Pasif: +25% ATK vs target <50% HP.'
    },
    {
        id: 'item_phys_03_bow',
        name: 'Phantom Wind Longbow',
        category: 'physical',
        cost: 2120,
        icon: 'ui_mega_pack/items/item_phys_03_bow.webp',
        stats: { patk: 55, critChance: 0.25, attackSpeed: 0.35, extraCritDmg: 0.40 },
        description: '+55 Physical ATK, +25% Crit Chance, +35% Attack Speed, +40% Extra Crit DMG.'
    },
    {
        id: 'item_phys_04_spear',
        name: 'Sovereign Halberd',
        category: 'physical',
        cost: 2060,
        icon: 'ui_mega_pack/items/item_phys_04_spear.webp',
        stats: { patk: 60, pctPhysPen: 0.35 },
        passive: { name: 'Armor Breaker', desc: 'Mendapat tambahan +0.1% Physical PEN per 1 poin Physical DEF musuh.' },
        description: '+60 Physical ATK, +35% Physical PEN. Pasif: Scaling PEN per DEF musuh.'
    },
    {
        id: 'item_phys_05_scythe',
        name: 'Crimson Vampiric Scythe',
        category: 'physical',
        cost: 2250,
        icon: 'ui_mega_pack/items/item_phys_05_scythe.webp',
        stats: { patk: 70, physLifesteal: 0.20, cdr: 0.10, critChance: 0.25 },
        description: '+70 Physical ATK, +20% Physical Lifesteal, +10% CDR, +25% Crit Chance.'
    },
    {
        id: 'item_phys_06_dagger',
        name: 'Volt Twin Daggers',
        category: 'physical',
        cost: 1870,
        icon: 'ui_mega_pack/items/item_phys_06_dagger.webp',
        stats: { attackSpeed: 0.40, critChance: 0.20, moveSpeedPct: 0.10 },
        passive: { name: 'Lightning Chain', desc: 'Setiap 3 serangan dasar melepaskan petir rantai 150 Magic DMG ke 3 musuh.' },
        description: '+40% Attack Speed, +20% Crit Chance, +10% Movement Speed. Pasif: Petir Rantai.'
    },

    // ==========================================
    // MAGIC ITEMS (6)
    // ==========================================
    {
        id: 'item_mag_01_staff',
        name: 'Celestial Archmage Staff',
        category: 'magic',
        cost: 3000,
        icon: 'ui_mega_pack/items/item_mag_01_staff.webp',
        stats: { matk: 120 },
        passive: { name: 'Arcane Mastery', desc: 'Meningkatkan Total Magic ATK hero sebesar +35%.' },
        description: '+120 Magic ATK. Pasif: +35% Total Magic ATK Amplification.'
    },
    {
        id: 'item_mag_02_grimoire',
        name: 'Arcane Blood Grimoire',
        category: 'magic',
        cost: 2350,
        icon: 'ui_mega_pack/items/item_mag_02_grimoire.webp',
        stats: { matk: 95, cdr: 0.20, maxHp: 500, spellVamp: 0.10 },
        description: '+95 Magic ATK, +20% CDR, +500 HP, +10% Spell Vamp.'
    },
    {
        id: 'item_mag_03_orb',
        name: 'Starlight Mana Orb',
        category: 'magic',
        cost: 1980,
        icon: 'ui_mega_pack/items/item_mag_03_orb.webp',
        stats: { matk: 75, maxMp: 600, cdr: 0.10 },
        passive: { name: 'Starlight Accumulation', desc: 'Mendapat +5 Magic ATK permanen setiap menit pertandingan.' },
        description: '+75 Magic ATK, +600 MP, +10% CDR. Pasif: +5 Magic ATK tiap menit.'
    },
    {
        id: 'item_mag_04_wand',
        name: 'Magenta Piercing Wand',
        category: 'magic',
        cost: 2050,
        icon: 'ui_mega_pack/items/item_mag_04_wand.webp',
        stats: { matk: 75, pctMagPen: 0.35, flatMagPen: 15 },
        description: '+75 Magic ATK, +35% Magic PEN, +15 Flat Magic PEN.'
    },
    {
        id: 'item_mag_05_frost',
        name: 'Glacier Frost Scepter',
        category: 'magic',
        cost: 2240,
        icon: 'ui_mega_pack/items/item_mag_05_frost.webp',
        stats: { matk: 75, spellVamp: 0.10, maxHp: 300 },
        passive: { name: 'Frostbite', desc: 'Skill yang mengenai musuh memberi efek Slow 25% selama 2.0 detik.' },
        description: '+75 Magic ATK, +10% Spell Vamp, +300 HP. Pasif: Skill memberi Slow 25%.'
    },
    {
        id: 'item_mag_06_chalice',
        name: 'Golden Mana Chalice',
        category: 'magic',
        cost: 1950,
        icon: 'ui_mega_pack/items/item_mag_06_chalice.webp',
        stats: { matk: 55, cdr: 0.20, mpRegen: 25 },
        passive: { name: 'Spirit Harvest', desc: 'Memulihkan 15% Max Mana saat mengeliminasi atau mendapat assist.' },
        description: '+55 Magic ATK, +20% CDR, +25 MP/detik. Pasif: Pulih 15% MP saat K/A.'
    },

    // ==========================================
    // DEFENSE ITEMS (6)
    // ==========================================
    {
        id: 'item_def_01_armor',
        name: 'Paladin Aegis Plate',
        category: 'defense',
        cost: 2170,
        icon: 'ui_mega_pack/items/item_def_01_armor.webp',
        stats: { pdef: 90, maxHp: 920, critDmgReduction: 0.20 },
        description: '+90 Physical DEF, +920 HP, -20% Critical Damage yang diterima.'
    },
    {
        id: 'item_def_02_cloak',
        name: 'Violet Rune Mantle',
        category: 'defense',
        cost: 2150,
        icon: 'ui_mega_pack/items/item_def_02_cloak.webp',
        stats: { mdef: 62, maxHp: 900 },
        passive: { name: 'Runic Ward', desc: 'Saat terkena Magic DMG, kurangi Magic DMG berikutnya sebesar 25% selama 3s.' },
        description: '+62 Magic DEF, +900 HP. Pasif: 25% Magic Damage Reduction saat terkena magic.'
    },
    {
        id: 'item_def_03_immortal',
        name: 'Angelic Immortality',
        category: 'defense',
        cost: 2120,
        icon: 'ui_mega_pack/items/item_def_03_immortal.webp',
        stats: { maxHp: 800, pdef: 30 },
        passive: { name: 'Immortal Blessing', desc: 'Bangkit kembali 2.5s setelah mati dengan 20% HP + 600 Shield (CD 180s).' },
        description: '+800 HP, +30 Physical DEF. Pasif: Bangkit kembali setelah gugur (CD 180s).'
    },
    {
        id: 'item_def_04_thorn',
        name: 'Amber Flame Thornmail',
        category: 'defense',
        cost: 1960,
        icon: 'ui_mega_pack/items/item_def_04_thorn.webp',
        stats: { pdef: 90, maxHp: 400 },
        passive: { name: 'Spike Retaliation', desc: 'Memantulkan 25% Physical Basic Attack musuh kembali sebagai Magic DMG.' },
        description: '+90 Physical DEF, +400 HP. Pasif: Pantulkan 25% Basic Attack musuh.'
    },
    {
        id: 'item_def_05_helmet',
        name: 'Emerald Guardian Helm',
        category: 'defense',
        cost: 2200,
        icon: 'ui_mega_pack/items/item_def_05_helmet.webp',
        stats: { maxHp: 1550, hpRegen: 20 },
        passive: { name: 'Verdant Recovery', desc: 'Memulihkan 2.5% Max HP setiap detik saat berada di luar pertempuran.' },
        description: '+1550 HP, +20 HP/detik. Pasif: Regen 2.5% Max HP/s saat di luar kombat.'
    },
    {
        id: 'item_def_06_ice_ring',
        name: 'Dominance Frost Ring',
        category: 'defense',
        cost: 2010,
        icon: 'ui_mega_pack/items/item_def_06_ice_ring.webp',
        stats: { pdef: 70, maxMp: 500, moveSpeedPct: 0.05 },
        passive: { name: 'Arctic Aura', desc: 'Mengurangi Attack Speed musuh sekitar sebesar 30% dan Anti-Heal sebesar 50%.' },
        description: '+70 Physical DEF, +500 MP, +5% Movement Speed. Aura: -30% AS & -50% Heal musuh.'
    },

    // ==========================================
    // BOOTS (4)
    // ==========================================
    {
        id: 'item_boot_01_swift',
        name: 'Swift Boots',
        category: 'boots',
        cost: 710,
        icon: 'ui_mega_pack/items/item_boot_01_swift.webp',
        stats: { flatMoveSpeed: 40, attackSpeed: 0.15 },
        description: '+40 Movement Speed, +15% Attack Speed.'
    },
    {
        id: 'item_boot_02_arcane',
        name: 'Arcane Boots',
        category: 'boots',
        cost: 690,
        icon: 'ui_mega_pack/items/item_boot_02_arcane.webp',
        stats: { flatMoveSpeed: 40, flatMagPen: 12 },
        description: '+40 Movement Speed, +12 Flat Magic Penetration.'
    },
    {
        id: 'item_boot_03_warrior',
        name: 'Warrior Boots',
        category: 'boots',
        cost: 720,
        icon: 'ui_mega_pack/items/item_boot_03_warrior.webp',
        stats: { flatMoveSpeed: 40, pdef: 22 },
        passive: { name: 'Valor', desc: '+4 Physical DEF setiap menerima serangan dasar (maks 5 stack = +20).' },
        description: '+40 Movement Speed, +22 Physical DEF (+4 per hit, maks +20).'
    },
    {
        id: 'item_boot_04_tough',
        name: 'Tough Boots',
        category: 'boots',
        cost: 700,
        icon: 'ui_mega_pack/items/item_boot_04_tough.webp',
        stats: { flatMoveSpeed: 40, mdef: 22, resilience: 0.30 },
        description: '+40 Movement Speed, +22 Magic DEF, +30% Crowd Control Resilience.'
    },

    // ==========================================
    // CONSUMABLES (2)
    // ==========================================
    {
        id: 'item_cons_hp_potion',
        name: 'Elixir of Vitality',
        category: 'consumable',
        cost: 350,
        icon: 'ui_mega_pack/items/item_cons_hp_potion.webp',
        stats: {},
        description: 'Memulihkan 650 HP selama 5 detik.'
    },
    {
        id: 'item_cons_mp_elixir',
        name: 'Elixir of Clarity',
        category: 'consumable',
        cost: 350,
        icon: 'ui_mega_pack/items/item_cons_mp_elixir.webp',
        stats: {},
        description: 'Memulihkan 400 MP dan memberikan +15% Cooldown Reduction selama 30 detik.'
    }
];

export const BATTLE_SPELLS = [
    {
        id: 'spell_flicker',
        name: 'Flicker',
        cooldown: 90,
        icon: 'ui_mega_pack/spells/spell_flicker.webp',
        description: 'Blink sejauh 7.5 meter ke arah yang ditentukan dan mendapat +5 Physical/Magic DEF selama 1 detik.'
    },
    {
        id: 'spell_execute',
        name: 'Execute',
        cooldown: 75,
        icon: 'ui_mega_pack/spells/spell_execute.webp',
        description: 'Memberikan 200 (+20 × Level) + 13% Missing HP target sebagai True Damage ke hero musuh terdekat.'
    },
    {
        id: 'spell_revitalize',
        name: 'Revitalize',
        cooldown: 85,
        icon: 'ui_mega_pack/spells/spell_revitalize.webp',
        description: 'Memunculkan lingkaran penyembuh selama 4 detik yang memulihkan total 25% Max HP seluruh sekutu di area.'
    },
    {
        id: 'spell_sprint',
        name: 'Sprint',
        cooldown: 80,
        icon: 'ui_mega_pack/spells/spell_sprint.webp',
        description: 'Mendapat +50% Movement Speed dan Kebal terhadap efek Slow selama 6 detik.'
    },
    {
        id: 'spell_aegis',
        name: 'Aegis',
        cooldown: 75,
        icon: 'ui_mega_pack/spells/spell_aegis.webp',
        description: 'Mendapatkan Shield pelindung sebesar 750 (+50 × Level) selama 5 detik.'
    },
    {
        id: 'spell_retribution',
        name: 'Retribution',
        cooldown: 35,
        icon: 'ui_mega_pack/spells/spell_retribution.webp',
        description: 'Memberikan 600 (+80 × Level) True Damage ke monster hutan atau minion, dan memperlambat target sebesar 50%.'
    },
    {
        id: 'spell_purify',
        name: 'Purify',
        cooldown: 80,
        icon: 'ui_mega_pack/spells/spell_purify.webp',
        description: 'Menghapus seluruh efek Crowd Control (kecuali Suppress) dan kebal CC selama 1.2 detik.'
    },
    {
        id: 'spell_inspire',
        name: 'Inspire',
        cooldown: 60,
        icon: 'ui_mega_pack/spells/spell_inspire.webp',
        description: 'Meningkatkan Attack Speed sebesar +55% dan mengabaikan 20 Physical DEF musuh selama 5 detik.'
    }
];

export const RANK_TIERS = [
    { tier: 1, id: 'trainee', name: 'Trainee', starsNeeded: 3, icon: 'ui_mega_pack/ranks/rank_01_trainee.webp' },
    { tier: 2, id: 'novice', name: 'Novice', starsNeeded: 3, icon: 'ui_mega_pack/ranks/rank_02_novice.webp' },
    { tier: 3, id: 'scout', name: 'Idol Scout', starsNeeded: 4, icon: 'ui_mega_pack/ranks/rank_03_scout.webp' },
    { tier: 4, id: 'debutant', name: 'Debutant', starsNeeded: 4, icon: 'ui_mega_pack/ranks/rank_04_debutant.webp' },
    { tier: 5, id: 'center', name: 'Center', starsNeeded: 5, icon: 'ui_mega_pack/ranks/rank_05_center.webp' },
    { tier: 6, id: 'senbatsu', name: 'Senbatsu', starsNeeded: 5, icon: 'ui_mega_pack/ranks/rank_06_senbatsu.webp' },
    { tier: 7, id: 'kami7', name: 'Kami 7', starsNeeded: 5, icon: 'ui_mega_pack/ranks/rank_07_kami7.webp' },
    { tier: 8, id: 'legend', name: 'Legend', starsNeeded: 5, icon: 'ui_mega_pack/ranks/rank_08_legend.webp' },
    { tier: 9, id: 'sovereign', name: 'Onyx Sovereign', starsNeeded: 999, icon: 'ui_mega_pack/ranks/rank_09_onyx_sovereign.webp' }
];

export const EXP_CURVE_LEVELS = [
    280, 423, 574, 731, 896, 1067, 1246, 1431, 1624, 1823, 2030, 2243, 2464, 2691
]; // Total 19,523 EXP Level 1 -> 15

export const GACHA_CHESTS = {
    common: {
        id: 'chest_common',
        name: 'Common Wooden Chest',
        costGems: 60,
        icon: 'ui_mega_pack/gacha/chest_common.webp',
        drops: [
            { type: 'star_coins', min: 100, max: 300, weight: 60 },
            { type: 'exp_core', amount: 50, weight: 35 },
            { type: 'ticket', amount: 1, weight: 5 }
        ]
    },
    rare: {
        id: 'chest_rare',
        name: 'Rare Silver Chest',
        costGems: 120,
        icon: 'ui_mega_pack/gacha/chest_rare.webp',
        drops: [
            { type: 'star_coins', min: 350, max: 800, weight: 50 },
            { type: 'exp_core', amount: 150, weight: 35 },
            { type: 'onyx_gems', min: 30, max: 80, weight: 15 }
        ]
    },
    epic: {
        id: 'chest_epic',
        name: 'Epic Gilded Chest',
        costGems: 240,
        icon: 'ui_mega_pack/gacha/chest_epic.webp',
        drops: [
            { type: 'star_coins', min: 900, max: 2000, weight: 40 },
            { type: 'exp_core', amount: 400, weight: 35 },
            { type: 'ticket', amount: 2, weight: 15 },
            { type: 'onyx_gems', min: 100, max: 250, weight: 10 }
        ]
    },
    legend: {
        id: 'chest_legend',
        name: 'Legendary Amethyst Vault',
        costGems: 480,
        icon: 'ui_mega_pack/gacha/chest_legend.webp',
        drops: [
            { type: 'onyx_gems', min: 300, max: 700, weight: 45 },
            { type: 'star_coins', min: 3000, max: 7500, weight: 35 },
            { type: 'ticket', amount: 5, weight: 20 }
        ]
    },
    omega: {
        id: 'chest_omega',
        name: 'Omega Celestial Shrine',
        costGems: 960,
        icon: 'ui_mega_pack/gacha/chest_omega.webp',
        drops: [
            { type: 'onyx_gems', min: 800, max: 2000, weight: 50 },
            { type: 'ticket', amount: 10, weight: 30 },
            { type: 'star_coins', min: 10000, max: 25000, weight: 20 }
        ]
    }
};

export function getItemById(id) {
    return SHOP_ITEMS.find(it => it.id === id) || null;
}

export function getSpellById(id) {
    return BATTLE_SPELLS.find(sp => sp.id === id) || null;
}
