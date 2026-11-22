/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/ui/CombatHudUI.js
 * 
 * Mobile Legends Multi-Touch Combat HUD & Sandbox Controller:
 * - 100% Real Image Assets for HP, Mana, Shield, Ult Charge, and Enemy HP Bars
 * - Real analog_ring_gold.webp for Analog Joystick
 * - Target Minion, Target Turret, Regen, Recall, Spells, Emotes
 * - Minimap with ui_minimap_frame.webp & Fast Travel
 * - Live Network Telemetry (P2P DIRECT / HF RELAY / LOCAL SYNC, Ping RTT)
 * - Zero Emojis!
 */

import { AssetRegistry } from '../core/AssetRegistry.js';
import { AudioManager } from '../vfx_audio/AudioManager.js';

export class CombatHudUI {
    constructor({ container, hero, mode = 'sandbox', targetingSystem, onMoveInput, onBasicAttack, onSkillCast, onFastTravel, onReturnToLobby }) {
        this.container = container;
        this.hero = hero;
        this.mode = mode; // 'sandbox' | 'arena'
        this.targeting = targetingSystem;
        this.onMoveInput = onMoveInput || (() => {});
        this.onBasicAttack = onBasicAttack || (() => {});
        this.onSkillCast = onSkillCast || (() => {});
        this.onFastTravel = onFastTravel || (() => {});
        this.onReturnToLobby = onReturnToLobby || (() => {});

        this.joystickPointerId = null;
        this.joystickCenter = { x: 0, y: 0 };
        this.joystickRadius = 55;

        this.cooldowns = { q: 0, w: 0, r: 0, spell: 0, regen: 0, recall: 0 };
        this.isPhotoMode = false;
        this.networkStats = { mode: 'OFFLINE BOT', pingMs: 12, onlineCount: 1 };

        this.initDOM();
        this.initMinimap();
        this.wireEvents();
    }

    setHero(hero) {
        this.hero = hero;
        this.updateSkillIcons();
    }

    setNetworkStats(stats) {
        if (!stats) return;
        this.networkStats = stats;
        const badge = document.getElementById('hud-net-badge');
        const ping = document.getElementById('hud-net-ping');
        const count = document.getElementById('hud-net-count');
        if (badge) {
            badge.textContent = stats.mode;
            badge.className = `net-badge ${stats.mode === 'P2P DIRECT' ? 'net-p2p' : stats.mode === 'HF RELAY' ? 'net-hf' : 'net-local'}`;
        }
        if (ping) {
            ping.textContent = `${stats.pingMs}ms`;
            ping.style.color = stats.pingMs < 40 ? '#10b981' : stats.pingMs < 120 ? '#f59e0b' : '#ef4444';
        }
        if (count) {
            count.textContent = `Online: ${stats.onlineCount || 1}`;
        }
    }

    initDOM() {
        const teamKey = this.hero.teamKey || (this.hero.team ? this.hero.team.replace('team_', '') : 'dream');
        const skillFrameSrc = AssetRegistry.resolve(`ui_assets/skill_frame_${teamKey}.webp`);
        const ultRingSrc = AssetRegistry.resolve('ui_assets/ui_skill_ring_gold.webp');

        this.container.innerHTML = `
            <div class="combat-hud" id="hud-root">
                <!-- =======================================================================
                     1. TOP BAR (Minimap, Fast Travel / Score, Network Telemetry, System)
                     ======================================================================= -->
                <div class="combat-top-bar">
                    <div class="top-left-cluster">
                        <!-- Minimap Frame -->
                        <div class="minimap-frame-box">
                            <img src="${AssetRegistry.resolve('ui_assets/ui_minimap_frame.webp')}" class="minimap-border-img" alt="Minimap Frame">
                            <canvas class="minimap-canvas" id="minimap-canvas" width="130" height="130"></canvas>
                            <span class="minimap-label" id="minimap-label">${this.mode === 'sandbox' ? 'TERARIUM 220M' : 'ARENA MOBA'}</span>
                        </div>

                        <!-- Sandbox Fast Travel or Arena Scoreboard -->
                        ${this.mode === 'sandbox' ? `
                            <div class="fast-travel-panel">
                                <button class="btn-fast-travel" data-wp="plaza">Plaza (0,0)</button>
                                <button class="btn-fast-travel" data-wp="cafe">Cafe (+38,-2)</button>
                                <button class="btn-fast-travel" data-wp="village">Desa (-56,0)</button>
                                <button class="btn-fast-travel" data-wp="aquifer">Akuifer (0,-56)</button>
                            </div>
                        ` : `
                            <div class="match-scoreboard">
                                <span class="score-dream" id="score-blue">0</span>
                                <span class="match-timer" id="match-timer-label">00:00</span>
                                <span class="score-passion" id="score-red">0</span>
                            </div>
                        `}
                    </div>

                    <!-- Top Right: Telemetry & Navigation Buttons -->
                    <div class="top-right-cluster">
                        <div class="telemetry-pill">
                            <span id="hud-net-badge" class="net-badge net-local">LOCAL SYNC</span>
                            <span id="hud-net-ping" class="net-ping">12ms</span>
                            <span id="hud-net-count" class="net-count">Online: 1</span>
                        </div>
                        <button class="btn-hud-icon" id="btn-toggle-cam" title="Ganti Kamera (3D / Top-Down)">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_camera.webp')}" class="ui-icon-btn" alt="Camera">
                        </button>
                        <button class="btn-hud-icon" id="btn-photo-mode" title="Photo Mode">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_graphics.webp')}" class="ui-icon-btn" alt="Photo Mode">
                        </button>
                        <button class="btn-hud-icon" id="btn-exit-to-lobby" title="Kembali ke Lobi">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_home.webp')}" class="ui-icon-btn" alt="Home">
                        </button>
                    </div>
                </div>

                <!-- =======================================================================
                     2. TARGET MUSUH HP FRAME (Top Center)
                     ======================================================================= -->
                <div class="target-enemy-frame" id="target-enemy-frame" style="display: none;">
                    <div class="target-name-row">
                        <span id="target-enemy-name">Target Musuh</span>
                        <span id="target-enemy-dist">12m</span>
                    </div>
                    <div class="enemy-bar-track">
                        <img src="${AssetRegistry.resolve('ui_assets/bar_frame_bg.webp')}" class="bar-frame-img" alt="Frame">
                        <div class="enemy-bar-fill-wrap">
                            <img src="${AssetRegistry.resolve('ui_assets/bar_enemy_hp_fill.webp')}" id="bar-enemy-hp-fill" class="bar-fill-img" alt="Enemy HP">
                        </div>
                    </div>
                </div>

                <!-- =======================================================================
                     3. PLAYER STATUS BARS & ACTIVE STATUS TRAY (Bottom Center)
                     ======================================================================= -->
                <div class="player-status-container">
                    <!-- 10 Buff/Debuff Status Tray -->
                    <div class="active-status-tray" id="active-status-tray">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_haste.webp')}" class="status-tray-icon" id="status-icon-haste" style="display: none;" alt="Haste">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_shield.webp')}" class="status-tray-icon" id="status-icon-shield" style="display: none;" alt="Shield">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_heal.webp')}" class="status-tray-icon" id="status-icon-heal" style="display: none;" alt="Heal">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_crit.webp')}" class="status-tray-icon" id="status-icon-crit" style="display: none;" alt="Crit">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_burn.webp')}" class="status-tray-icon" id="status-icon-burn" style="display: none;" alt="Burn">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_slow.webp')}" class="status-tray-icon" id="status-icon-slow" style="display: none;" alt="Slow">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_stun.webp')}" class="status-tray-icon" id="status-icon-stun" style="display: none;" alt="Stun">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_root.webp')}" class="status-tray-icon" id="status-icon-root" style="display: none;" alt="Root">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_silence.webp')}" class="status-tray-icon" id="status-icon-silence" style="display: none;" alt="Silence">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/combat/status_invincible.webp')}" class="status-tray-icon" id="status-icon-invincible" style="display: none;" alt="Invincible">
                    </div>

                    <!-- HP Bar (bar_frame_bg, bar_hp_fill, bar_shield_fill) -->
                    <div class="custom-bar-track hp-track">
                        <img src="${AssetRegistry.resolve('ui_assets/bar_frame_bg.webp')}" class="bar-frame-img" alt="Frame">
                        <div class="bar-fill-clip" id="bar-hp-clip">
                            <img src="${AssetRegistry.resolve('ui_assets/bar_hp_fill.webp')}" class="bar-fill-img" alt="HP Fill">
                        </div>
                        <div class="bar-fill-clip shield-clip" id="bar-shield-clip" style="width: 0%;">
                            <img src="${AssetRegistry.resolve('ui_assets/bar_shield_fill.webp')}" class="bar-fill-img" alt="Shield Fill">
                        </div>
                        <span class="bar-num-text" id="bar-hp-text">3100 / 3100</span>
                    </div>

                    <!-- Mana / Energy Bar -->
                    <div class="custom-bar-track mana-track">
                        <img src="${AssetRegistry.resolve('ui_assets/bar_frame_bg.webp')}" class="bar-frame-img" alt="Frame">
                        <div class="bar-fill-clip" id="bar-mana-clip">
                            <img src="${AssetRegistry.resolve('ui_assets/bar_mana_fill.webp')}" class="bar-fill-img" alt="Mana Fill">
                        </div>
                    </div>

                    <!-- Passive / Ult Charge Bar -->
                    <div class="custom-bar-track ult-charge-track">
                        <div class="bar-fill-clip" id="bar-ult-charge-clip" style="width: 0%;">
                            <img src="${AssetRegistry.resolve('ui_assets/bar_ult_charge.webp')}" class="bar-fill-img" alt="Charge Fill">
                        </div>
                    </div>

                    <!-- Utility Action Row (Regen, Recall, Emote, Jump, Sprint) -->
                    <div class="bottom-utility-row">
                        <button class="btn-utility-icon" id="btn-action-recall" title="Recall ke Base (4 Detik)">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_recall.webp')}" class="ui-icon-util" alt="Recall">
                            <span class="util-label">Recall</span>
                        </button>
                        <button class="btn-utility-icon" id="btn-action-regen" title="Regen HP (CD: 45s)">
                            <img src="${AssetRegistry.resolve('combat_markers/btn_regen_heal.webp')}" class="ui-icon-util" alt="Regen">
                            <span class="util-label">Regen</span>
                        </button>
                        <button class="btn-utility-icon" id="btn-action-emote" title="Emote / Pose Karakter">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_emote.webp')}" class="ui-icon-util" alt="Emote">
                            <span class="util-label">Emote</span>
                        </button>
                        <button class="btn-utility-icon" id="btn-action-jump" title="Lompat (Space)">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_jump.webp')}" class="ui-icon-util" alt="Jump">
                            <span class="util-label">Jump</span>
                        </button>
                        <button class="btn-utility-icon" id="btn-action-sprint" title="Sprint (Shift)">
                            <img src="${AssetRegistry.resolve('ui_mega_pack/system/icon_sprint.webp')}" class="ui-icon-util" alt="Sprint">
                            <span class="util-label">Sprint</span>
                        </button>
                    </div>
                </div>

                <!-- =======================================================================
                     4. BOTTOM LEFT: VIRTUAL ANALOG JOYSTICK (analog_ring_gold.webp)
                     ======================================================================= -->
                <div class="joystick-zone" id="joystick-zone">
                    <div class="joystick-ring" id="joystick-ring">
                        <img src="${AssetRegistry.resolve('combat_markers/analog_ring_gold.webp')}" class="analog-ring-img" alt="Analog Ring">
                        <div class="joystick-thumb" id="joystick-thumb"></div>
                    </div>
                </div>

                <!-- =======================================================================
                     5. BOTTOM RIGHT: MLBB COMBAT CLUSTER
                     ======================================================================= -->
                <div class="combat-cluster" id="combat-cluster">
                    <!-- Main Basic Attack Button with Weapon 2D -->
                    <button class="btn-basic-attack" id="btn-basic-attack" title="Serangan Dasar">
                        <img src="${AssetRegistry.resolve(this.hero.weaponPreview2D || 'weapons_preview_2d/team_dream/freya_weapon.png')}" id="img-basic-weapon" class="weapon-basic-icon" alt="Attack">
                    </button>

                    <!-- Target Minion Button (Sub Attack Bottom Left) -->
                    <button class="btn-sub-target btn-target-minion" id="btn-target-minion" title="Prioritas Minion">
                        <img src="${AssetRegistry.resolve('combat_markers/btn_target_minion.webp')}" class="sub-target-img" alt="Minion">
                    </button>

                    <!-- Target Turret Button (Sub Attack Top Left) -->
                    <button class="btn-sub-target btn-target-turret" id="btn-target-turret" title="Prioritas Turret">
                        <img src="${AssetRegistry.resolve('combat_markers/btn_target_turret.webp')}" class="sub-target-img" alt="Turret">
                    </button>

                    <!-- Skill 1 (Q) Button -->
                    <div class="btn-skill-wrap skill-slot-1" id="slot-skill-1" title="Skill 1 (Q)">
                        <img src="${skillFrameSrc}" class="skill-hud-frame" alt="Frame">
                        <img src="${AssetRegistry.resolve(this.hero.skillIcons?.s1 || 'skill_icons/team_dream/freya_s1.webp')}" id="img-skill-1" class="skill-hud-icon" alt="S1">
                        <div class="skill-cd-overlay" id="cd-overlay-1"></div>
                        <span class="skill-cd-num" id="cd-num-1"></span>
                    </div>

                    <!-- Skill 2 (W) Button -->
                    <div class="btn-skill-wrap skill-slot-2" id="slot-skill-2" title="Skill 2 (W)">
                        <img src="${skillFrameSrc}" class="skill-hud-frame" alt="Frame">
                        <img src="${AssetRegistry.resolve(this.hero.skillIcons?.s2 || 'skill_icons/team_dream/freya_s2.webp')}" id="img-skill-2" class="skill-hud-icon" alt="S2">
                        <div class="skill-cd-overlay" id="cd-overlay-2"></div>
                        <span class="skill-cd-num" id="cd-num-2"></span>
                    </div>

                    <!-- Ultimate (R) Button -->
                    <div class="btn-skill-wrap skill-slot-ult" id="slot-skill-ult" title="Ultimate (R)">
                        <img src="${ultRingSrc}" class="skill-hud-frame ult-ring-frame" alt="Ult Ring">
                        <img src="${AssetRegistry.resolve(this.hero.skillIcons?.ult || 'skill_icons/team_dream/freya_ult.webp')}" id="img-skill-ult" class="skill-hud-icon" alt="Ult">
                        <div class="skill-cd-overlay" id="cd-overlay-ult"></div>
                        <span class="skill-cd-num" id="cd-num-ult"></span>
                    </div>

                    <!-- Battle Spell Button (Flicker, Execute, etc.) -->
                    <div class="btn-skill-wrap skill-slot-spell" id="slot-skill-spell" title="Battle Spell (F)">
                        <img src="${AssetRegistry.resolve('ui_mega_pack/spells/spell_flicker.webp')}" id="img-skill-spell" class="skill-hud-icon" alt="Spell">
                        <div class="skill-cd-overlay" id="cd-overlay-spell"></div>
                        <span class="skill-cd-num" id="cd-num-spell"></span>
                    </div>
                </div>

                <!-- Killstreak Banner Pop-up Container -->
                <div class="killstreak-banner-container" id="killstreak-container"></div>
            </div>
        `;
    }

    updateSkillIcons() {
        const teamKey = this.hero.teamKey || (this.hero.team ? this.hero.team.replace('team_', '') : 'dream');
        const frameSrc = AssetRegistry.resolve(`ui_assets/skill_frame_${teamKey}.webp`);

        document.querySelectorAll('.skill-slot-1 .skill-hud-frame, .skill-slot-2 .skill-hud-frame').forEach(f => {
            f.src = frameSrc;
        });

        const s1 = document.getElementById('img-skill-1');
        const s2 = document.getElementById('img-skill-2');
        const ult = document.getElementById('img-skill-ult');
        const wpn = document.getElementById('img-basic-weapon');

        if (s1 && this.hero.skillIcons?.s1) s1.src = AssetRegistry.resolve(this.hero.skillIcons.s1);
        if (s2 && this.hero.skillIcons?.s2) s2.src = AssetRegistry.resolve(this.hero.skillIcons.s2);
        if (ult && this.hero.skillIcons?.ult) ult.src = AssetRegistry.resolve(this.hero.skillIcons.ult);
        if (wpn && this.hero.weaponPreview2D) wpn.src = AssetRegistry.resolve(this.hero.weaponPreview2D);
    }

    updateBars(currentHp, maxHp, shield = 0, currentMana = 100, maxMana = 100) {
        const hpPct = Math.max(0, Math.min(1, currentHp / maxHp));
        const shieldPct = Math.max(0, Math.min(1, shield / maxHp));
        const manaPct = Math.max(0, Math.min(1, currentMana / maxMana));

        const hpClip = document.getElementById('bar-hp-clip');
        const shieldClip = document.getElementById('bar-shield-clip');
        const manaClip = document.getElementById('bar-mana-clip');
        const hpText = document.getElementById('bar-hp-text');

        if (hpClip) hpClip.style.width = `${(hpPct * 100).toFixed(1)}%`;
        if (shieldClip) shieldClip.style.width = `${(shieldPct * 100).toFixed(1)}%`;
        if (manaClip) manaClip.style.width = `${(manaPct * 100).toFixed(1)}%`;
        if (hpText) hpText.textContent = `${Math.round(currentHp)} / ${maxHp}`;
    }

    updateStatus(hp, maxHp, shield = 0, mana = 100, maxMana = 100) {
        this.updateBars(hp, maxHp, shield, mana, maxMana);
    }

    renderMinimap(playerPos, entities = []) {
        const x = playerPos?.x || 0;
        const z = playerPos?.z || 0;
        this.updateMinimap(x, z, entities, this.mode === 'sandbox' ? 220 : 160);
    }

    showTargetEnemy(name, currentHp, maxHp, distance) {
        const frame = document.getElementById('target-enemy-frame');
        const nameEl = document.getElementById('target-enemy-name');
        const distEl = document.getElementById('target-enemy-dist');
        const fill = document.getElementById('bar-enemy-hp-fill');

        if (frame) frame.style.display = 'block';
        if (nameEl) nameEl.textContent = name;
        if (distEl) distEl.textContent = `${distance.toFixed(1)}m`;
        if (fill) {
            const pct = Math.max(0, Math.min(1, currentHp / maxHp));
            fill.style.width = `${(pct * 100).toFixed(1)}%`;
        }
    }

    hideTargetEnemy() {
        const frame = document.getElementById('target-enemy-frame');
        if (frame) frame.style.display = 'none';
    }

    triggerKillstreak(tier = 'first_blood') {
        const container = document.getElementById('killstreak-container');
        if (!container) return;

        const bannerMap = {
            first_blood: 'ui_mega_pack/combat/kill_first_blood.webp',
            double: 'ui_mega_pack/combat/kill_double.webp',
            triple: 'ui_mega_pack/combat/kill_triple.webp',
            quadra: 'ui_mega_pack/combat/kill_quadra.webp',
            penta: 'ui_mega_pack/combat/kill_penta.webp'
        };

        const imgSrc = AssetRegistry.resolve(bannerMap[tier] || bannerMap.first_blood);
        const img = document.createElement('img');
        img.src = imgSrc;
        img.className = 'killstreak-banner-anim';
        container.appendChild(img);

        setTimeout(() => {
            img.remove();
        }, 2800);
    }

    initMinimap() {
        this.minimapCanvas = document.getElementById('minimap-canvas');
        if (this.minimapCanvas) {
            this.minimapCtx = this.minimapCanvas.getContext('2d');
        }
    }

    updateMinimap(playerX, playerZ, entities = [], sceneBounds = 100) {
        if (!this.minimapCtx || !this.minimapCanvas) return;
        const ctx = this.minimapCtx;
        const W = this.minimapCanvas.width;
        const H = this.minimapCanvas.height;

        ctx.clearRect(0, 0, W, H);

        // Dark terrain background
        ctx.fillStyle = '#060a12';
        ctx.beginPath();
        ctx.arc(W/2, H/2, W/2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Helper to convert world X,Z to canvas X,Y
        const toCanvas = (wx, wz) => {
            const nx = (wx / sceneBounds) * 0.5 + 0.5;
            const ny = (wz / sceneBounds) * 0.5 + 0.5;
            return {
                x: Math.max(6, Math.min(W - 6, nx * W)),
                y: Math.max(6, Math.min(H - 6, ny * H))
            };
        };

        // Draw entities (slimes, bots, remote players)
        entities.forEach(ent => {
            const pt = toCanvas(ent.x, ent.z);
            ctx.fillStyle = ent.isEnemy ? '#ef4444' : '#38bdf8';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Player (Gold star/dot)
        const pPt = toCanvas(playerX, playerZ);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(pPt.x, pPt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    wireEvents() {
        // Fast Travel Buttons
        document.querySelectorAll('.btn-fast-travel').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.play('portal_warp');
                this.onFastTravel(btn.dataset.wp);
            });
        });

        // Basic Attack
        const btnAttack = document.getElementById('btn-basic-attack');
        if (btnAttack) {
            btnAttack.addEventListener('pointerdown', () => {
                this.onBasicAttack();
            });
        }

        // Sub Attack: Target Minion / Turret
        const btnMinion = document.getElementById('btn-target-minion');
        if (btnMinion) {
            btnMinion.addEventListener('pointerdown', () => {
                if (this.targeting) this.targeting.setTargetPriority('minion');
                this.onBasicAttack();
            });
        }

        const btnTurret = document.getElementById('btn-target-turret');
        if (btnTurret) {
            btnTurret.addEventListener('pointerdown', () => {
                if (this.targeting) this.targeting.setTargetPriority('turret');
                this.onBasicAttack();
            });
        }

        // Skill Slots
        const slot1 = document.getElementById('slot-skill-1');
        if (slot1) slot1.addEventListener('pointerdown', () => this.onSkillCast('q'));

        const slot2 = document.getElementById('slot-skill-2');
        if (slot2) slot2.addEventListener('pointerdown', () => this.onSkillCast('w'));

        const slotUlt = document.getElementById('slot-skill-ult');
        if (slotUlt) slotUlt.addEventListener('pointerdown', () => this.onSkillCast('r'));

        const slotSpell = document.getElementById('slot-skill-spell');
        if (slotSpell) slotSpell.addEventListener('pointerdown', () => this.onSkillCast('spell'));

        // Utility Buttons
        const btnRegen = document.getElementById('btn-action-regen');
        if (btnRegen) {
            btnRegen.addEventListener('click', () => {
                AudioManager.play('heal_chime');
                this.triggerStatusIcon('heal', 5000);
            });
        }

        const btnRecall = document.getElementById('btn-action-recall');
        if (btnRecall) {
            btnRecall.addEventListener('click', () => {
                AudioManager.play('portal_warp');
                this.onFastTravel('plaza');
            });
        }

        // Exit to Lobby
        const btnExit = document.getElementById('btn-exit-to-lobby');
        if (btnExit) {
            btnExit.addEventListener('click', () => {
                AudioManager.play('ui_click');
                this.onReturnToLobby();
            });
        }

        // Photo Mode Toggle
        const btnPhoto = document.getElementById('btn-photo-mode');
        if (btnPhoto) {
            btnPhoto.addEventListener('click', () => {
                this.isPhotoMode = !this.isPhotoMode;
                const hudRoot = document.getElementById('hud-root');
                if (hudRoot) {
                    hudRoot.style.opacity = this.isPhotoMode ? '0' : '1';
                }
            });
        }

        this.initVirtualJoystick();
    }

    triggerStatusIcon(statusKey, durationMs = 3000) {
        const icon = document.getElementById(`status-icon-${statusKey}`);
        if (icon) {
            icon.style.display = 'block';
            setTimeout(() => {
                icon.style.display = 'none';
            }, durationMs);
        }
    }

    initVirtualJoystick() {
        const zone = document.getElementById('joystick-zone');
        const ring = document.getElementById('joystick-ring');
        const thumb = document.getElementById('joystick-thumb');
        if (!zone || !ring || !thumb) return;

        const onPointerDown = (e) => {
            if (this.joystickPointerId !== null) return;
            this.joystickPointerId = e.pointerId;
            zone.setPointerCapture(e.pointerId);

            const rect = ring.getBoundingClientRect();
            this.joystickCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
            onPointerMove(e);
        };

        const onPointerMove = (e) => {
            if (e.pointerId !== this.joystickPointerId) return;

            const dx = e.clientX - this.joystickCenter.x;
            const dy = e.clientY - this.joystickCenter.y;
            const dist = Math.hypot(dx, dy);
            const maxR = this.joystickRadius;

            const clampedDist = Math.min(dist, maxR);
            const angle = Math.atan2(dy, dx);

            const thumbX = Math.cos(angle) * clampedDist;
            const thumbY = Math.sin(angle) * clampedDist;

            thumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;

            // Normalized -1.0 to 1.0
            const normX = thumbX / maxR;
            const normY = thumbY / maxR;
            this.onMoveInput(normX, normY);
        };

        const onPointerUp = (e) => {
            if (e.pointerId !== this.joystickPointerId) return;
            this.joystickPointerId = null;
            try { zone.releasePointerCapture(e.pointerId); } catch (_) {}
            thumb.style.transform = `translate(-50%, -50%)`;
            this.onMoveInput(0, 0);
        };

        zone.addEventListener('pointerdown', onPointerDown);
        zone.addEventListener('pointermove', onPointerMove);
        zone.addEventListener('pointerup', onPointerUp);
        zone.addEventListener('pointercancel', onPointerUp);
    }
}
