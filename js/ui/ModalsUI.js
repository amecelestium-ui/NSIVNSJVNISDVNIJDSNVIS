/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/ui/ModalsUI.js
 * 
 * Modals Controller:
 * - 24 Item Shop + Buy Mechanics
 * - Gacha Summon Vortex with 5 Chests
 * - Rank & Leaderboard Display
 * - Settings & Live Custom HUD Layout Editor (--hud-scale, --hud-alpha)
 */

import { SHOP_ITEMS, GACHA_CHESTS, RANK_TIERS } from '../config/itemsAndSpells.js';
import { SaveSystem } from '../core/SaveSystem.js';
import { AudioManager } from '../vfx_audio/AudioManager.js';

export class ModalsUI {
    /**
     * @param {HTMLElement} container
     */
    constructor(container) {
        this.container = container;
        this.activeModal = null;
        this.currentShopCategory = 'all';

        this.initDOM();
        this.wireGlobalEvents();
    }

    initDOM() {
        this.container.innerHTML = `
            <!-- 1. ITEM SHOP MODAL -->
            <div class="modal-backdrop" id="modal-shop">
                <div class="modal-window">
                    <div class="modal-header">
                        <div class="modal-title">🛒 24 Item Armory Shop</div>
                        <button class="btn-close-modal" data-close="shop">✕</button>
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

            <!-- 2. GACHA SUMMON MODAL -->
            <div class="modal-backdrop" id="modal-gacha">
                <div class="modal-window">
                    <div class="modal-header">
                        <div class="modal-title">🎁 Gacha Celestial Chest Vault</div>
                        <button class="btn-close-modal" data-close="gacha">✕</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
                            Buka peti mistis menggunakan Onyx Gems atau Gacha Ticket untuk memperoleh koin, exp core, dan reward eksklusif!
                        </p>
                        <div class="gacha-chests-row" id="gacha-chests-container"></div>
                    </div>
                </div>
            </div>

            <!-- 3. RANK & LEADERBOARD MODAL -->
            <div class="modal-backdrop" id="modal-rank">
                <div class="modal-window">
                    <div class="modal-header">
                        <div class="modal-title">🏆 Peringkat & Leaderboard</div>
                        <button class="btn-close-modal" data-close="rank">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="text-align: center; margin-bottom: 18px;">
                            <div style="font-size: 2.8rem;">👑</div>
                            <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--gold);" id="rank-modal-current">Trainee I</h3>
                            <p style="font-size: 0.82rem; color: var(--text-muted);">Bintang: ⭐⭐⭐ / 5</p>
                        </div>
                        <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 8px;">Daftar 9 Tier Peringkat:</div>
                        <div style="display: flex; flex-direction: column; gap: 6px;" id="rank-tiers-list"></div>
                    </div>
                </div>
            </div>

            <!-- 4. SETTINGS & LIVE CUSTOM HUD LAYOUT EDITOR -->
            <div class="modal-backdrop" id="modal-settings">
                <div class="modal-window">
                    <div class="modal-header">
                        <div class="modal-title">⚙️ Pengaturan & Live Custom HUD Editor</div>
                        <button class="btn-close-modal" data-close="settings">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="settings-section">
                            <div class="settings-section-title">Volume Audio Spasial</div>
                            <div class="setting-row">
                                <span class="setting-label">BGM Music</span>
                                <div class="slider-ctrl">
                                    <input type="range" id="slider-bgm" min="0" max="1" step="0.05" value="0.75">
                                    <span id="val-bgm">75%</span>
                                </div>
                            </div>
                            <div class="setting-row">
                                <span class="setting-label">SFX Kombat & Suara Hero</span>
                                <div class="slider-ctrl">
                                    <input type="range" id="slider-sfx" min="0" max="1" step="0.05" value="0.90">
                                    <span id="val-sfx">90%</span>
                                </div>
                            </div>
                        </div>

                        <div class="settings-section">
                            <div class="settings-section-title">Live Custom HUD Layout Editor</div>
                            <div class="setting-row">
                                <span class="setting-label">Skala Ukuran Tombol & Cluster (70% - 130%)</span>
                                <div class="slider-ctrl">
                                    <input type="range" id="slider-hud-scale" min="0.7" max="1.3" step="0.05" value="1.0">
                                    <span id="val-hud-scale">100%</span>
                                </div>
                            </div>
                            <div class="setting-row">
                                <span class="setting-label">Transparansi / Opasitas HUD (30% - 100%)</span>
                                <div class="slider-ctrl">
                                    <input type="range" id="slider-hud-alpha" min="0.3" max="1.0" step="0.05" value="0.92">
                                    <span id="val-hud-alpha">92%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderShop();
        this.renderGacha();
        this.renderRanks();
    }

    wireGlobalEvents() {
        // Close Buttons
        this.container.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal(btn.dataset.close);
            });
        });

        // Shop Tabs
        this.container.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.container.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentShopCategory = tab.dataset.cat;
                this.renderShop();
            });
        });

        // Audio Sliders
        const sliderBgm = this.container.querySelector('#slider-bgm');
        if (sliderBgm) {
            sliderBgm.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.container.querySelector('#val-bgm').textContent = `${Math.round(val * 100)}%`;
                AudioManager.setBgmVolume(val);
            });
        }

        const sliderSfx = this.container.querySelector('#slider-sfx');
        if (sliderSfx) {
            sliderSfx.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.container.querySelector('#val-sfx').textContent = `${Math.round(val * 100)}%`;
                AudioManager.setSfxVolume(val);
            });
        }

        // Live Custom HUD Sliders
        const sliderHudScale = this.container.querySelector('#slider-hud-scale');
        if (sliderHudScale) {
            sliderHudScale.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.container.querySelector('#val-hud-scale').textContent = `${Math.round(val * 100)}%`;
                document.documentElement.style.setProperty('--hud-scale', val);
                SaveSystem.updateSetting('hudScale', val);
            });
        }

        const sliderHudAlpha = this.container.querySelector('#slider-hud-alpha');
        if (sliderHudAlpha) {
            sliderHudAlpha.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.container.querySelector('#val-hud-alpha').textContent = `${Math.round(val * 100)}%`;
                document.documentElement.style.setProperty('--hud-alpha', val);
                SaveSystem.updateSetting('hudAlpha', val);
            });
        }
    }

    openModal(modalKey) {
        const modal = this.container.querySelector(`#modal-${modalKey}`);
        if (modal) {
            modal.classList.add('active');
            this.activeModal = modal;
        }
    }

    closeModal(modalKey) {
        const modal = this.container.querySelector(`#modal-${modalKey}`);
        if (modal) {
            modal.classList.remove('active');
            this.activeModal = null;
        }
    }

    renderShop() {
        const container = this.container.querySelector('#shop-items-container');
        if (!container) return;
        container.innerHTML = '';

        const items = SHOP_ITEMS.filter(it => this.currentShopCategory === 'all' || it.category === this.currentShopCategory);

        for (const it of items) {
            const card = document.createElement('div');
            card.className = 'shop-item-card';
            card.innerHTML = `
                <div class="shop-item-header">
                    <span class="shop-item-name">${it.name}</span>
                    <span class="shop-item-cost">💰 ${it.cost}</span>
                </div>
                <div class="shop-item-desc">${it.description}</div>
            `;
            container.appendChild(card);
        }
    }

    renderGacha() {
        const container = this.container.querySelector('#gacha-chests-container');
        if (!container) return;
        container.innerHTML = '';

        for (const [key, chest] of Object.entries(GACHA_CHESTS)) {
            const card = document.createElement('div');
            card.className = 'gacha-card';
            card.innerHTML = `
                <div class="gacha-chest-icon">📦</div>
                <div class="gacha-chest-name">${chest.name}</div>
                <button class="btn-open-chest" data-chest="${key}">Buka (${chest.costGems} 💎)</button>
            `;

            card.querySelector('.btn-open-chest').addEventListener('click', () => {
                if (SaveSystem.data.onyxGems >= chest.costGems) {
                    SaveSystem.addCurrency('onyxGems', -chest.costGems);
                    alert(`Selamat! Anda membuka ${chest.name} dan mendapatkan hadiah!`);
                } else {
                    alert('Onyx Gems tidak mencukupi!');
                }
            });

            container.appendChild(card);
        }
    }

    renderRanks() {
        const container = this.container.querySelector('#rank-tiers-list');
        if (!container) return;
        container.innerHTML = '';

        for (const r of RANK_TIERS) {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; padding: 6px 12px; background: var(--bg-card); border-radius: 6px; font-size: 0.8rem;';
            row.innerHTML = `
                <span>Tier ${r.tier}: <strong>${r.name}</strong></span>
                <span style="color: var(--gold);">Butuh ${r.starsNeeded} Bintang</span>
            `;
            container.appendChild(row);
        }
    }
}
