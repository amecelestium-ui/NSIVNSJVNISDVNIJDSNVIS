/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/ui/ModalsUI.js
 * 
 * Master Modals Controller:
 * - 24 Item Shop with 5 Category Tabs
 * - Gacha Celestial Chest Vault (5 Chest Tiers, bg_gacha_summon.webp)
 * - Rank Ladder & Leaderboard (9 Tiers, rank_01 to rank_09 + rank_star)
 * - World Codex & Bestiary (All 64 2D Props + 10 Combat Status Effects)
 * - Inventory & Chest Vault
 * - Season Battle Pass & Daily Login
 * - Multiplayer Room & P2P / HF Spaces Sync
 * - Settings & Live Asset Diagnostic Panel (Target: 100% Bound, 0 Broken 404)
 * - Zero Emojis!
 */

import { SHOP_ITEMS, GACHA_CHESTS, RANK_TIERS } from '../config/itemsAndSpells.js';
import { AssetRegistry, ASSET_CATEGORIES } from '../core/AssetRegistry.js';
import { AudioManager } from '../vfx_audio/AudioManager.js';

export class ModalsUI {
    constructor(container) {
        this.container = container;
        this.activeModal = null;
        this.currentShopCategory = 'all';

        this.initDOM();
        this.wireEvents();
    }

    initDOM() {
        this.container.innerHTML = `
            <!-- =======================================================================
                 1. ITEM SHOP MODAL (24 Items)
                 ======================================================================= -->
            <div class="modal-backdrop" id="modal-shop" style="display: none;">
                <div class="modal-window">
                    <div class="modal-header">
                        <div class="modal-title">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_shop.webp')}" class="modal-header-icon" alt="Shop">
                            <span>24 ITEM ARMORY SHOP</span>
                        </div>
                        <button class="btn-close-modal" data-close="shop" title="Tutup">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_cancel.webp')}" class="ui-icon-close" alt="Close">
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="shop-categories">
                            <button class="shop-tab active" data-cat="all">Semua</button>
                            <button class="shop-tab" data-cat="physical">Physical</button>
                            <button class="shop-tab" data-cat="magic">Magic</button>
                            <button class="shop-tab" data-cat="defense">Defense</button>
                            <button class="shop-tab" data-cat="boots">Boots</button>
                            <button class="shop-tab" data-cat="consumable">Consumable</button>
                        </div>
                        <div class="shop-grid" id="shop-items-container"></div>
                    </div>
                </div>
            </div>

            <!-- =======================================================================
                 2. GACHA CELESTIAL VAULT (bg_gacha_summon.webp, 5 Chests)
                 ======================================================================= -->
            <div class="modal-backdrop" id="modal-gacha" style="display: none;">
                <div class="modal-window modal-gacha-window">
                    <div class="modal-header">
                        <div class="modal-title">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_gacha.webp')}" class="modal-header-icon" alt="Gacha">
                            <span>CELESTIAL CHEST SUMMON VAULT</span>
                        </div>
                        <button class="btn-close-modal" data-close="gacha" title="Tutup">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_cancel.webp')}" class="ui-icon-close" alt="Close">
                        </button>
                    </div>
                    <div class="modal-body gacha-body" style="background: linear-gradient(to bottom, rgba(5,8,14,0.7), rgba(5,8,14,0.95)), url('${AssetRegistry.resolve('skyboxes_and_banners/bg_gacha_summon.webp')}') center / cover no-repeat;">
                        <div class="gacha-banner-text">
                            <h3>Buka Peti Mistis Onyx</h3>
                            <p>Peroleh Star Coins, Onyx Gems, EXP Core, dan perlengkapan eksklusif!</p>
                        </div>
                        <div class="gacha-chests-row" id="gacha-chests-container"></div>
                    </div>
                </div>
            </div>

            <!-- =======================================================================
                 3. RANK LADDER & LEADERBOARD (9 Tiers + rank_star.webp)
                 ======================================================================= -->
            <div class="modal-backdrop" id="modal-rank" style="display: none;">
                <div class="modal-window">
                    <div class="modal-header">
                        <div class="modal-title">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_leaderboard.webp')}" class="modal-header-icon" alt="Rank">
                            <span>PERINGKAT & LEADERBOARD</span>
                        </div>
                        <button class="btn-close-modal" data-close="rank" title="Tutup">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_cancel.webp')}" class="ui-icon-close" alt="Close">
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="rank-current-showcase">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/ranks/rank_01_trainee.webp')}" class="rank-badge-large" id="rank-showcase-img" alt="Rank">
                            <h3 id="rank-modal-current" class="rank-title-large">Trainee I</h3>
                            <div class="rank-stars-row">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/ranks/rank_star.webp')}" class="rank-star-img" alt="Star">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/ranks/rank_star.webp')}" class="rank-star-img" alt="Star">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/ranks/rank_star.webp')}" class="rank-star-img" alt="Star">
                            </div>
                        </div>
                        <div class="rank-section-heading">DAFTAR 9 TIER PERINGKAT:</div>
                        <div class="rank-tiers-list" id="rank-tiers-list"></div>
                    </div>
                </div>
            </div>

            <!-- =======================================================================
                 4. WORLD CODEX & BESTIARY (All 64 2D Props + 10 Combat Statuses)
                 ======================================================================= -->
            <div class="modal-backdrop" id="modal-codex" style="display: none;">
                <div class="modal-window modal-codex-window">
                    <div class="modal-header">
                        <div class="modal-title">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_quest.webp')}" class="modal-header-icon" alt="Codex">
                            <span>WORLD CODEX, BESTIARY & COMBAT GUIDE</span>
                        </div>
                        <button class="btn-close-modal" data-close="codex" title="Tutup">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_cancel.webp')}" class="ui-icon-close" alt="Close">
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="codex-tabs">
                            <button class="codex-tab active" data-codex="props">World Props & Lore (64)</button>
                            <button class="codex-tab" data-codex="combat">Status & Combat Guide (10)</button>
                        </div>
                        <div id="codex-props-grid" class="codex-grid"></div>
                        <div id="codex-combat-list" class="codex-combat-grid" style="display: none;"></div>
                    </div>
                </div>
            </div>

            <!-- =======================================================================
                 5. INVENTORY & CHESTS
                 ======================================================================= -->
            <div class="modal-backdrop" id="modal-inventory" style="display: none;">
                <div class="modal-window">
                    <div class="modal-header">
                        <div class="modal-title">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_inventory.webp')}" class="modal-header-icon" alt="Inventory">
                            <span>INVENTORY & CHESTS</span>
                        </div>
                        <button class="btn-close-modal" data-close="inventory" title="Tutup">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_cancel.webp')}" class="ui-icon-close" alt="Close">
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="inventory-section-title">PETI HARTA (CHESTS):</div>
                        <div class="inventory-chests-grid" id="inventory-chests-list"></div>
                        <div class="inventory-section-title" style="margin-top: 16px;">RAMUAN & CONSUMABLES:</div>
                        <div class="inventory-items-grid" id="inventory-consumables-list"></div>
                    </div>
                </div>
            </div>

            <!-- =======================================================================
                 6. DAILY LOGIN REWARDS
                 ======================================================================= -->
            <div class="modal-backdrop" id="modal-daily" style="display: none;">
                <div class="modal-window">
                    <div class="modal-header">
                        <div class="modal-title">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_daily.webp')}" class="modal-header-icon" alt="Daily">
                            <span>HADIAH LOGIN 7 HARI</span>
                        </div>
                        <button class="btn-close-modal" data-close="daily" title="Tutup">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_cancel.webp')}" class="ui-icon-close" alt="Close">
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="daily-rewards-grid" id="daily-rewards-container"></div>
                    </div>
                </div>
            </div>

            <!-- =======================================================================
                 7. MULTIPLAYER ROOM (WebRTC & HF Space)
                 ======================================================================= -->
            <div class="modal-backdrop" id="modal-friends" style="display: none;">
                <div class="modal-window">
                    <div class="modal-header">
                        <div class="modal-title">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_friends.webp')}" class="modal-header-icon" alt="Multiplayer">
                            <span>MULTIPLAYER ROOM & P2P SYNC</span>
                        </div>
                        <button class="btn-close-modal" data-close="friends" title="Tutup">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_cancel.webp')}" class="ui-icon-close" alt="Close">
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="mp-room-box">
                            <div class="mp-room-title">Kode Room Saat Ini:</div>
                            <div class="mp-room-code-display">
                                <span id="mp-room-code">ONYX-7860-TERARIUM</span>
                                <button class="btn-copy-code" id="btn-copy-room-code">Salin Kode</button>
                            </div>
                            <div class="mp-info-text">
                                Multi-player ultra-low latency sinkron via WebRTC DataChannel P2P (< 10ms) dengan fallback otoritatif ke Hugging Face Space.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- =======================================================================
                 8. SETTINGS & LIVE ASSET AUDIT
                 ======================================================================= -->
            <div class="modal-backdrop" id="modal-settings" style="display: none;">
                <div class="modal-window modal-settings-window">
                    <div class="modal-header">
                        <div class="modal-title">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_settings.webp')}" class="modal-header-icon" alt="Settings">
                            <span>PENGATURAN & ASSET DIAGNOSTIC</span>
                        </div>
                        <button class="btn-close-modal" data-close="settings" title="Tutup">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_cancel.webp')}" class="ui-icon-close" alt="Close">
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- Settings Tabs -->
                        <div class="settings-tabs">
                            <button class="setting-tab active" data-stab="audio">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_music.webp')}" class="stab-icon" alt="Audio">
                                <span>Audio</span>
                            </button>
                            <button class="setting-tab" data-stab="graphics">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_graphics.webp')}" class="stab-icon" alt="Graphics">
                                <span>Grafik & Langit</span>
                            </button>
                            <button class="setting-tab" data-stab="controls">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_controls.webp')}" class="stab-icon" alt="Controls">
                                <span>Kontrol HUD</span>
                            </button>
                            <button class="setting-tab" data-stab="audit">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/crests/crest_onyxpure.webp')}" class="stab-icon" alt="Audit">
                                <span>Asset Diagnostic</span>
                            </button>
                        </div>

                        <!-- Tab Audio -->
                        <div class="setting-panel" id="spanel-audio">
                            <div class="setting-row">
                                <span>Volume Master BGM</span>
                                <input type="range" id="slider-bgm" min="0" max="1" step="0.05" value="0.75">
                            </div>
                            <div class="setting-row">
                                <span>Volume Sound FX (SFX)</span>
                                <input type="range" id="slider-sfx" min="0" max="1" step="0.05" value="0.85">
                            </div>
                        </div>

                        <!-- Tab Graphics (7 Skyboxes + Classic Legacy Maps) -->
                        <div class="setting-panel" id="spanel-graphics" style="display: none;">
                            <div class="setting-row">
                                <span>Langit / Waktu 360°</span>
                                <select id="select-skybox" class="settings-select">
                                    <option value="skybox_reia_golden_meadow.webp">Padang Cahaya Emas</option>
                                    <option value="skybox_fontaine_crystal.webp">Fontaine Crystal (Siang Cerah)</option>
                                    <option value="skybox_day_mondstadt.webp">Mondstadt Azure Skies</option>
                                    <option value="skybox_night_dream.webp">Bulan Purnama Dream (Malam)</option>
                                    <option value="skybox_passion_horizon.webp">Passion Horizon (Fajar)</option>
                                    <option value="skybox_sunset_ocean.webp">Sunset Ocean (Senja Emas)</option>
                                    <option value="skybox_twilight_sakura.webp">Twilight Sakura (Ungu Senja)</option>
                                </select>
                            </div>
                            <div class="setting-row">
                                <span>Classic Legacy Map Mode (Untuk HP Kentang)</span>
                                <select id="select-legacy-map" class="settings-select">
                                    <option value="none">Ultra ONYXPURE World (Default 64 Props)</option>
                                    <option value="environments_glb/lobby_terrarium.glb">Lobby Terrarium (Legacy GLB)</option>
                                    <option value="environments_glb/arena_moba_giant.glb">Arena MOBA Giant (Legacy GLB)</option>
                                    <option value="environments_glb/arena_01_celestial_colosseum.glb">Celestial Colosseum (Legacy GLB)</option>
                                    <option value="environments_glb/arena_02_ocean_bridge.glb">Ocean Bridge (Legacy GLB)</option>
                                    <option value="environments_glb/arena_03_sky_sanctuary.glb">Sky Sanctuary (Legacy GLB)</option>
                                </select>
                            </div>
                        </div>

                        <!-- Tab Controls -->
                        <div class="setting-panel" id="spanel-controls" style="display: none;">
                            <div class="setting-row">
                                <span>Skala Ukuran HUD</span>
                                <input type="range" id="slider-hud-scale" min="0.75" max="1.25" step="0.05" value="1.0">
                            </div>
                            <div class="setting-row">
                                <span>Opasitas Transparansi HUD</span>
                                <input type="range" id="slider-hud-alpha" min="0.5" max="1.0" step="0.05" value="0.92">
                            </div>
                        </div>

                        <!-- Tab Asset Diagnostic (100% Bound Verification) -->
                        <div class="setting-panel" id="spanel-audit" style="display: none;">
                            <div class="audit-summary-box">
                                <div class="audit-pct-huge" id="audit-pct-label">100%</div>
                                <div class="audit-status-badge" id="audit-status-badge">100% BOUND • 0 BROKEN 404</div>
                                <button class="btn-run-audit" id="btn-run-asset-audit">Jalankan Audit Real-Time</button>
                            </div>
                            <div class="audit-categories-table" id="audit-categories-table"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    openModal(modalName) {
        this.closeAll();
        const el = document.getElementById(`modal-${modalName}`);
        if (el) {
            el.style.display = 'flex';
            this.activeModal = modalName;

            if (modalName === 'shop') this.renderShop();
            else if (modalName === 'gacha') this.renderGacha();
            else if (modalName === 'rank') this.renderRank();
            else if (modalName === 'codex') this.renderCodex();
            else if (modalName === 'inventory') this.renderInventory();
            else if (modalName === 'daily') this.renderDaily();
            else if (modalName === 'settings') this.renderAuditReport();
        }
    }

    closeAll() {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
        this.activeModal = null;
    }

    renderShop() {
        const container = document.getElementById('shop-items-container');
        if (!container) return;
        container.innerHTML = '';

        const items = SHOP_ITEMS.filter(it => this.currentShopCategory === 'all' || it.category === this.currentShopCategory);
        items.forEach(it => {
            const card = document.createElement('div');
            card.className = 'shop-item-card';
            card.innerHTML = `
                <img src="${AssetRegistry.resolve(it.icon)}" class="shop-item-icon" alt="${it.name}">
                <div class="shop-item-info">
                    <div class="shop-item-name">${it.name}</div>
                    <div class="shop-item-desc">${it.description}</div>
                    <div class="shop-item-price">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/economy/curr_star_coin.webp')}" class="ui-icon-mini" alt="Coin">
                        <span>${it.cost}</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderGacha() {
        const container = document.getElementById('gacha-chests-container');
        if (!container) return;
        container.innerHTML = '';

        const chests = [
            { id: 'common', name: 'Common Chest', icon: 'ui_mega_pack/economy/chest_common.webp', cost: 100 },
            { id: 'rare', name: 'Rare Chest', icon: 'ui_mega_pack/economy/chest_rare.webp', cost: 250 },
            { id: 'epic', name: 'Epic Chest', icon: 'ui_mega_pack/economy/chest_epic.webp', cost: 500 },
            { id: 'legend', name: 'Legend Chest', icon: 'ui_mega_pack/economy/chest_legend.webp', cost: 1000 },
            { id: 'omega', name: 'Omega Chest', icon: 'ui_mega_pack/economy/chest_omega.webp', cost: 2000 }
        ];

        chests.forEach(ch => {
            const box = document.createElement('div');
            box.className = 'gacha-chest-card';
            box.innerHTML = `
                <img src="${AssetRegistry.resolve(ch.icon)}" class="gacha-chest-img" alt="${ch.name}">
                <div class="gacha-chest-title">${ch.name}</div>
                <button class="btn-gacha-open">Buka (${ch.cost} Gems)</button>
            `;
            container.appendChild(box);
        });
    }

    renderRank() {
        const container = document.getElementById('rank-tiers-list');
        if (!container) return;
        container.innerHTML = '';

        const tiers = [
            { name: 'Trainee I-III', icon: 'ui_mega_pack/ranks/rank_01_trainee.webp' },
            { name: 'Rookie I-III', icon: 'ui_mega_pack/ranks/rank_02_rookie.webp' },
            { name: 'Ensemble I-IV', icon: 'ui_mega_pack/ranks/rank_03_ensemble.webp' },
            { name: 'Senbatsu I-IV', icon: 'ui_mega_pack/ranks/rank_04_senbatsu.webp' },
            { name: 'Center Elite I-IV', icon: 'ui_mega_pack/ranks/rank_05_center_elite.webp' },
            { name: 'Kami-Oshi Master I-V', icon: 'ui_mega_pack/ranks/rank_06_kami_oshi.webp' },
            { name: 'Grand Sovereign I-V', icon: 'ui_mega_pack/ranks/rank_07_grand_sovereign.webp' },
            { name: 'Celestial Legend', icon: 'ui_mega_pack/ranks/rank_08_celestial_legend.webp' },
            { name: 'Onyx Sovereign Mythic', icon: 'ui_mega_pack/ranks/rank_09_onyx_sovereign.webp' }
        ];

        tiers.forEach((t, idx) => {
            const row = document.createElement('div');
            row.className = `rank-tier-row ${idx === 0 ? 'current' : ''}`;
            row.innerHTML = `
                <img src="${AssetRegistry.resolve(t.icon)}" class="rank-tier-mini-img" alt="${t.name}">
                <span class="rank-tier-title">${t.name}</span>
                <span class="rank-tier-status">${idx === 0 ? 'Tier Aktif' : 'Terkunci'}</span>
            `;
            container.appendChild(row);
        });
    }

    renderCodex() {
        const propsGrid = document.getElementById('codex-props-grid');
        const combatGrid = document.getElementById('codex-combat-list');
        if (!propsGrid || !combatGrid) return;

        propsGrid.innerHTML = '';
        combatGrid.innerHTML = '';

        // 64 2D Props from ASSET_CATEGORIES['world_props_2d']
        const propPaths = ASSET_CATEGORIES['world_props_2d'] || [];
        propPaths.forEach(p => {
            const cleanPath = p.replace(/^(\.\/|\/)?(models|model)\//, '');
            const rawName = p.split('/').pop().replace('.png', '').replace(/_/g, ' ');
            const card = document.createElement('div');
            card.className = 'codex-prop-card';
            card.innerHTML = `
                <img src="${AssetRegistry.resolve(p)}" class="codex-prop-img" alt="${rawName}" loading="lazy" onerror="this.onerror=null; this.src='https://onyxpure.my.id/models/${cleanPath}';">
                <div class="codex-prop-name">${rawName}</div>
                <div class="codex-prop-lore">Struktur terarium megah di Onyx World.</div>
            `;
            propsGrid.appendChild(card);
        });

        // 10 Combat Status Buff/Debuff Icons
        const statusPaths = [
            { id: 'burn', name: 'Burn (Bakar)', desc: 'Menghasilkan true damage berkala setiap 0.5 detik.', icon: 'ui_mega_pack/combat/status_burn.webp' },
            { id: 'crit', name: 'Critical Hit Surge', desc: 'Meningkatkan critical chance +40% dan crit damage +50%.', icon: 'ui_mega_pack/combat/status_crit.webp' },
            { id: 'haste', name: 'Haste / Swiftness', desc: 'Meningkatkan movement speed +30% dan attack speed +35%.', icon: 'ui_mega_pack/combat/status_haste.webp' },
            { id: 'heal', name: 'Regeneration Aura', desc: 'Memulihkan HP secara berangsur-angsur selama durasi aktif.', icon: 'ui_mega_pack/combat/status_heal.webp' },
            { id: 'invincible', name: 'Invincibility Barrier', desc: 'Kebal terhadap seluruh damage dan crowd control musuh.', icon: 'ui_mega_pack/combat/status_invincible.webp' },
            { id: 'root', name: 'Rooted (Tertambat)', desc: 'Tidak dapat bergerak atau berpindah tempat, namun tetap bisa menyerang.', icon: 'ui_mega_pack/combat/status_root.webp' },
            { id: 'shield', name: 'Shield Absorber', desc: 'Perisai pelindung yang menyerap damage sebelum menyentuh HP asli.', icon: 'ui_mega_pack/combat/status_shield.webp' },
            { id: 'silence', name: 'Silence (Kekang)', desc: 'Tidak dapat mengaktifkan skill maupun battle spells.', icon: 'ui_mega_pack/combat/status_silence.webp' },
            { id: 'slow', name: 'Slowdown', desc: 'Kecepatan gerak berkurang 40%–60%.', icon: 'ui_mega_pack/combat/status_slow.webp' },
            { id: 'stun', name: 'Stunned (Lumpuh)', desc: 'Lumpuh total tidak dapat bergerak, menyerang, atau mengaktifkan skill.', icon: 'ui_mega_pack/combat/status_stun.webp' }
        ];

        statusPaths.forEach(s => {
            const card = document.createElement('div');
            card.className = 'codex-status-card';
            card.innerHTML = `
                <img src="${AssetRegistry.resolve(s.icon)}" class="codex-status-img" alt="${s.name}" onerror="this.onerror=null; this.src='https://onyxpure.my.id/models/${s.icon}';">
                <div class="codex-status-info">
                    <div class="codex-status-title">${s.name}</div>
                    <div class="codex-status-desc">${s.desc}</div>
                </div>
            `;
            combatGrid.appendChild(card);
        });
    }

    renderInventory() {
        const chestsList = document.getElementById('inventory-chests-list');
        const consList = document.getElementById('inventory-consumables-list');
        if (!chestsList || !consList) return;

        chestsList.innerHTML = '';
        consList.innerHTML = '';

        const chestItems = [
            { name: 'Common Chest', icon: 'ui_mega_pack/economy/chest_common.webp', qty: 3 },
            { name: 'Rare Chest', icon: 'ui_mega_pack/economy/chest_rare.webp', qty: 1 },
            { name: 'Epic Chest', icon: 'ui_mega_pack/economy/chest_epic.webp', qty: 1 },
            { name: 'Legend Chest', icon: 'ui_mega_pack/economy/chest_legend.webp', qty: 0 },
            { name: 'Omega Chest', icon: 'ui_mega_pack/economy/chest_omega.webp', qty: 0 }
        ];

        chestItems.forEach(ch => {
            const card = document.createElement('div');
            card.className = 'inv-item-card';
            card.innerHTML = `
                <img src="${AssetRegistry.resolve(ch.icon)}" class="inv-item-icon" alt="${ch.name}">
                <div class="inv-item-name">${ch.name}</div>
                <div class="inv-item-qty">Qty: ${ch.qty}</div>
            `;
            chestsList.appendChild(card);
        });

        const potions = [
            { name: 'Celestial HP Potion', icon: 'ui_mega_pack/items/item_cons_hp_potion.webp', qty: 5 },
            { name: 'Arcane MP Elixir', icon: 'ui_mega_pack/items/item_cons_mp_elixir.webp', qty: 3 }
        ];

        potions.forEach(p => {
            const card = document.createElement('div');
            card.className = 'inv-item-card';
            card.innerHTML = `
                <img src="${AssetRegistry.resolve(p.icon)}" class="inv-item-icon" alt="${p.name}">
                <div class="inv-item-name">${p.name}</div>
                <div class="inv-item-qty">Qty: ${p.qty}</div>
            `;
            consList.appendChild(card);
        });
    }

    renderDaily() {
        const container = document.getElementById('daily-rewards-container');
        if (!container) return;
        container.innerHTML = '';

        const days = [
            { day: 1, reward: '100 Coins', icon: 'ui_mega_pack/economy/curr_star_coin.webp' },
            { day: 2, reward: '20 Gems', icon: 'ui_mega_pack/economy/curr_onyx_gem.webp' },
            { day: 3, reward: '1 Ticket', icon: 'ui_mega_pack/economy/curr_gacha_ticket.webp' },
            { day: 4, reward: '300 Coins', icon: 'ui_mega_pack/economy/curr_star_coin.webp' },
            { day: 5, reward: 'Rare Chest', icon: 'ui_mega_pack/economy/chest_rare.webp' },
            { day: 6, reward: '50 Gems', icon: 'ui_mega_pack/economy/curr_onyx_gem.webp' },
            { day: 7, reward: 'Epic Chest', icon: 'ui_mega_pack/economy/chest_epic.webp' }
        ];

        days.forEach(d => {
            const card = document.createElement('div');
            card.className = `daily-day-card ${d.day === 1 ? 'today' : ''}`;
            card.innerHTML = `
                <div class="daily-day-title">Hari ${d.day}</div>
                <img src="${AssetRegistry.resolve(d.icon)}" class="daily-reward-icon" alt="${d.reward}">
                <div class="daily-reward-text">${d.reward}</div>
            `;
            container.appendChild(card);
        });
    }

    renderAuditReport() {
        const report = AssetRegistry.auditUsage();
        const pctEl = document.getElementById('audit-pct-label');
        const badgeEl = document.getElementById('audit-status-badge');
        const tableEl = document.getElementById('audit-categories-table');

        if (pctEl) pctEl.textContent = report.overallPercentage;
        if (badgeEl) {
            badgeEl.textContent = `${report.uniqueAssetsUsed}/${report.totalAssetsRegistered} ASSETS BOUND • ${report.failedCount} BROKEN 404`;
            badgeEl.style.background = report.failedCount === 0 ? '#10b981' : '#f59e0b';
        }

        if (tableEl) {
            tableEl.innerHTML = '';
            for (const [catName, stats] of Object.entries(report.categories)) {
                const row = document.createElement('div');
                row.className = 'audit-cat-row';
                row.innerHTML = `
                    <span class="audit-cat-name">${catName}</span>
                    <span class="audit-cat-num">${stats.used} / ${stats.total} (${stats.percentage})</span>
                `;
                tableEl.appendChild(row);
            }
        }
    }

    wireEvents() {
        // Close Buttons
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.play('ui_click');
                this.closeAll();
            });
        });

        // Shop Category Tabs
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentShopCategory = tab.dataset.cat;
                this.renderShop();
                AudioManager.play('ui_click');
            });
        });

        // Codex Tabs
        document.querySelectorAll('.codex-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.codex-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const codexType = tab.dataset.codex;
                const propsGrid = document.getElementById('codex-props-grid');
                const combatGrid = document.getElementById('codex-combat-list');

                if (propsGrid && combatGrid) {
                    propsGrid.style.display = codexType === 'props' ? 'grid' : 'none';
                    combatGrid.style.display = codexType === 'combat' ? 'grid' : 'none';
                }
                AudioManager.play('ui_click');
            });
        });

        // Settings Tabs
        document.querySelectorAll('.setting-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.setting-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const stab = tab.dataset.stab;
                document.querySelectorAll('.setting-panel').forEach(p => p.style.display = 'none');
                const targetPanel = document.getElementById(`spanel-${stab}`);
                if (targetPanel) targetPanel.style.display = 'block';

                if (stab === 'audit') this.renderAuditReport();
                AudioManager.play('ui_click');
            });
        });

        // Run Audit Button
        const btnRunAudit = document.getElementById('btn-run-asset-audit');
        if (btnRunAudit) {
            btnRunAudit.addEventListener('click', () => {
                this.renderAuditReport();
                AudioManager.play('ui_click');
            });
        }

        // Live HUD Scale & Alpha Sliders
        const sliderScale = document.getElementById('slider-hud-scale');
        if (sliderScale) {
            sliderScale.addEventListener('input', (e) => {
                document.documentElement.style.setProperty('--hud-scale', e.target.value);
            });
        }

        const sliderAlpha = document.getElementById('slider-hud-alpha');
        if (sliderAlpha) {
            sliderAlpha.addEventListener('input', (e) => {
                document.documentElement.style.setProperty('--hud-alpha', e.target.value);
            });
        }

        // BGM Slider
        const sliderBgm = document.getElementById('slider-bgm');
        if (sliderBgm) {
            sliderBgm.addEventListener('input', (e) => {
                AudioManager.setBgmVolume(parseFloat(e.target.value));
            });
        }

        // Copy Room Code Button
        const btnCopy = document.getElementById('btn-copy-room-code');
        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                const code = document.getElementById('mp-room-code')?.textContent || 'ONYX-7860';
                navigator.clipboard?.writeText(code).then(() => {
                    btnCopy.textContent = 'Tersalin!';
                    setTimeout(() => btnCopy.textContent = 'Salin Kode', 2000);
                });
            });
        }
    }
}
