/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/ui/LoadingAndLobbyUI.js
 * 
 * Master AAA Hero Selection Showcase & Lobby UI:
 * - Full-Viewport Floating Glass HUD (100vw x 100vh)
 * - 45% clear center screen for 360° hero view
 * - Zero Emojis (100% real image icons from ui_mega_pack & ui_assets)
 * - Dedicated Launch Dock (#lobby-launch-dock) with Arena & Sandbox buttons
 * - Auto-select default hero on boot
 */

import { getAllHeroes, getHeroById, ACTIVE_HERO_IDS } from '../config/rosterData.js';
import { PortraitCropper } from '../core/PortraitCropper.js';
import { AssetRegistry } from '../core/AssetRegistry.js';
import { AudioManager } from '../vfx_audio/AudioManager.js';

export class LoadingAndLobbyUI {
    constructor({ container, onSelectHero, onEnterSandbox, onEnterArena, onOpenModal }) {
        this.container = container;
        this.onSelectHero = onSelectHero || (() => {});
        this.onEnterSandbox = onEnterSandbox || (() => {});
        this.onEnterArena = onEnterArena || (() => {});
        this.onOpenModal = onOpenModal || (() => {});

        this.allHeroes = getAllHeroes();
        // Default to Christy or Freya
        this.selectedHero = getHeroById('christy') || getHeroById('freya') || this.allHeroes[0];
        this.lastPlayableHero = this.selectedHero.is3DActive ? this.selectedHero : (getHeroById('christy') || this.allHeroes[0]);
        
        this.currentTeamFilter = 'all';
        this.currentRoleFilter = 'all';
        this.currentLaneFilter = 'all';
        this.onlyReadyFilter = false;
        this.searchQuery = '';
        this.selectedArena = 'arena_colosseum';
        this.selectedSpell = 'spell_flicker';
        this.selectedSandboxSpawn = { x: 0, z: 0, name: 'Kubah Terarium / Plaza' };
        this.sandboxLandmarks = [
            { id: 'plaza', name: 'Kubah Plaza', x: 0, z: 0, img: 'skyboxes_and_banners/bg_loading_onyxpure.webp' },
            { id: 'cafe', name: 'Botanical Cafe', x: 55, z: 0, img: 'world_props_2d/onyx_botanical_cafe.png' },
            { id: 'windmill', name: 'Desa Kincir', x: -60, z: 0, img: 'world_props_2d/mondstadt_windmill.png' },
            { id: 'aquifer', name: 'Crystal Aquifer', x: 0, z: -58, img: 'world_props_2d/crystal_aquifer_shrine.png' },
            { id: 'hills', name: 'Padang Bukit', x: 0, z: 210, img: 'world_props_2d/giant_emerald_oak_tree.png' },
            { id: 'sakura', name: 'Hutan Sakura', x: -240, z: 0, img: 'world_props_2d/giant_sakura_tree.png' },
            { id: 'harbor', name: 'Pelabuhan Azure', x: 460, z: 0, img: 'world_props_2d/harbor_lighthouse.png' }
        ];

        this.initDOM();
        this.renderRoster();
        this.updateInspector();
        this.wireEvents();
    }

    initDOM() {
        this.container.innerHTML = `
            <div class="lobby-screen" id="lobby-screen-root">
                <!-- =======================================================================
                     1. SLIM TOP BAR (height: 54px, fixed top)
                     ======================================================================= -->
                <header class="lobby-header">
                    <div class="header-left">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/crests/crest_onyxpure.webp')}" class="brand-crest-mini" alt="ONYXPURE">
                        <span class="brand-badge">ONYXPURE</span>
                        <div class="rank-badge-box">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/ranks/rank_01_trainee.webp')}" class="rank-icon-mini" alt="Rank">
                            <span id="header-rank-name">Trainee I</span>
                        </div>
                    </div>

                    <div class="header-currencies">
                        <div class="curr-pill" title="Onyx Gems">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/economy/curr_onyx_gem.webp')}" class="ui-icon-curr" alt="Gems">
                            <span id="header-gems">480</span>
                        </div>
                        <div class="curr-pill" title="Star Coins">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/economy/curr_star_coin.webp')}" class="ui-icon-curr" alt="Coins">
                            <span id="header-coins">3,500</span>
                        </div>
                        <div class="curr-pill" title="Gacha Tickets">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/economy/curr_gacha_ticket.webp')}" class="ui-icon-curr" alt="Tickets">
                            <span id="header-tickets">8</span>
                        </div>
                        <div class="curr-pill" title="EXP Core Level">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/economy/curr_exp_core.webp')}" class="ui-icon-curr" alt="EXP Core">
                            <span id="header-exp">Lv.1</span>
                        </div>
                        <div class="curr-pill curr-bp-pill" id="btn-header-bp" style="cursor: pointer;" title="Onyx Season Battle Pass">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/economy/curr_battlepass.webp')}" class="ui-icon-curr" alt="Pass">
                            <span>Pass</span>
                        </div>
                    </div>

                    <div class="header-right">
                        <button class="btn-header-icon" id="btn-shop-modal" title="24 Item Shop">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_shop.webp')}" class="ui-icon-nav" alt="Shop">
                        </button>
                        <button class="btn-header-icon" id="btn-gacha-modal" title="Gacha Celestial Vault">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_gacha.webp')}" class="ui-icon-nav" alt="Gacha">
                        </button>
                        <button class="btn-header-icon" id="btn-inventory-modal" title="Inventory & Chests">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_inventory.webp')}" class="ui-icon-nav" alt="Inventory">
                        </button>
                        <button class="btn-header-icon" id="btn-rank-modal" title="Rank Ladder & Leaderboard">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_leaderboard.webp')}" class="ui-icon-nav" alt="Leaderboard">
                        </button>
                        <button class="btn-header-icon" id="btn-codex-modal" title="World Codex & Bestiary">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_quest.webp')}" class="ui-icon-nav" alt="Codex">
                        </button>
                        <button class="btn-header-icon" id="btn-daily-modal" title="Daily Login Rewards">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_daily.webp')}" class="ui-icon-nav" alt="Daily">
                        </button>
                        <button class="btn-header-icon" id="btn-friends-modal" title="Multiplayer Room">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_friends.webp')}" class="ui-icon-nav" alt="Multiplayer">
                        </button>
                        <button class="btn-header-icon" id="btn-settings-modal" title="Pengaturan & Asset Audit">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_settings.webp')}" class="ui-icon-nav" alt="Settings">
                        </button>
                        <button class="btn-header-icon" id="btn-audio-toggle" title="Toggle Audio">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_audio_on.webp')}" id="img-audio-state" class="ui-icon-nav" alt="Audio">
                        </button>
                        <button class="btn-header-icon" id="btn-fullscreen-toggle" title="Toggle Fullscreen">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_fullscreen.webp')}" class="ui-icon-nav" alt="Fullscreen">
                        </button>
                    </div>
                </header>

                <!-- =======================================================================
                     2. LEFT ROSTER PANEL (top: 66px, left: 16px, bottom: 16px, width: 290px)
                     ======================================================================= -->
                <aside class="roster-panel">
                    <div class="roster-top-search">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_search.webp')}" class="ui-icon-search" alt="Search">
                        <input type="text" class="search-input" id="roster-search" placeholder="Cari 42 member...">
                    </div>

                    <!-- Team Tabs -->
                    <div class="roster-team-tabs">
                        <button class="team-tab-btn active" data-team="all" title="Semua 42 Member">ALL</button>
                        <button class="team-tab-btn" data-team="team_dream" title="Team Dream">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/crests/crest_team_dream.webp')}" class="tab-crest-img" alt="Dream">
                        </button>
                        <button class="team-tab-btn" data-team="team_love" title="Team Love">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/crests/crest_team_love.webp')}" class="tab-crest-img" alt="Love">
                        </button>
                        <button class="team-tab-btn" data-team="team_passion" title="Team Passion">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/crests/crest_team_passion.webp')}" class="tab-crest-img" alt="Passion">
                        </button>
                    </div>

                    <!-- Compact Role / Lane Filter Bar -->
                    <div class="roster-quick-filters">
                        <div class="filter-row">
                            <button class="btn-filter-icon active" data-filter-role="all" title="Semua Role">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/role_all.webp')}" class="ui-filter-img" alt="All">
                            </button>
                            <button class="btn-filter-icon" data-filter-role="Fighter" title="Fighter">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/role_fighter.webp')}" class="ui-filter-img" alt="Fighter">
                            </button>
                            <button class="btn-filter-icon" data-filter-role="Mage" title="Mage">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/role_mage.webp')}" class="ui-filter-img" alt="Mage">
                            </button>
                            <button class="btn-filter-icon" data-filter-role="Marksman" title="Marksman">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/role_marksman.webp')}" class="ui-filter-img" alt="Marksman">
                            </button>
                            <button class="btn-filter-icon" data-filter-role="Assassin" title="Assassin">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/role_assassin.webp')}" class="ui-filter-img" alt="Assassin">
                            </button>
                            <button class="btn-filter-icon" data-filter-role="Support" title="Support / Healer">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/role_healer.webp')}" class="ui-filter-img" alt="Support">
                            </button>
                        </div>
                        <div class="filter-row">
                            <button class="btn-filter-icon active" data-filter-lane="all" title="Semua Lane">ALL</button>
                            <button class="btn-filter-icon" data-filter-lane="EXP Lane" title="EXP Lane">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/lane_exp.webp')}" class="ui-filter-img" alt="EXP">
                            </button>
                            <button class="btn-filter-icon" data-filter-lane="Mid Lane" title="Mid Lane">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/lane_mid.webp')}" class="ui-filter-img" alt="Mid">
                            </button>
                            <button class="btn-filter-icon" data-filter-lane="Gold Lane" title="Gold Lane">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/lane_gold.webp')}" class="ui-filter-img" alt="Gold">
                            </button>
                            <button class="btn-filter-icon" data-filter-lane="Jungle" title="Jungle">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/lane_jungle.webp')}" class="ui-filter-img" alt="Jungle">
                            </button>
                            <button class="btn-filter-icon" data-filter-lane="Roam" title="Roam">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/lane_roam.webp')}" class="ui-filter-img" alt="Roam">
                            </button>
                        </div>
                    </div>

                    <!-- 3-Column Roster Grid -->
                    <div class="roster-grid-3col" id="roster-cards-container"></div>
                </aside>

                <!-- =======================================================================
                     3. RIGHT INSPECTOR PANEL (top: 66px, right: 16px, bottom: 112px, width: 320px)
                     ======================================================================= -->
                <aside class="inspector-panel" id="inspector-panel-root">
                    <div class="inspector-hero-header">
                        <div class="inspector-hero-title-row">
                            <h2 class="inspector-hero-name" id="insp-name">Freya</h2>
                            <img src="${AssetRegistry.resolve('ui_mega_pack/crests/crest_team_dream.webp')}" id="insp-team-crest" class="insp-team-crest-img" alt="Team Crest">
                        </div>
                        <div class="inspector-badges-row">
                            <span class="insp-role-badge">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/role_fighter.webp')}" id="insp-role-icon" class="ui-icon-mini" alt="Role">
                                <span id="insp-role-name">Fighter</span>
                            </span>
                            <span class="insp-lane-badge">
                                <img src="${AssetRegistry.resolve('ui_mega_pack/roles/lane_exp.webp')}" id="insp-lane-icon" class="ui-icon-mini" alt="Lane">
                                <span id="insp-lane-name">EXP Lane</span>
                            </span>
                        </div>
                    </div>

                    <!-- 4 Skills + Weapon Row -->
                    <div class="inspector-skills-cluster">
                        <div class="skill-circle-wrap" id="insp-skill-p" title="Pasif">
                            <img src="${AssetRegistry.resolve('ui_assets/skill_frame_dream.webp')}" class="skill-frame-img" alt="Frame">
                            <img src="" id="insp-icon-passive" class="skill-icon-img" alt="Passive">
                        </div>
                        <div class="skill-circle-wrap" id="insp-skill-1" title="Skill 1 (Q)">
                            <img src="${AssetRegistry.resolve('ui_assets/skill_frame_dream.webp')}" class="skill-frame-img" alt="Frame">
                            <img src="" id="insp-icon-s1" class="skill-icon-img" alt="S1">
                        </div>
                        <div class="skill-circle-wrap" id="insp-skill-2" title="Skill 2 (W)">
                            <img src="${AssetRegistry.resolve('ui_assets/skill_frame_dream.webp')}" class="skill-frame-img" alt="Frame">
                            <img src="" id="insp-icon-s2" class="skill-icon-img" alt="S2">
                        </div>
                        <div class="skill-circle-wrap skill-ult-wrap" id="insp-skill-ult" title="Ultimate (R)">
                            <img src="${AssetRegistry.resolve('ui_assets/ui_skill_ring_gold.webp')}" class="skill-frame-img" alt="Ult Ring">
                            <img src="" id="insp-icon-ult" class="skill-icon-img" alt="Ult">
                        </div>
                        <div class="skill-circle-wrap skill-wpn-wrap" id="insp-wpn-slot" title="Senjata">
                            <img src="${AssetRegistry.resolve('ui_assets/skill_frame_dream.webp')}" class="skill-frame-img" alt="Frame">
                            <img src="" id="insp-icon-weapon" class="skill-icon-img weapon-preview-icon" alt="Weapon">
                        </div>
                    </div>

                    <!-- Skill Tooltip Box -->
                    <div class="skill-detail-tooltip" id="insp-skill-desc-box">
                        <div class="skill-desc-name" id="insp-skill-active-title">Valkyrie Grace (Passive)</div>
                        <div class="skill-desc-body" id="insp-skill-active-desc">Memperoleh perisai dan peningkatan attack speed saat menyerang berturut-turut.</div>
                    </div>

                    <!-- Audition Audio & Preview VFX Buttons -->
                    <div class="inspector-audition-row">
                        <button class="btn-audition" id="btn-audition-voice" title="Dengarkan Suara Skill">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_music.webp')}" class="ui-icon-btn-sm" alt="Audio">
                            <span>Putar Suara</span>
                        </button>
                        <button class="btn-audition" id="btn-preview-vfx" title="Preview Skill VFX">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_crit.webp')}" class="ui-icon-btn-sm" alt="VFX">
                            <span>Preview VFX</span>
                        </button>
                    </div>

                    <!-- Battle Spells Picker (8 Mini Spells) -->
                    <div class="inspector-section-label">PILIH BATTLE SPELL:</div>
                    <div class="spells-picker-row">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/spells/spell_flicker.webp')}" class="spell-thumb active" data-spell="spell_flicker" title="Flicker (Teleport)" alt="Flicker">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/spells/spell_execute.webp')}" class="spell-thumb" data-spell="spell_execute" title="Execute (True Damage)" alt="Execute">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/spells/spell_aegis.webp')}" class="spell-thumb" data-spell="spell_aegis" title="Aegis (Shield)" alt="Aegis">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/spells/spell_inspire.webp')}" class="spell-thumb" data-spell="spell_inspire" title="Inspire (Attack Speed)" alt="Inspire">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/spells/spell_purify.webp')}" class="spell-thumb" data-spell="spell_purify" title="Purify (Remove CC)" alt="Purify">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/spells/spell_retribution.webp')}" class="spell-thumb" data-spell="spell_retribution" title="Retribution (Jungle)" alt="Retribution">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/spells/spell_revitalize.webp')}" class="spell-thumb" data-spell="spell_revitalize" title="Revitalize (Heal AoE)" alt="Revitalize">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/spells/spell_sprint.webp')}" class="spell-thumb" data-spell="spell_sprint" title="Sprint (Move Speed)" alt="Sprint">
                    </div>

                    <!-- 1. Sandbox Landmarks Selector (7 Locations) -->
                    <div class="inspector-section-label">PILIH LOKASI SANDBOX:</div>
                    <div class="sandbox-picker-scroll">
                        ${this.sandboxLandmarks.map((loc, idx) => `
                            <div class="sandbox-card-thumb ${idx === 0 ? 'active' : ''}" data-x="${loc.x}" data-z="${loc.z}" data-name="${loc.name}" title="${loc.name} (${loc.x}, ${loc.z})">
                                <img src="${AssetRegistry.resolve(loc.img)}" class="sandbox-bg-img" alt="${loc.name}" onerror="this.src='https://onyxpure.my.id/models/${loc.img}'">
                                <span class="sandbox-card-name">${loc.name}</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- 2. Arena Map Selector (3 Compact Cards) -->
                    <div class="inspector-section-label">PILIH ARENA MOBA (5v5):</div>
                    <div class="arena-picker-compact">
                        <div class="arena-card-thumb active" data-arena="arena_colosseum" title="Celestial Colosseum">
                            <img src="${AssetRegistry.resolve('skyboxes_and_banners/card_arena_colosseum.webp')}" class="arena-bg-img" alt="Colosseum">
                            <span class="arena-card-name">Celestial Colosseum</span>
                        </div>
                        <div class="arena-card-thumb" data-arena="arena_ocean_bridge" title="Grand Ocean Bridge">
                            <img src="${AssetRegistry.resolve('skyboxes_and_banners/card_arena_ocean_bridge.webp')}" class="arena-bg-img" alt="Ocean Bridge">
                            <span class="arena-card-name">Grand Ocean Bridge</span>
                        </div>
                        <div class="arena-card-thumb" data-arena="arena_sky_sakura" title="Sky Sakura Sanctuary">
                            <img src="${AssetRegistry.resolve('skyboxes_and_banners/card_arena_sky_sakura.webp')}" class="arena-bg-img" alt="Sky Sakura">
                            <span class="arena-card-name">Sky Sakura Sanctuary</span>
                        </div>
                    </div>
                </aside>

                <!-- =======================================================================
                     4. DEDICATED LAUNCH DOCK (position: fixed; bottom: 18px; right: 16px; width: 320px; z-index: 9999)
                     ======================================================================= -->
                <div id="lobby-launch-dock" class="lobby-launch-dock">
                    <button id="btn-enter-arena" class="btn-dock-action btn-dock-arena" title="Masuk Mode Pertarungan Arena MOBA 5v5">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/roles/role_fighter.webp')}" class="ui-icon-dock" alt="Arena">
                        <div class="btn-dock-text">
                            <span class="dock-title">MASUK ARENA</span>
                            <span class="dock-sub">5v5 MOBA Combat</span>
                        </div>
                    </button>
                    <button id="btn-enter-sandbox" class="btn-dock-action btn-dock-sandbox" title="Masuk Mode Jelajah Terarium & Open World">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_teleport.webp')}" class="ui-icon-dock" alt="Sandbox">
                        <div class="btn-dock-text">
                            <span class="dock-title">MASUK SANDBOX</span>
                            <span class="dock-sub">Jelajah Terarium</span>
                        </div>
                    </button>
                </div>
            </div>
        `;
    }

    renderRoster() {
        const container = document.getElementById('roster-cards-container');
        if (!container) return;
        container.innerHTML = '';

        let filtered = this.allHeroes.filter(h => {
            if (this.currentTeamFilter !== 'all' && h.team !== this.currentTeamFilter) return false;
            if (this.currentRoleFilter !== 'all' && !h.role.toLowerCase().includes(this.currentRoleFilter.toLowerCase())) return false;
            if (this.currentLaneFilter !== 'all' && !h.lane.toLowerCase().includes(this.currentLaneFilter.toLowerCase())) return false;
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                const matchName = h.name.toLowerCase().includes(q);
                const matchRole = h.role.toLowerCase().includes(q);
                const matchLane = h.lane.toLowerCase().includes(q);
                if (!matchName && !matchRole && !matchLane) return false;
            }
            return true;
        });

        // Split into 6 Active 3D heroes (pinned top) and 36 Preview
        const activeGroup = filtered.filter(h => h.is3DActive);
        const previewGroup = filtered.filter(h => !h.is3DActive);

        // Render Active 3D heroes
        activeGroup.forEach(hero => {
            container.appendChild(this.createHeroCard(hero, true));
        });

        // Separator if both groups present
        if (activeGroup.length > 0 && previewGroup.length > 0) {
            const sep = document.createElement('div');
            sep.className = 'roster-group-separator';
            sep.innerHTML = `<span>ALL ROSTER (PREVIEW)</span>`;
            container.appendChild(sep);
        }

        // Render Preview heroes
        previewGroup.forEach(hero => {
            container.appendChild(this.createHeroCard(hero, false));
        });
    }

    createHeroCard(hero, isActive3D) {
        const card = document.createElement('div');
        card.className = `hero-card-3col ${hero.id === this.selectedHero.id ? 'active' : ''} ${isActive3D ? 'hero-playable-3d' : 'hero-preview'}`;
        card.dataset.heroId = hero.id;

        const teamCrest = AssetRegistry.resolve(`ui_mega_pack/crests/crest_${hero.team}.webp`);
        const cardImgSrc = AssetRegistry.resolve(hero.portraitSource);

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${cardImgSrc}" class="hero-card-thumb" alt="${hero.name}" loading="lazy">
                ${isActive3D ? `<span class="badge-3d-active">3D</span>` : ''}
                <img src="${teamCrest}" class="card-team-crest" alt="Team">
                <div class="card-gradient-overlay">
                    <span class="card-hero-name">${hero.name}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            this.selectHero(hero);
        });

        // Hook cropped portrait asynchronously
        PortraitCropper.getCroppedPortrait(hero, 'card').then(croppedUrl => {
            const img = card.querySelector('.hero-card-thumb');
            if (img && croppedUrl) {
                img.src = croppedUrl;
            }
        });

        return card;
    }

    selectHero(hero) {
        if (!hero) return;
        this.selectedHero = hero;
        if (hero.is3DActive) {
            this.lastPlayableHero = hero;
        }

        // Highlight card in DOM
        document.querySelectorAll('.hero-card-3col').forEach(c => {
            c.classList.toggle('active', c.dataset.heroId === hero.id);
        });

        this.updateInspector();
        this.onSelectHero(hero);
    }

    updateInspector() {
        const h = this.selectedHero;
        if (!h) return;

        const nameEl = document.getElementById('insp-name');
        if (nameEl) nameEl.textContent = h.name;

        const teamCrestEl = document.getElementById('insp-team-crest');
        if (teamCrestEl) teamCrestEl.src = AssetRegistry.resolve(`ui_mega_pack/crests/crest_${h.team}.webp`);

        const roleIconEl = document.getElementById('insp-role-icon');
        const roleNameEl = document.getElementById('insp-role-name');
        if (roleIconEl) roleIconEl.src = AssetRegistry.resolve(h.roleIcon || 'ui_mega_pack/roles/role_fighter.webp');
        if (roleNameEl) roleNameEl.textContent = h.role;

        const laneIconEl = document.getElementById('insp-lane-icon');
        const laneNameEl = document.getElementById('insp-lane-name');
        if (laneIconEl) laneIconEl.src = AssetRegistry.resolve(h.laneIcon || 'ui_mega_pack/roles/lane_exp.webp');
        if (laneNameEl) laneNameEl.textContent = h.lane;

        // Frames according to team
        const frameSrc = AssetRegistry.resolve(`ui_assets/skill_frame_${h.teamKey || 'dream'}.webp`);
        document.querySelectorAll('.skill-circle-wrap:not(.skill-ult-wrap) .skill-frame-img').forEach(img => {
            img.src = frameSrc;
        });

        // Skill Icons
        const pIcon = document.getElementById('insp-icon-passive');
        if (pIcon) pIcon.src = AssetRegistry.resolve(h.skillIcons?.passive || `skill_icons/${h.team}/${h.slug}_passive.webp`);

        const s1Icon = document.getElementById('insp-icon-s1');
        if (s1Icon) s1Icon.src = AssetRegistry.resolve(h.skillIcons?.s1 || `skill_icons/${h.team}/${h.slug}_s1.webp`);

        const s2Icon = document.getElementById('insp-icon-s2');
        if (s2Icon) s2Icon.src = AssetRegistry.resolve(h.skillIcons?.s2 || `skill_icons/${h.team}/${h.slug}_s2.webp`);

        const ultIcon = document.getElementById('insp-icon-ult');
        if (ultIcon) ultIcon.src = AssetRegistry.resolve(h.skillIcons?.ult || `skill_icons/${h.team}/${h.slug}_ult.webp`);

        // 2D Weapon Preview Icon
        const wpnIcon = document.getElementById('insp-icon-weapon');
        if (wpnIcon) wpnIcon.src = AssetRegistry.resolve(h.weaponPreview2D || `weapons_preview_2d/${h.team}/${h.slug}_weapon.png`);

        // Default tooltip to passive
        this.showSkillTooltip(h.passive?.name || 'Pasif', h.passive?.desc || 'Efek pasif bawaan hero.');
    }

    showSkillTooltip(title, desc) {
        const titleEl = document.getElementById('insp-skill-active-title');
        const descEl = document.getElementById('insp-skill-active-desc');
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = desc;
    }

    wireEvents() {
        // Search Input
        const searchInput = document.getElementById('roster-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                this.renderRoster();
            });
        }

        // Team Tabs
        document.querySelectorAll('.team-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.team-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTeamFilter = btn.dataset.team;
                this.renderRoster();
                AudioManager.play('ui_click');
            });
        });

        // Role Filters
        document.querySelectorAll('[data-filter-role]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-filter-role]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentRoleFilter = btn.dataset.filterRole;
                this.renderRoster();
                AudioManager.play('ui_click');
            });
        });

        // Lane Filters
        document.querySelectorAll('[data-filter-lane]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-filter-lane]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentLaneFilter = btn.dataset.filterLane;
                this.renderRoster();
                AudioManager.play('ui_click');
            });
        });

        // Skill Tooltip Clicks
        const skillPassive = document.getElementById('insp-skill-p');
        if (skillPassive) {
            skillPassive.addEventListener('click', () => {
                this.showSkillTooltip(this.selectedHero.passive?.name || 'Pasif', this.selectedHero.passive?.desc || '');
                AudioManager.play('ui_hover');
            });
        }

        const skill1 = document.getElementById('insp-skill-1');
        if (skill1) {
            skill1.addEventListener('click', () => {
                this.showSkillTooltip(this.selectedHero.skill1?.name || 'Skill 1', this.selectedHero.skill1?.desc || '');
                AudioManager.play('ui_hover');
            });
        }

        const skill2 = document.getElementById('insp-skill-2');
        if (skill2) {
            skill2.addEventListener('click', () => {
                this.showSkillTooltip(this.selectedHero.skill2?.name || 'Skill 2', this.selectedHero.skill2?.desc || '');
                AudioManager.play('ui_hover');
            });
        }

        const skillUlt = document.getElementById('insp-skill-ult');
        if (skillUlt) {
            skillUlt.addEventListener('click', () => {
                this.showSkillTooltip(this.selectedHero.ultimate?.name || 'Ultimate', this.selectedHero.ultimate?.desc || '');
                AudioManager.play('ui_hover');
            });
        }

        const skillWpn = document.getElementById('insp-wpn-slot');
        if (skillWpn) {
            skillWpn.addEventListener('click', () => {
                const w = this.selectedHero.weapon;
                this.showSkillTooltip(typeof w === 'object' ? w.name : w, typeof w === 'object' ? w.description : 'Senjata legendaris khas hero.');
                AudioManager.play('ui_hover');
            });
        }

        // Audition Voice Button
        const btnVoice = document.getElementById('btn-audition-voice');
        if (btnVoice) {
            btnVoice.addEventListener('click', () => {
                const audioClips = this.selectedHero.audio;
                const clip = audioClips?.ult || audioClips?.s1 || audioClips?.basic;
                if (clip) {
                    const audioUrl = AssetRegistry.resolve(clip);
                    const aud = new Audio(audioUrl);
                    aud.volume = 0.85;
                    aud.play().catch(() => {});
                }
            });
        }

        // Spell Thumbs
        document.querySelectorAll('.spell-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                document.querySelectorAll('.spell-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                this.selectedSpell = thumb.dataset.spell;
                AudioManager.play('ui_click');
            });
        });

        // Sandbox Landmark Thumbs
        document.querySelectorAll('.sandbox-card-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                document.querySelectorAll('.sandbox-card-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                this.selectedSandboxSpawn = {
                    x: parseFloat(thumb.dataset.x) || 0,
                    z: parseFloat(thumb.dataset.z) || 0,
                    name: thumb.dataset.name || 'Kubah Plaza'
                };
                AudioManager.play('ui_click');
            });
        });

        // Arena Card Thumbs
        document.querySelectorAll('.arena-card-thumb').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.arena-card-thumb').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.selectedArena = card.dataset.arena;
                AudioManager.play('ui_click');
            });
        });

        // Header Navigation Modals
        const modalMap = {
            'btn-shop-modal': 'shop',
            'btn-gacha-modal': 'gacha',
            'btn-inventory-modal': 'inventory',
            'btn-rank-modal': 'rank',
            'btn-codex-modal': 'codex',
            'btn-daily-modal': 'daily',
            'btn-friends-modal': 'friends',
            'btn-settings-modal': 'settings',
            'btn-header-bp': 'battlepass'
        };

        for (const [btnId, modalName] of Object.entries(modalMap)) {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    AudioManager.play('ui_click');
                    this.onOpenModal(modalName);
                });
            }
        }

        // Audio Mute Toggle
        const btnAudio = document.getElementById('btn-audio-toggle');
        if (btnAudio) {
            btnAudio.addEventListener('click', () => {
                const isMuted = AudioManager.toggleMute();
                const img = document.getElementById('img-audio-state');
                if (img) {
                    img.src = AssetRegistry.resolve(isMuted ? 'ui_mega_pack/system/icon_audio_mute.webp' : 'ui_mega_pack/system/icon_audio_on.webp');
                }
            });
        }

        // Fullscreen Toggle
        const btnFs = document.getElementById('btn-fullscreen-toggle');
        if (btnFs) {
            btnFs.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen?.().catch(() => {});
                } else {
                    document.exitFullscreen?.().catch(() => {});
                }
            });
        }

        // =======================================================================
        // LAUNCH DOCK BUTTONS (MASUK ARENA & MASUK SANDBOX)
        // =======================================================================
        const btnArena = document.getElementById('btn-enter-arena');
        if (btnArena) {
            btnArena.addEventListener('click', () => {
                AudioManager.play('match_start');
                // If preview hero selected, use last playable hero
                const heroToLaunch = this.selectedHero.is3DActive ? this.selectedHero : this.lastPlayableHero;
                this.onEnterArena(heroToLaunch.id, this.selectedArena, this.selectedSpell);
            });
        }

        const btnSandbox = document.getElementById('btn-enter-sandbox');
        if (btnSandbox) {
            btnSandbox.addEventListener('click', () => {
                AudioManager.play('ui_click');
                AudioManager.play('portal_warp');
                const heroToLaunch = this.selectedHero.is3DActive ? this.selectedHero : this.lastPlayableHero;
                this.onEnterSandbox(heroToLaunch.id, this.selectedSandboxSpawn);
            });
        }
    }
}
