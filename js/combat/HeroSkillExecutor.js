/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/combat/HeroSkillExecutor.js
 * 
 * Master Combat Skill Executor for 6 Active Heroes:
 * - Christy, Marsha, Freya, Erine, Fiony, Michie
 * - Hitboxes, Projectiles, Dashes, Traps, Buffs, Heals & CC Triggers
 */

import * as THREE from 'three';
import { calculateDamage, applyDamageToEntity, applyCrowdControl, CC_TYPES } from './DamageEngine.js';

export class HeroSkillExecutor {
    /**
     * @param {Object} options
     * @param {Object} options.vfxManager
     * @param {Object} options.audioManager
     * @param {Array} options.allEntities Array of active combat targets
     */
    constructor({ vfxManager, audioManager, allEntities = [] }) {
        this.vfx = vfxManager;
        this.audio = audioManager;
        this.entities = allEntities;

        this.activeProjectiles = [];
        this.activeTraps = [];
        this.activeZones = [];
    }

    setEntities(entities) {
        this.entities = entities;
    }

    /**
     * Executes Basic Attack (3-Hit Combo)
     */
    executeBasicAttack(caster, target) {
        const slug = caster.hero.slug || caster.hero.id;
        caster.basicCombo = ((caster.basicCombo || 0) % 3) + 1;

        if (this.audio) {
            this.audio.playHeroSfx(caster.hero, 'basic', caster.position);
        }

        // Christy & Michie (Ranged Projectile)
        if (slug === 'christy' || slug === 'michie') {
            this.spawnRangedProjectile(caster, target, {
                speed: 32,
                damageType: 'physical',
                scale: 1.0,
                onHit: (hitTarget) => {
                    this.applyBasicDamage(caster, hitTarget);
                }
            });
            return;
        }

        // Freya (Melee Twin Blades Cleave)
        if (slug === 'freya') {
            const isUltActive = caster.isValkyrieActive;
            const range = isUltActive ? 5.2 : 3.4;
            const cleaveAngle = isUltActive ? Math.PI : Math.PI * 0.65;

            // Trigger ribbon trail
            if (this.vfx) {
                this.vfx.triggerSwordTrail(caster, 0.35);
            }

            const hitTargets = this.findTargetsInCone(caster.position, caster.facingYaw || 0, range, cleaveAngle, caster.team);
            for (const t of hitTargets) {
                this.applyBasicDamage(caster, t);
            }
            return;
        }

        // Marsha & Erine & Fiony (Magic Ranged Bolt)
        this.spawnRangedProjectile(caster, target, {
            speed: 26,
            damageType: 'magic',
            scale: 0.85,
            onHit: (hitTarget) => {
                this.applyBasicDamage(caster, hitTarget);
            }
        });
    }

    applyBasicDamage(caster, target) {
        if (!target || target.hp <= 0) return;

        const isCrit = Math.random() < (caster.critChance || 0.15);
        const dmg = calculateDamage({
            rawDamage: caster.patk || 120,
            damageType: 'physical',
            targetDef: target.pdef || 25,
            isCrit,
            critMultiplier: 2.0 + (caster.extraCritDmg || 0)
        });

        const res = applyDamageToEntity(target, dmg);

        if (this.vfx) {
            this.vfx.spawnHitSparks(target.position, caster.hero.team);
            this.vfx.showFloatingDamage(target.position, res.finalDamage, isCrit ? 'crit' : 'physical');
            if (isCrit) this.vfx.triggerHitstop(0.04);
        }

        // Passive Triggers
        this.triggerPassivesOnBasicHit(caster, target);
    }

    triggerPassivesOnBasicHit(caster, target) {
        const slug = caster.hero.slug || caster.hero.id;

        // Christy: Ignited Bolts (Every 3rd hit -15% PDEF)
        if (slug === 'christy') {
            caster.ignitedStacks = (caster.ignitedStacks || 0) + 1;
            if (caster.ignitedStacks >= 3) {
                caster.ignitedStacks = 0;
                target.pctDefRed = 0.15;
                setTimeout(() => { if (target) target.pctDefRed = 0; }, 3000);
            }
        }

        // Freya: Caramel Cholerics (+5% AS & MS up to 4 stacks; 4th hit heal)
        if (slug === 'freya') {
            caster.caramelStacks = Math.min(4, (caster.caramelStacks || 0) + 1);
            if (caster.caramelStacks === 4) {
                const healAmt = 80 + (caster.patk * 0.35) + (caster.maxHp - caster.hp) * 0.04;
                caster.hp = Math.min(caster.maxHp, caster.hp + healAmt);
                if (this.vfx) this.vfx.showFloatingDamage(caster.position, Math.round(healAmt), 'heal');
            }
        }

        // Michie: Till Infinity and Beyond
        if (slug === 'michie') {
            caster.michieHitCount = (caster.michieHitCount || 0) + 1;
            if (caster.michieHitCount >= 5) {
                caster.michieHitCount = 0;
                caster.infinityStacks = (caster.infinityStacks || 0) + 1;
                caster.patk = (caster.patk || 118) + 2;
            }
        }
    }

    /**
     * Executes Skill 1 (Q)
     */
    executeSkill1(caster, aimDir, target) {
        const slug = caster.hero.slug || caster.hero.id;
        if (this.audio) this.audio.playHeroSfx(caster.hero, 's1', caster.position);

        if (slug === 'christy') {
            // Rapid Volley: 5 arrows in 0.75s
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.spawnDirectionalProjectile(caster, aimDir, {
                        speed: 34,
                        range: 11.5,
                        damage: 150 + (caster.patk * 0.52),
                        damageType: 'physical'
                    });
                }, i * 150);
            }

        } else if (slug === 'marsha') {
            // Crescent Pizza Arc
            this.spawnDirectionalProjectile(caster, aimDir, {
                speed: 28,
                range: 11.0,
                damage: 420 + (caster.matk * 0.95),
                damageType: 'magic',
                isCrescent: true
            });

        } else if (slug === 'freya') {
            // Skyfall Strike (Leap 7m & Slam AoE 3.6m + Knockup)
            const targetPos = caster.position.clone().add(aimDir.clone().multiplyScalar(7.0));
            caster.position.copy(targetPos);

            if (this.vfx) {
                this.vfx.spawnShockwave(targetPos, 0x38bdf8, 3.6);
            }

            const victims = this.findTargetsInRadius(targetPos, 3.6, caster.team);
            for (const v of victims) {
                const dmg = calculateDamage({
                    rawDamage: 380 + (caster.patk * 1.15),
                    damageType: 'physical',
                    targetDef: v.pdef || 30
                });
                applyDamageToEntity(v, dmg);
                applyCrowdControl(v, CC_TYPES.AIRBORNE, 0.85);
                if (this.vfx) this.vfx.showFloatingDamage(v.position, dmg, 'physical');
            }

        } else if (slug === 'erine') {
            // Flame Knight & Rook
            this.spawnDirectionalProjectile(caster, aimDir, {
                speed: 24,
                range: 9.5,
                damage: 280 + (caster.matk * 0.65),
                damageType: 'magic'
            });

        } else if (slug === 'fiony') {
            // Illustrated Crescendo (Sheet music arc: heals allies, damages enemies)
            const allies = this.findTargetsInRadius(caster.position, 10.5, null, true);
            for (const a of allies) {
                const heal = 350 + (caster.matk * 0.75);
                a.hp = Math.min(a.maxHp, a.hp + heal);
                if (this.vfx) this.vfx.showFloatingDamage(a.position, Math.round(heal), 'heal');
            }

        } else if (slug === 'michie') {
            // Number One Arrow (Piercing, guaranteed crit on first hero)
            this.spawnDirectionalProjectile(caster, aimDir, {
                speed: 36,
                range: 12.5,
                damage: 320 + (caster.patk * 1.35),
                damageType: 'physical',
                guaranteedCrit: true
            });
        }
    }

    /**
     * Executes Skill 2 (W)
     */
    executeSkill2(caster, aimDir, target) {
        const slug = caster.hero.slug || caster.hero.id;
        if (this.audio) this.audio.playHeroSfx(caster.hero, 's2', caster.position);

        if (slug === 'christy') {
            // Inferno Trap
            const trapPos = caster.position.clone().add(aimDir.clone().multiplyScalar(4.5));
            this.activeTraps.push({
                pos: trapPos,
                radius: 2.4,
                team: caster.team,
                caster,
                life: 45
            });
            if (this.vfx) this.vfx.spawnShockwave(trapPos, 0xf59e0b, 2.4);

        } else if (slug === 'marsha') {
            // Stargaze Blink 6.5m
            caster.position.add(aimDir.clone().multiplyScalar(6.5));
            if (this.vfx) this.vfx.spawnShockwave(caster.position, 0x38bdf8, 3.2);

        } else if (slug === 'freya') {
            // Vortex Guard (Spin 1.5s + end slash)
            caster.hasVortexGuard = true;
            if (this.vfx) this.vfx.triggerSwordTrail(caster, 1.5);
            setTimeout(() => {
                if (caster) caster.hasVortexGuard = false;
            }, 1500);

        } else if (slug === 'erine') {
            // Piano Flare Arpeggio
            for (let i = 0; i < 4; i++) {
                setTimeout(() => {
                    const wavePos = caster.position.clone().add(aimDir.clone().multiplyScalar(2.0 + i * 1.8));
                    if (this.vfx) this.vfx.spawnShockwave(wavePos, 0xf59e0b, 2.0);
                    const victims = this.findTargetsInRadius(wavePos, 2.0, caster.team);
                    for (const v of victims) {
                        const dmg = calculateDamage({ rawDamage: 140 + (caster.matk * 0.30), damageType: 'magic', targetDef: v.mdef || 25 });
                        applyDamageToEntity(v, dmg);
                    }
                }, i * 180);
            }

        } else if (slug === 'fiony') {
            // Harmony Barrier (Shield + cleanse CC)
            const targetEntity = target || caster;
            if (!targetEntity.shields) targetEntity.shields = [];
            targetEntity.shields.push({
                amount: 520 + (caster.matk * 1.10),
                expiresAt: Date.now() + 3500
            });
            targetEntity.activeCC = []; // Cleanse
            if (this.vfx) this.vfx.showFloatingDamage(targetEntity.position, 520, 'shield');

        } else if (slug === 'michie') {
            // Marathon Stride (+35% MS & Slow immune 2.2s)
            caster.hasSlowImmunity = true;
            caster.moveSpeedStat = (caster.moveSpeedStat || 252) * 1.35;
            setTimeout(() => {
                if (caster) {
                    caster.hasSlowImmunity = false;
                    caster.moveSpeedStat = 252;
                }
            }, 2200);
        }
    }

    /**
     * Executes Ultimate (R)
     */
    executeUltimate(caster, aimDir, target) {
        const slug = caster.hero.slug || caster.hero.id;
        if (this.audio) this.audio.playHeroSfx(caster.hero, 'ult', caster.position);

        if (slug === 'christy') {
            // Supernova Barrage (Global 140m comet)
            this.spawnDirectionalProjectile(caster, aimDir, {
                speed: 38,
                range: 140,
                damage: 650 + (caster.patk * 1.45),
                damageType: 'physical',
                aoeRadius: 5.5
            });

        } else if (slug === 'marsha') {
            // Eclipse of the Dream Center
            const centerPos = caster.position.clone().add(aimDir.clone().multiplyScalar(7.5));
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    if (this.vfx) this.vfx.spawnShockwave(centerPos, 0x38bdf8, 6.5);
                    const victims = this.findTargetsInRadius(centerPos, 6.5, caster.team);
                    for (const v of victims) {
                        const dmg = calculateDamage({ rawDamage: 180 + (caster.matk * 0.38), damageType: 'magic', targetDef: v.mdef || 25 });
                        applyDamageToEntity(v, dmg);
                        applyCrowdControl(v, CC_TYPES.SLOW, 0.8);
                    }
                }, i * 650);
            }

        } else if (slug === 'freya') {
            // Captain's Valkyrie Ascendance (Shield + AoE basic attack)
            caster.isValkyrieActive = true;
            if (!caster.shields) caster.shields = [];
            caster.shields.push({ amount: 750 + (caster.patk * 1.10), expiresAt: Date.now() + 10000 });
            if (this.vfx) this.vfx.spawnShockwave(caster.position, 0x38bdf8, 8.5);
            setTimeout(() => { if (caster) caster.isValkyrieActive = false; }, 10000);

        } else if (slug === 'erine') {
            // Grand Checkmate (7x7m flame chessboard + Queen slam)
            const zonePos = caster.position.clone().add(aimDir.clone().multiplyScalar(8.0));
            if (this.vfx) this.vfx.spawnShockwave(zonePos, 0xf59e0b, 7.0);
            setTimeout(() => {
                const victims = this.findTargetsInRadius(zonePos, 7.0, caster.team);
                for (const v of victims) {
                    const dmg = calculateDamage({ rawDamage: 780 + (caster.matk * 1.55), damageType: 'magic', targetDef: v.mdef || 30 });
                    applyDamageToEntity(v, dmg);
                }
            }, 1200);

        } else if (slug === 'fiony') {
            // Grand Symphony of Love (Undying 1.5s + 4 heal pulses)
            caster.isUndying = true;
            for (let i = 0; i < 4; i++) {
                setTimeout(() => {
                    const allies = this.findTargetsInRadius(caster.position, 8.0, null, true);
                    for (const a of allies) {
                        a.hp = Math.min(a.maxHp, a.hp + 260 + (caster.matk * 0.45));
                    }
                }, i * 1000);
            }
            setTimeout(() => { if (caster) caster.isUndying = false; }, 1500);

        } else if (slug === 'michie') {
            // Heartbreak Comet
            const stackMultiplier = 1 + 0.015 * (caster.infinityStacks || 0);
            this.spawnDirectionalProjectile(caster, aimDir, {
                speed: 34,
                range: 22,
                damage: (540 + caster.patk * 1.25) * stackMultiplier,
                damageType: 'physical',
                aoeRadius: 5.2,
                stunDuration: 1.1
            });
        }
    }

    // =========================================================================
    // SPATIAL TARGETING HELPERS
    // =========================================================================
    findTargetsInRadius(pos, radius, casterTeam, isAlly = false) {
        return this.entities.filter(e => {
            if (!e || e.hp <= 0) return false;
            const sameTeam = e.team === casterTeam;
            if (isAlly ? !sameTeam : sameTeam) return false;
            return e.position.distanceTo(pos) <= radius;
        });
    }

    findTargetsInCone(pos, facingYaw, range, coneAngle, casterTeam) {
        const forward = new THREE.Vector3(Math.sin(facingYaw), 0, Math.cos(facingYaw));
        return this.entities.filter(e => {
            if (!e || e.hp <= 0 || e.team === casterTeam) return false;
            const toEntity = e.position.clone().sub(pos);
            const dist = toEntity.length();
            if (dist > range) return false;
            toEntity.y = 0;
            toEntity.normalize();
            const angle = forward.angleTo(toEntity);
            return angle <= coneAngle * 0.5;
        });
    }

    spawnRangedProjectile(caster, target, opts) {
        this.activeProjectiles.push({
            pos: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
            target,
            speed: opts.speed || 30,
            opts
        });
    }

    spawnDirectionalProjectile(caster, dir, opts) {
        this.activeProjectiles.push({
            pos: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
            dir: dir.clone().normalize(),
            distanceTraveled: 0,
            maxRange: opts.range || 12,
            speed: opts.speed || 30,
            opts,
            caster
        });
    }

    update(dt) {
        // Update active projectiles
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const p = this.activeProjectiles[i];
            if (p.target) {
                // Homing projectile
                const toTarget = p.target.position.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(p.pos);
                const step = p.speed * dt;
                if (toTarget.length() <= step) {
                    if (p.opts.onHit) p.opts.onHit(p.target);
                    this.activeProjectiles.splice(i, 1);
                } else {
                    p.pos.add(toTarget.normalize().multiplyScalar(step));
                }
            } else if (p.dir) {
                // Skillshot directional projectile
                const step = p.speed * dt;
                p.pos.add(p.dir.clone().multiplyScalar(step));
                p.distanceTraveled += step;

                // Check collision with enemy entities
                const hit = this.entities.find(e => e.hp > 0 && e.team !== p.caster.team && e.position.distanceTo(p.pos) < 1.4);
                if (hit || p.distanceTraveled >= p.maxRange) {
                    if (hit) {
                        const dmg = calculateDamage({
                            rawDamage: p.opts.damage || 200,
                            damageType: p.opts.damageType || 'physical',
                            targetDef: hit.pdef || 25,
                            isCrit: !!p.opts.guaranteedCrit
                        });
                        applyDamageToEntity(hit, dmg);
                        if (p.opts.stunDuration) applyCrowdControl(hit, CC_TYPES.STUN, p.opts.stunDuration);
                        if (this.vfx) this.vfx.showFloatingDamage(hit.position, dmg, p.opts.damageType);
                    }
                    this.activeProjectiles.splice(i, 1);
                }
            }
        }
    }
}
