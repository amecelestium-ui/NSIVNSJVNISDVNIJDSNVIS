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
     * @param {THREE.Scene} [options.scene] Optional Three.js scene for visible 3D projectiles
     */
    constructor({ vfxManager, audioManager, allEntities = [], scene = null }) {
        this.vfx = vfxManager;
        this.audio = audioManager;
        this.entities = allEntities;
        this.scene = scene;

        this.activeProjectiles = [];
        this.activeTraps = [];
        this.activeZones = [];
    }

    setScene(scene) {
        this.scene = scene;
    }

    setEntities(entities) {
        this.entities = entities;
    }

    /**
     * Router method for skill execution by key or slot
     * @param {Object} caster 
     * @param {string|number} slot 
     * @param {Object} opts 
     */
    executeSkill(caster, slot, opts = {}) {
        if (!caster) return;
        const forwardDir = this.getCasterFacingDirection(caster);
        const aimDir = opts.aimDir && (opts.aimDir.x !== 0 || opts.aimDir.z !== 0) ? opts.aimDir.clone().normalize() : forwardDir;
        const target = opts.target || null;
        const s = String(slot).toLowerCase();

        if (s === '1' || s === 'q' || s === 's1') {
            return this.executeSkill1(caster, aimDir, target);
        } else if (s === '2' || s === 'w' || s === 's2') {
            return this.executeSkill2(caster, aimDir, target);
        } else if (s === '3' || s === 'r' || s === 'ult' || s === 'ultimate') {
            return this.executeUltimate(caster, aimDir, target);
        } else if (s === 'spell' || s === 'e' || s === 'f') {
            return this.executeBattleSpell(caster, opts.spellId || caster.battleSpell || 'spell_flicker', aimDir);
        }
    }

    /**
     * Returns normalized forward unit vector based on caster root rotation
     */
    getCasterFacingDirection(caster) {
        if (caster?.root) {
            const yaw = caster.root.rotation.y || 0;
            return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
        }
        return new THREE.Vector3(0, 0, 1);
    }

    /**
     * Executes Active Battle Spell (Flicker, Revitalize, Aegis, Execute, Sprint, Flameshot)
     */
    executeBattleSpell(caster, spellId, aimDir) {
        const dir = aimDir || this.getCasterFacingDirection(caster);
        const pos = caster.position || (caster.root ? caster.root.position : new THREE.Vector3());

        if (spellId === 'spell_flicker' || spellId === 'flicker') {
            // Flash Teleport 6.5 meters forward
            const targetPos = pos.clone().add(dir.clone().multiplyScalar(6.5));
            if (caster.loco) {
                caster.loco.setPosition(targetPos.x, targetPos.y, targetPos.z);
            } else if (caster.root) {
                caster.root.position.copy(targetPos);
            }
            if (this.vfx) this.vfx.triggerShockwave(pos, 0xfbbf24, 2.5);
            if (this.vfx) this.vfx.triggerShockwave(targetPos, 0x38bdf8, 3.2);
            if (this.audio) this.audio.playSfx('sfx_portal_warp');
        } else if (spellId === 'spell_revitalize' || spellId === 'revitalize') {
            // Heal 25% max HP
            const healAmt = Math.round((caster.maxHp || 3000) * 0.25);
            caster.hp = Math.min(caster.maxHp || 3000, caster.hp + healAmt);
            if (this.vfx) this.vfx.triggerHealAura(pos, 3.5);
            if (this.audio) this.audio.playSfx('sfx_buff_heal');
        } else if (spellId === 'spell_aegis' || spellId === 'aegis') {
            // 35% Max HP Shield for 5s
            caster.shield = Math.round((caster.maxHp || 3000) * 0.35);
            if (this.vfx) this.vfx.triggerShieldImpact(pos, 0x38bdf8);
            if (this.audio) this.audio.playSfx('sfx_shield_up');
        } else if (spellId === 'spell_flameshot' || spellId === 'flameshot') {
            // Long range fire blast
            this.spawnDirectionalProjectile(caster, dir, {
                speed: 38,
                range: 35,
                damage: 750 + Math.round((caster.matk || 100) * 1.5),
                damageType: 'magical',
                color: 0xf97316,
                radius: 0.35
            });
            if (this.audio) this.audio.playSfx('sfx_fire_blast');
        } else {
            // Default Sprint / Revitalize buff
            caster.hp = Math.min(caster.maxHp || 3000, caster.hp + 500);
            if (this.vfx) this.vfx.triggerHealAura(pos, 2.0);
        }
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

    createProjectileMesh(pos, color = 0xfbbf24, radius = 0.22) {
        if (!this.scene) return null;
        const geo = new THREE.SphereGeometry(radius, 12, 12);
        const mat = new THREE.MeshBasicMaterial({
            color,
            wireframe: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        this.scene.add(mesh);
        return mesh;
    }

    destroyProjectileMesh(p) {
        if (p.mesh && this.scene) {
            this.scene.remove(p.mesh);
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            if (p.mesh.material) p.mesh.material.dispose();
            p.mesh = null;
        }
    }

    spawnRangedProjectile(caster, target, opts = {}) {
        const casterPos = caster.position || (caster.root ? caster.root.position : new THREE.Vector3());
        const startPos = casterPos.clone().add(new THREE.Vector3(0, 1.25, 0));
        
        // If no locked target, shoot forward as directional skillshot!
        if (!target) {
            const dir = this.getCasterFacingDirection(caster);
            return this.spawnDirectionalProjectile(caster, dir, {
                speed: opts.speed || 32,
                range: 16,
                damage: opts.damage || caster.patk || 220,
                damageType: opts.damageType || 'physical',
                color: opts.color || (opts.damageType === 'magic' ? 0x38bdf8 : 0xfbbf24),
                radius: 0.22,
                onHit: opts.onHit
            });
        }

        const color = opts.color || (opts.damageType === 'magic' ? 0x38bdf8 : 0xfbbf24);
        const mesh = this.createProjectileMesh(startPos, color, opts.radius || 0.22);

        this.activeProjectiles.push({
            pos: startPos,
            target,
            speed: opts.speed || 30,
            opts,
            caster,
            mesh
        });
    }

    spawnDirectionalProjectile(caster, dir, opts = {}) {
        const casterPos = caster.position || (caster.root ? caster.root.position : new THREE.Vector3());
        const startPos = casterPos.clone().add(new THREE.Vector3(0, 1.25, 0));
        const color = opts.color || (opts.damageType === 'magical' ? 0xec4899 : 0xfbbf24);
        const mesh = this.createProjectileMesh(startPos, color, opts.radius || 0.25);

        this.activeProjectiles.push({
            pos: startPos,
            dir: dir.clone().normalize(),
            distanceTraveled: 0,
            maxRange: opts.range || 16,
            speed: opts.speed || 30,
            opts,
            caster,
            mesh
        });
    }

    update(dt) {
        // Update active projectiles
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const p = this.activeProjectiles[i];
            if (p.target) {
                // Homing projectile
                const targetPos = p.target.position || (p.target.root ? p.target.root.position : null);
                if (!targetPos || p.target.hp <= 0) {
                    this.destroyProjectileMesh(p);
                    this.activeProjectiles.splice(i, 1);
                    continue;
                }
                const toTarget = targetPos.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(p.pos);
                const step = p.speed * dt;
                if (toTarget.length() <= step) {
                    if (p.opts.onHit) p.opts.onHit(p.target);
                    this.destroyProjectileMesh(p);
                    this.activeProjectiles.splice(i, 1);
                } else {
                    p.pos.add(toTarget.normalize().multiplyScalar(step));
                    if (p.mesh) p.mesh.position.copy(p.pos);
                }
            } else if (p.dir) {
                // Skillshot directional projectile
                const step = p.speed * dt;
                p.pos.add(p.dir.clone().multiplyScalar(step));
                p.distanceTraveled += step;
                if (p.mesh) p.mesh.position.copy(p.pos);

                // Check collision with enemy entities
                const hit = this.entities.find(e => e && e.hp > 0 && e.team !== p.caster.team && (e.position || e.root?.position)?.distanceTo(p.pos) < 1.6);
                if (hit || p.distanceTraveled >= p.maxRange) {
                    if (hit) {
                        const dmg = calculateDamage({
                            rawDamage: p.opts.damage || 220,
                            damageType: p.opts.damageType || 'physical',
                            targetDef: hit.pdef || 25,
                            isCrit: !!p.opts.guaranteedCrit
                        });
                        applyDamageToEntity(hit, dmg);
                        if (p.opts.stunDuration) applyCrowdControl(hit, CC_TYPES.STUN, p.opts.stunDuration);
                        if (this.vfx) this.vfx.showFloatingDamage(hit.position || hit.root?.position, dmg, p.opts.damageType);
                        if (p.opts.onHit) p.opts.onHit(hit);
                    }
                    this.destroyProjectileMesh(p);
                    this.activeProjectiles.splice(i, 1);
                }
            }
        }
    }
}
