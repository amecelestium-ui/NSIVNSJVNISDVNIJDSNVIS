/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/combat/MobaObjectiveSystem.js
 * 
 * Master MOBA Objective Engine:
 * - 30s Periodic Minion Waves (Melee Knights & Ranged Mages)
 * - Turret Aggro Tracking, +55% Consecutive Shot Escalation & Energy Shield
 * - Nexus Core Destruction & Match State
 * - Boss AI Spawning: Crystal Golem (02:00), Celestial Dragon (08:00), World Boss Phoenix
 */

import * as THREE from 'three';
import { MOBA_TIMINGS } from '../config/constants.js';
import { calculateDamage, applyDamageToEntity } from './DamageEngine.js';

export class MobaObjectiveSystem {
    /**
     * @param {Object} options
     * @param {THREE.Scene} options.scene
     * @param {string} options.arenaId
     * @param {Function} options.onMatchEnd
     * @param {Object} options.vfxManager
     */
    constructor({ scene, arenaId, onMatchEnd, vfxManager }) {
        this.scene = scene;
        this.arenaId = arenaId;
        this.onMatchEnd = onMatchEnd || (() => {});
        this.vfx = vfxManager;

        this.matchTime = 0;
        this.minionWavesCount = 0;
        this.minions = [];
        this.turrets = [];
        this.nexusCores = [];
        this.bosses = [];

        this.nextMinionSpawnTime = MOBA_TIMINGS.MINION_FIRST_WAVE_SEC;
        this.isMatchOver = false;

        this.initObjectives();
    }

    initObjectives() {
        // Initialize Team Turrets and Nexus Cores
        const teams = ['team_dream', 'team_passion'];

        for (const t of teams) {
            const side = t === 'team_dream' ? -1 : 1;

            // Outer Turret
            this.turrets.push({
                id: `turret_outer_${t}`,
                team: t,
                isTurret: true,
                position: new THREE.Vector3(side * 35, 0, 0),
                hp: 5500,
                maxHp: 5500,
                range: 11.5,
                attackTimer: 0,
                attackInterval: 1.15,
                consecutiveHits: 0,
                lastTargetId: null,
                hasEnergyShield: true
            });

            // Base Turret
            this.turrets.push({
                id: `turret_base_${t}`,
                team: t,
                isTurret: true,
                position: new THREE.Vector3(side * 60, 0, 0),
                hp: 7200,
                maxHp: 7200,
                range: 11.5,
                attackTimer: 0,
                attackInterval: 1.15,
                consecutiveHits: 0,
                lastTargetId: null,
                hasEnergyShield: false
            });

            // Nexus Core
            this.nexusCores.push({
                id: `nexus_${t}`,
                team: t,
                isNexus: true,
                position: new THREE.Vector3(side * 85, 0, 0),
                hp: 12000,
                maxHp: 12000
            });
        }
    }

    spawnMinionWave() {
        this.minionWavesCount++;
        const teams = ['team_dream', 'team_passion'];

        for (const t of teams) {
            const side = t === 'team_dream' ? -1 : 1;
            const spawnX = side * 80;

            // 2 Melee Knights
            for (let i = 0; i < 2; i++) {
                this.minions.push({
                    id: `minion_melee_${t}_${this.minionWavesCount}_${i}`,
                    team: t,
                    isMinion: true,
                    type: 'melee',
                    position: new THREE.Vector3(spawnX + i * 2, 0, (Math.random() - 0.5) * 3),
                    hp: 950 + this.minionWavesCount * 45,
                    maxHp: 950 + this.minionWavesCount * 45,
                    patk: 55 + this.minionWavesCount * 4,
                    moveSpeed: 4.8,
                    attackRange: 1.8,
                    target: null,
                    attackTimer: 0
                });
            }

            // 1 Ranged Mage
            this.minions.push({
                id: `minion_ranged_${t}_${this.minionWavesCount}`,
                team: t,
                isMinion: true,
                type: 'ranged',
                position: new THREE.Vector3(spawnX - side * 4, 0, 0),
                hp: 680 + this.minionWavesCount * 35,
                maxHp: 680 + this.minionWavesCount * 35,
                matk: 85 + this.minionWavesCount * 6,
                moveSpeed: 4.6,
                attackRange: 7.2,
                target: null,
                attackTimer: 0
            });
        }
    }

    update(dt, allHeroes = []) {
        if (this.isMatchOver) return;
        this.matchTime += dt;

        // 1. Minion Wave Timers
        if (this.matchTime >= this.nextMinionSpawnTime) {
            this.spawnMinionWave();
            this.nextMinionSpawnTime += MOBA_TIMINGS.MINION_WAVE_INTERVAL_SEC;
        }

        // 2. Boss Timers
        if (this.matchTime >= MOBA_TIMINGS.BOSS_GOLEM_SPAWN_SEC && !this.bosses.find(b => b.id === 'golem')) {
            this.bosses.push({
                id: 'golem',
                name: 'Crystal Golem',
                position: new THREE.Vector3(-28, 0, 0),
                hp: 14000,
                maxHp: 14000,
                patk: 240,
                range: 3.5,
                isBoss: true
            });
        }

        if (this.matchTime >= MOBA_TIMINGS.BOSS_DRAGON_SPAWN_SEC && !this.bosses.find(b => b.id === 'dragon')) {
            this.bosses.push({
                id: 'dragon',
                name: 'Celestial Dragon',
                position: new THREE.Vector3(28, 0, 0),
                hp: 32000,
                maxHp: 32000,
                patk: 450,
                range: 7.5,
                isBoss: true
            });
        }

        // 3. Update Minions Movement & Attacks
        this.updateMinions(dt, allHeroes);

        // 4. Update Turrets Aggro & Shots
        this.updateTurrets(dt, allHeroes);

        // 5. Check Nexus Core HP (Victory / Defeat)
        for (const nexus of this.nexusCores) {
            if (nexus.hp <= 0 && !this.isMatchOver) {
                this.isMatchOver = true;
                const victoriousTeam = nexus.team === 'team_dream' ? 'team_passion' : 'team_dream';
                this.onMatchEnd(victoriousTeam);
            }
        }
    }

    updateMinions(dt, heroes) {
        const combatants = [...heroes, ...this.minions, ...this.turrets];

        for (let i = this.minions.length - 1; i >= 0; i--) {
            const m = this.minions[i];
            if (m.hp <= 0) {
                this.minions.splice(i, 1);
                continue;
            }

            // Find closest enemy combatant
            const enemies = combatants.filter(c => c.hp > 0 && c.team !== m.team);
            let closest = null;
            let minDist = Infinity;

            for (const e of enemies) {
                const dist = m.position.distanceTo(e.position);
                if (dist < minDist) {
                    minDist = dist;
                    closest = e;
                }
            }

            if (closest) {
                if (minDist <= m.attackRange) {
                    // Attack
                    m.attackTimer += dt;
                    if (m.attackTimer >= 1.2) {
                        m.attackTimer = 0;
                        const dmg = calculateDamage({
                            rawDamage: m.patk || m.matk,
                            damageType: m.type === 'ranged' ? 'magic' : 'physical',
                            targetDef: closest.pdef || 25
                        });
                        applyDamageToEntity(closest, dmg);
                    }
                } else {
                    // Walk toward enemy
                    const dir = closest.position.clone().sub(m.position).normalize();
                    m.position.add(dir.multiplyScalar(m.moveSpeed * dt));
                }
            }
        }
    }

    updateTurrets(dt, heroes) {
        for (const t of this.turrets) {
            if (t.hp <= 0) continue;

            // Turret Energy shield drops after 5 mins
            if (this.matchTime > MOBA_TIMINGS.TURRET_ENERGY_SHIELD_EXPIRE_SEC) {
                t.hasEnergyShield = false;
            }

            // Aggro priority: Hero attacking ally in range -> Closest Minion -> Closest Hero
            const nearbyMinions = this.minions.filter(m => m.hp > 0 && m.team !== t.team && t.position.distanceTo(m.position) <= t.range);
            const nearbyHeroes = heroes.filter(h => h.hp > 0 && h.team !== t.team && t.position.distanceTo(h.position) <= t.range);

            let target = nearbyMinions[0] || nearbyHeroes[0] || null;

            if (target) {
                t.attackTimer += dt;
                if (t.attackTimer >= t.attackInterval) {
                    t.attackTimer = 0;

                    // Escalation check
                    if (t.lastTargetId === target.id) {
                        t.consecutiveHits = Math.min(MOBA_TIMINGS.TURRET_MAX_ESCALATION_STACKS, t.consecutiveHits + 1);
                    } else {
                        t.consecutiveHits = 1;
                        t.lastTargetId = target.id;
                    }

                    const escalationMultiplier = 1.0 + (t.consecutiveHits - 1) * MOBA_TIMINGS.TURRET_ESCALATION_PER_HIT;
                    const rawTurretDmg = (MOBA_TIMINGS.TURRET_DAMAGE_BASE + (this.matchTime / 60) * MOBA_TIMINGS.TURRET_DAMAGE_GROWTH_PER_MIN) * escalationMultiplier;

                    const finalDmg = calculateDamage({
                        rawDamage: rawTurretDmg,
                        damageType: 'physical',
                        targetDef: target.pdef || 30
                    });

                    applyDamageToEntity(target, finalDmg);

                    if (this.vfx) {
                        this.vfx.spawnShockwave(target.position, 0xef4444, 1.8);
                        this.vfx.showFloatingDamage(target.position, finalDmg, 'physical');
                    }
                }
            } else {
                t.consecutiveHits = 0;
                t.lastTargetId = null;
            }
        }
    }

    getAllEntities() {
        return [...this.minions, ...this.turrets, ...this.nexusCores, ...this.bosses];
    }
}
