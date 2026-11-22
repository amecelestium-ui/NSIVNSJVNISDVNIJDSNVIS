/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/ui/CombatHudUI.js
 * 
 * Mobile Legends Multi-Touch Combat HUD Controller:
 * - Independent Pointer Capture (Analog, Camera Orbit, Aiming, Attacks)
 * - Minimap Radar Canvas Rendering & Fast Travel
 * - Dynamic Status Bars (HP, Shield, Mana) & Skill Radial Cooldowns
 * - Photo Mode Toggle
 */

import { FAST_TRAVEL_WAYPOINTS } from '../config/worldLayoutData.js';

export class CombatHudUI {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container
     * @param {Object} options.hero
     * @param {string} options.mode 'sandbox' or 'arena'
     * @param {Object} options.targetingSystem
     * @param {Function} options.onMoveInput
     * @param {Function} options.onBasicAttack
     * @param {Function} options.onSkillCast
     * @param {Function} options.onFastTravel
     * @param {Function} options.onReturnToLobby
     */
    constructor({ container, hero, mode = 'sandbox', targetingSystem, onMoveInput, onBasicAttack, onSkillCast, onFastTravel, onReturnToLobby }) {
        this.container = container;
        this.hero = hero;
        this.mode = mode;
        this.targeting = targetingSystem;
        this.onMoveInput = onMoveInput || (() => {});
        this.onBasicAttack = onBasicAttack || (() => {});
        this.onSkillCast = onSkillCast || (() => {});
        this.onFastTravel = onFastTravel || (() => {});
        this.onReturnToLobby = onReturnToLobby || (() => {});

        this.joystickPointerId = null;
        this.joystickCenter = { x: 0, y: 0 };
        this.joystickRadius = 55;

        this.isAimingSkill = null;
        this.aimPointerId = null;
        this.aimStartPos = { x: 0, y: 0 };

        this.cooldowns = { q: 0, w: 0, r: 0, spell: 0 };
        this.isPhotoMode = false;

        this.initDOM();
        this.initMinimap();
    }

    initDOM() {
        this.container.innerHTML = `
            <div class="combat-hud" id="hud-root">
                <!-- Top Status Bar -->
                <div class="combat-top-bar">
                    <div class="top-left-cluster">
                        <!-- Minimap Radar -->
                        <div class="minimap-container">
                            <canvas class="minimap-canvas" id="minimap-canvas" width="140" height="140"></canvas>
                            <span class="minimap-label" id="minimap-label">${this.mode === 'sandbox' ? 'TERARIUM 220M' : 'ARENA 160M'}</span>
                        </div>

                        <!-- Sandbox Fast Travel -->
                        ${this.mode === 'sandbox' ? `
                            <div class="fast-travel-panel">
                                <button class="btn-fast-travel" data-wp="plaza">🏛️ Plaza</button>
                                <button class="btn-fast-travel" data-wp="cafe">☕ Cafe</button>
                                <button class="btn-fast-travel" data-wp="village">🏘️ Desa</button>
                                <button class="btn-fast-travel" data-wp="aquifer">💧 Akuifer</button>
                            </div>
                        ` : `
                            <div class="match-scoreboard">
                                <span class="score-dream" id="score-blue">0</span>
                                <span class="match-timer" id="match-timer-label">00:00</span>
                                <span class="score-passion" id="score-red">0</span>
                            </div>
                        `}
                    </div>

                    <div class="top-right-cluster">
                        <button class="btn-header-icon" id="btn-toggle-cam" title="Ganti Sudut Kamera">🎥</button>
                        <button class="btn-header-icon" id="btn-photo-mode" title="Photo Mode">📷</button>
                        <button class="btn-header-icon" id="btn-exit-to-lobby" title="Kembali ke Lobi">🏠</button>
                    </div>
                </div>

                <!-- Bottom Center Status Bars -->
                <div class="player-status-container">
                    <div class="bar-track">
                        <div class="bar-fill-hp" id="bar-hp"></div>
                        <div class="bar-fill-shield" id="bar-shield"></div>
                    </div>
                    <div class="bar-track" style="height: 6px;">
                        <div class="bar-fill-mana" id="bar-mana"></div>
                    </div>
                </div>

                <!-- Bottom Left Analog Joystick -->
                <div class="joystick-zone" id="joy-zone">
                    <div class="joystick-base" id="joy-base">
                        <div class="joystick-thumb" id="joy-thumb"></div>
                    </div>
                </div>

                <!-- Cancel Aim Zone (✕) -->
                <div class="cancel-aim-zone" id="cancel-zone">✕</div>

                <!-- Utility Bar -->
                <div class="utility-bar">
                    <button class="btn-utility" id="btn-recall">🌀<span>Recall</span></button>
                    <button class="btn-utility" id="btn-regen">💚<span>Regen</span></button>
                    <button class="btn-utility" id="btn-spell">⚡<span>Spell</span></button>
                </div>

                <!-- Bottom Right Combat Cluster -->
                <div class="combat-cluster">
                    <!-- Basic Attack (92px Weapon) -->
                    <button class="btn-basic-attack" id="btn-basic-atk">
                        <span style="font-size: 2.2rem;">⚔️</span>
                    </button>

                    <!-- Priority Buttons -->
                    <button class="btn-priority-minion" id="btn-prio-minion" title="Prioritas Minion">👾</button>
                    <button class="btn-priority-turret" id="btn-prio-turret" title="Prioritas Turret">🗼</button>

                    <!-- Skill Buttons -->
                    <button class="skill-button skill-btn-q" id="btn-skill-q">
                        <span style="font-size: 1.2rem; font-weight: 800;">Q</span>
                        <div class="skill-cooldown-overlay" id="cd-q" style="display: none;">0</div>
                    </button>

                    <button class="skill-button skill-btn-w" id="btn-skill-w">
                        <span style="font-size: 1.2rem; font-weight: 800;">W</span>
                        <div class="skill-cooldown-overlay" id="cd-w" style="display: none;">0</div>
                    </button>

                    <button class="skill-button skill-btn-r" id="btn-skill-r">
                        <span style="font-size: 1.4rem; font-weight: 900; color: var(--gold);">R</span>
                        <div class="skill-cooldown-overlay" id="cd-r" style="display: none;">0</div>
                    </button>
                </div>
            </div>
        `;

        this.wireControls();
    }

    wireControls() {
        // Fast travel buttons
        this.container.querySelectorAll('.btn-fast-travel').forEach(btn => {
            btn.addEventListener('click', () => {
                const wp = FAST_TRAVEL_WAYPOINTS.find(w => w.id === btn.dataset.wp);
                if (wp) this.onFastTravel(wp);
            });
        });

        // Top Buttons
        this.container.querySelector('#btn-toggle-cam')?.addEventListener('click', () => {
            const nextMode = this.targeting.cameraMode === 'genshin' ? 'mlbb' : 'genshin';
            this.targeting.setCameraMode(nextMode);
        });

        this.container.querySelector('#btn-photo-mode')?.addEventListener('click', () => {
            this.togglePhotoMode();
        });

        this.container.querySelector('#btn-exit-to-lobby')?.addEventListener('click', () => {
            this.onReturnToLobby();
        });

        // Joystick Setup
        const joyBase = this.container.querySelector('#joy-base');
        const joyThumb = this.container.querySelector('#joy-thumb');

        if (joyBase && joyThumb) {
            joyBase.addEventListener('pointerdown', (e) => {
                this.joystickPointerId = e.pointerId;
                joyBase.setPointerCapture(e.pointerId);
                const rect = joyBase.getBoundingClientRect();
                this.joystickCenter = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
                this.updateJoystick(e.clientX, e.clientY, joyThumb);
            });

            joyBase.addEventListener('pointermove', (e) => {
                if (e.pointerId === this.joystickPointerId) {
                    this.updateJoystick(e.clientX, e.clientY, joyThumb);
                }
            });

            const endJoy = (e) => {
                if (e.pointerId === this.joystickPointerId) {
                    this.joystickPointerId = null;
                    joyThumb.style.transform = 'translate(0px, 0px)';
                    this.onMoveInput(0, 0);
                }
            };

            joyBase.addEventListener('pointerup', endJoy);
            joyBase.addEventListener('pointercancel', endJoy);
        }

        // Basic Attack Button
        const btnBasic = this.container.querySelector('#btn-basic-atk');
        if (btnBasic) {
            btnBasic.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.onBasicAttack();
            });
        }

        // Priority Buttons
        this.container.querySelector('#btn-prio-minion')?.addEventListener('click', () => {
            this.targeting.setPriorityTarget('minion');
        });
        this.container.querySelector('#btn-prio-turret')?.addEventListener('click', () => {
            this.targeting.setPriorityTarget('turret');
        });

        // Skill Buttons Aiming
        this.wireSkillAim('q', '#btn-skill-q', false);
        this.wireSkillAim('w', '#btn-skill-w', false);
        this.wireSkillAim('r', '#btn-skill-r', true);
    }

    wireSkillAim(slot, selector, isAoE) {
        const btn = this.container.querySelector(selector);
        const cancelZone = this.container.querySelector('#cancel-zone');
        if (!btn) return;

        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.isAimingSkill = slot;
            this.aimPointerId = e.pointerId;
            btn.setPointerCapture(e.pointerId);
            this.aimStartPos = { x: e.clientX, y: e.clientY };

            this.targeting.startAiming(slot, isAoE);
            if (cancelZone) cancelZone.classList.add('visible');
        });

        btn.addEventListener('pointermove', (e) => {
            if (e.pointerId !== this.aimPointerId) return;
            const deltaX = e.clientX - this.aimStartPos.x;
            const deltaY = e.clientY - this.aimStartPos.y;

            // Check if cursor hovered over cancel zone
            let isCancel = false;
            if (cancelZone) {
                const rect = cancelZone.getBoundingClientRect();
                isCancel = e.clientX >= rect.left && e.clientX <= rect.right &&
                           e.clientY >= rect.top && e.clientY <= rect.bottom;
                if (isCancel) cancelZone.classList.add('hovered');
                else cancelZone.classList.remove('hovered');
            }

            this.targeting.updateAimDrag(deltaX, deltaY, isCancel);
        });

        const endAim = (e) => {
            if (e.pointerId !== this.aimPointerId) return;
            this.aimPointerId = null;
            this.isAimingSkill = null;

            if (cancelZone) {
                cancelZone.classList.remove('visible', 'hovered');
            }

            const result = this.targeting.endAiming();
            if (!result.cancelled) {
                this.onSkillCast(slot, result.aimDir, result.target);
            }
        };

        btn.addEventListener('pointerup', endAim);
        btn.addEventListener('pointercancel', endAim);
    }

    updateJoystick(clientX, clientY, thumbEl) {
        let dx = clientX - this.joystickCenter.x;
        let dy = clientY - this.joystickCenter.y;
        const dist = Math.hypot(dx, dy);

        if (dist > this.joystickRadius) {
            dx = (dx / dist) * this.joystickRadius;
            dy = (dy / dist) * this.joystickRadius;
        }

        thumbEl.style.transform = `translate(${dx}px, ${dy}px)`;

        // Normalize input vector -1 to 1
        const normX = dx / this.joystickRadius;
        const normY = dy / this.joystickRadius;
        this.onMoveInput(normX, normY);
    }

    initMinimap() {
        this.minimapCanvas = this.container.querySelector('#minimap-canvas');
        if (this.minimapCanvas) {
            this.minimapCtx = this.minimapCanvas.getContext('2d');
        }
    }

    updateMinimap(playerPos, playerYaw, allEntities = []) {
        if (!this.minimapCtx || !playerPos) return;
        const ctx = this.minimapCtx;
        const size = 140;
        const half = size / 2;
        const worldRange = this.mode === 'sandbox' ? 220 : 120;
        const scale = half / worldRange;

        ctx.clearRect(0, 0, size, size);

        // Radar background circle
        ctx.fillStyle = '#0a0f1d';
        ctx.beginPath();
        ctx.arc(half, half, half - 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw entities
        for (const e of allEntities) {
            if (!e || e.hp <= 0) continue;
            const ex = half + e.position.x * scale;
            const ez = half + e.position.z * scale;

            ctx.fillStyle = e.team === 'team_dream' ? '#38bdf8' : '#ef4444';
            ctx.beginPath();
            ctx.arc(ex, ez, e.isTurret ? 4.5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Player blip
        const px = half + playerPos.x * scale;
        const pz = half + playerPos.z * scale;

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(px, pz, 4, 0, Math.PI * 2);
        ctx.fill();

        // Player forward arrow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, pz);
        ctx.lineTo(px + Math.sin(playerYaw) * 9, pz + Math.cos(playerYaw) * 9);
        ctx.stroke();
    }

    updateStatusBars(hp, maxHp, shield = 0, mana = 100, maxMana = 100) {
        const barHp = this.container.querySelector('#bar-hp');
        const barShield = this.container.querySelector('#bar-shield');
        const barMana = this.container.querySelector('#bar-mana');

        if (barHp) {
            const hpRatio = Math.max(0, Math.min(1, hp / (maxHp || 1)));
            barHp.style.width = `${hpRatio * 100}%`;
        }

        if (barShield) {
            const shieldRatio = Math.max(0, Math.min(1, shield / (maxHp || 1)));
            barShield.style.width = `${shieldRatio * 100}%`;
        }

        if (barMana) {
            const manaRatio = Math.max(0, Math.min(1, mana / (maxMana || 1)));
            barMana.style.width = `${manaRatio * 100}%`;
        }
    }

    togglePhotoMode() {
        this.isPhotoMode = !this.isPhotoMode;
        const root = this.container.querySelector('#hud-root');
        if (root) {
            root.classList.toggle('photo-mode-active', this.isPhotoMode);
        }
    }
}
