/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/ui/LoadingAndLobbyUI.js
 * 
 * Master Loading Screen Coordinator & 42-Hero Selection Lobby Controller
 */

import { getAllHeroes, getHeroById } from '../config/rosterData.js';
import { PortraitCropper } from '../core/PortraitCropper.js';
import { SaveSystem } from '../core/SaveSystem.js';

export class LoadingAndLobbyUI {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container
     * @param {Function} options.onSelectHero
     * @param {Function} options.onEnterSandbox
     * @param {Function} options.onEnterArena
     * @param {Function} options.onOpenModal
     */
    constructor({ container, onSelectHero, onEnterSandbox, onEnterArena, onOpenModal }) {
        this.container = container;
        this.onSelectHero = onSelectHero || (() => {});
        this.onEnterSandbox = onEnterSandbox || (() => {});
        this.onEnterArena = onEnterArena || (() => {});
        this.onOpenModal = onOpenModal || (() => {});

        this.allHeroes = getAllHeroes();
        this.selectedHero = getHeroById('freya') || this.allHeroes[0];
        this.currentTeamFilter = 'all';
        this.onlyReadyFilter = false;
        this.searchQuery = '';
        this.selectedArena = 'arena_colosseum';
        this.selectedSpell = 'spell_flicker';

        this.initDOM();
    }

    initDOM() {
        this.container.innerHTML = `
            <div class="lobby-screen">
                <!-- Top Navigation Header -->
                <header class="lobby-header">
                    <div class="header-left">
                        <span class="brand-badge">⚡ ONYXPURE</span>
                        <div class="rank-badge-box">
                            <span id="header-rank-icon">👑</span>
                            <span id="header-rank-name">Trainee I</span>
                        </div>
                    </div>

                    <div class="header-currencies">
                        <div class="curr-pill">💎 <span id="header-gems">480</span></div>
                        <div class="curr-pill">⭐ <span id="header-coins">3,500</span></div>
                        <div class="curr-pill">🎫 <span id="header-tickets">8</span></div>
                    </div>

                    <div class="header-right">
                        <button class="btn-header-icon" id="btn-shop-modal" title="Item Shop">🛒</button>
                        <button class="btn-header-icon" id="btn-gacha-modal" title="Gacha Summon">🎁</button>
                        <button class="btn-header-icon" id="btn-rank-modal" title="Leaderboard">🏆</button>
                        <button class="btn-header-icon" id="btn-settings-modal" title="Pengaturan & HUD">⚙️</button>
                    </div>
                </header>

                <div class="lobby-body">
                    <!-- Left Roster Panel -->
                    <aside class="roster-panel">
                        <div class="roster-tabs">
                            <button class="roster-tab active" data-team="all">SEMUA (42)</button>
                            <button class="roster-tab" data-team="team_dream">DREAM</button>
                            <button class="roster-tab" data-team="team_love">LOVE</button>
                            <button class="roster-tab" data-team="team_passion">PASSION</button>
                        </div>

                        <div class="roster-filters">
                            <input type="text" class="search-input" id="roster-search" placeholder="Cari nama member atau role...">
                            <label class="toggle-ready-box">
                                <input type="checkbox" id="toggle-ready">
                                <span>Hanya 3D Aktif (6 Hero)</span>
                            </label>
                        </div>

                        <div class="roster-grid" id="roster-cards-container"></div>
                    </aside>

                    <!-- Center 3D Viewport is rendered behind via Three.js canvas -->
                    <main class="center-viewport" id="lobby-viewport"></main>

                    <!-- Right Inspector Panel -->
                    <aside class="inspector-panel">
                        <div class="inspector-hero-header">
                            <h2 class="inspector-hero-name" id="insp-name">Freya</h2>
                            <p class="inspector-hero-title" id="insp-title">Caramel Cholerics • Fighter / EXP Lane</p>
                        </div>

                        <div class="inspector-section-title">Senjata Legendaris</div>
                        <div class="skill-card">
                            <span style="font-size: 1.5rem;">⚔️</span>
                            <div class="skill-card-body">
                                <div class="skill-card-name" id="insp-weapon-name">Valkyrie Twin Skyblades</div>
                                <div class="skill-card-desc" id="insp-weapon-desc">Pedang kembar berkilau cyan melambangkan sayap pelindung langit.</div>
                            </div>
                        </div>

                        <div class="inspector-section-title">Kemampuan Kombat (Passive, Q, W, R)</div>
                        <div class="skills-list" id="insp-skills-container"></div>

                        <!-- Dual Action Buttons -->
                        <div class="lobby-actions">
                            <button class="btn-sandbox" id="btn-launch-sandbox">
                                <span>🌿 SANDBOX</span>
                                <small style="font-size: 0.68rem; opacity: 0.85;">Jelajah Mega Terarium 220M</small>
                            </button>
                            <button class="btn-arena" id="btn-launch-arena">
                                <span>⚔️ MULAI ARENA</span>
                                <small style="font-size: 0.68rem; opacity: 0.85;">Pertarungan MOBA 160M</small>
                            </button>
                        </div>
                    </aside>
                </div>
            </div>
        `;

        this.wireEvents();
        this.renderRosterList();
        this.updateInspector(this.selectedHero);
        this.updateCurrencies();
    }

    wireEvents() {
        // Tab Filters
        const tabs = this.container.querySelectorAll('.roster-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTeamFilter = tab.dataset.team;
                this.renderRosterList();
            });
        });

        // Search Input
        const searchInput = this.container.querySelector('#roster-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderRosterList();
            });
        }

        // 3D Ready Checkbox
        const toggleReady = this.container.querySelector('#toggle-ready');
        if (toggleReady) {
            toggleReady.addEventListener('change', (e) => {
                this.onlyReadyFilter = e.target.checked;
                this.renderRosterList();
            });
        }

        // Top Modal Buttons
        this.container.querySelector('#btn-shop-modal')?.addEventListener('click', () => this.onOpenModal('shop'));
        this.container.querySelector('#btn-gacha-modal')?.addEventListener('click', () => this.onOpenModal('gacha'));
        this.container.querySelector('#btn-rank-modal')?.addEventListener('click', () => this.onOpenModal('rank'));
        this.container.querySelector('#btn-settings-modal')?.addEventListener('click', () => this.onOpenModal('settings'));

        // Dual Launch Buttons
        this.container.querySelector('#btn-launch-sandbox')?.addEventListener('click', () => {
            this.onEnterSandbox(this.selectedHero);
        });

        this.container.querySelector('#btn-launch-arena')?.addEventListener('click', () => {
            this.onEnterArena(this.selectedHero, this.selectedArena, this.selectedSpell);
        });
    }

    async renderRosterList() {
        const container = this.container.querySelector('#roster-cards-container');
        if (!container) return;
        container.innerHTML = '';

        const filtered = this.allHeroes.filter(h => {
            if (this.currentTeamFilter !== 'all' && h.team !== this.currentTeamFilter) return false;
            if (this.onlyReadyFilter && !h.is3DActive) return false;
            if (this.searchQuery) {
                const matchName = h.name.toLowerCase().includes(this.searchQuery);
                const matchRole = (h.role || '').toLowerCase().includes(this.searchQuery);
                if (!matchName && !matchRole) return false;
            }
            return true;
        });

        for (const h of filtered) {
            const card = document.createElement('div');
            card.className = `roster-card ${h.id === this.selectedHero.id ? 'active' : ''}`;
            card.dataset.heroId = h.id;

            card.innerHTML = `
                <div class="card-avatar-box">
                    <img class="card-avatar-img" id="img-avatar-${h.id}" alt="${h.name}">
                </div>
                <div class="card-info">
                    <div class="card-name">${h.name}</div>
                    <div class="card-meta">${h.role || 'Hero'} • ${h.lane || 'Lane'}</div>
                </div>
                ${h.is3DActive ? '<span class="badge-3d-ready">3D READY</span>' : ''}
            `;

            card.addEventListener('click', () => {
                this.container.querySelectorAll('.roster-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.selectedHero = h;
                this.updateInspector(h);
                this.onSelectHero(h);
            });

            container.appendChild(card);

            // Lazy async load cropped avatar
            PortraitCropper.getCroppedPortrait(h, 'avatar').then(url => {
                const img = this.container.querySelector(`#img-avatar-${h.id}`);
                if (img) img.src = url;
            });
        }
    }

    updateInspector(hero) {
        if (!hero) return;

        const nameEl = this.container.querySelector('#insp-name');
        const titleEl = this.container.querySelector('#insp-title');
        const weaponNameEl = this.container.querySelector('#insp-weapon-name');
        const weaponDescEl = this.container.querySelector('#insp-weapon-desc');
        const skillsContainer = this.container.querySelector('#insp-skills-container');

        if (nameEl) nameEl.textContent = hero.name;
        if (titleEl) titleEl.textContent = `${hero.title || hero.name} • ${hero.role} / ${hero.lane} Lane`;

        if (weaponNameEl) weaponNameEl.textContent = hero.weapon?.name || 'Senjata Khas';
        if (weaponDescEl) weaponDescEl.textContent = hero.weapon?.description || 'Senjata legendaris hero.';

        if (skillsContainer && hero.skills) {
            skillsContainer.innerHTML = '';
            const skillEntries = [
                { key: 'passive', label: 'PASSIVE', data: hero.passive || hero.skills.passive },
                { key: 'q', label: 'SKILL 1 (Q)', data: hero.skills.q || hero.skill1 },
                { key: 'w', label: 'SKILL 2 (W)', data: hero.skills.w || hero.skill2 },
                { key: 'r', label: 'ULTIMATE (R)', data: hero.skills.r || hero.ultimate }
            ];

            for (const item of skillEntries) {
                if (!item.data) continue;
                const card = document.createElement('div');
                card.className = 'skill-card';
                card.innerHTML = `
                    <div style="font-size: 0.72rem; font-weight: 800; color: var(--gold);">${item.label}</div>
                    <div class="skill-card-body">
                        <div class="skill-card-name">${item.data.name || item.label}</div>
                        <div class="skill-card-desc">${item.data.description || item.data.desc || ''}</div>
                    </div>
                `;
                skillsContainer.appendChild(card);
            }
        }
    }

    updateCurrencies() {
        const data = SaveSystem.data;
        const gems = this.container.querySelector('#header-gems');
        const coins = this.container.querySelector('#header-coins');
        const tickets = this.container.querySelector('#header-tickets');

        if (gems) gems.textContent = data.onyxGems.toLocaleString();
        if (coins) coins.textContent = data.starCoins.toLocaleString();
        if (tickets) tickets.textContent = data.gachaTickets.toLocaleString();
    }
}
