/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/combat/BotAIController.js
 * 
 * 6-State FSM Bot Hero AI:
 * - LANING, TRADE_KITE, COMBO_ALL_IN, TOWER_DIVE_GUARD, RETREAT_RECALL, OBJECTIVE_BOSS
 * - Supports Offline Solo Play and Online Room Backfill
 */

import * as THREE from 'three';

export const BOT_STATES = {
    LANING: 'LANING',
    TRADE_KITE: 'TRADE_KITE',
    COMBO_ALL_IN: 'COMBO_ALL_IN',
    TOWER_DIVE_GUARD: 'TOWER_DIVE_GUARD',
    RETREAT_RECALL: 'RETREAT_RECALL',
    OBJECTIVE_BOSS: 'OBJECTIVE_BOSS'
};

export class BotAIController {
    /**
     * @param {Object} options
     * @param {Object} options.hero Hero definition data
     * @param {string} options.team
     * @param {Object} options.skillExecutor
     * @param {Object} options.objectiveSystem
     */
    constructor({ hero, team, skillExecutor, objectiveSystem }) {
        this.hero = hero;
        this.team = team;
        this.skills = skillExecutor;
        this.objectives = objectiveSystem;

        this.state = BOT_STATES.LANING;
        this.position = new THREE.Vector3(team === 'team_dream' ? -65 : 65, 0, 0);
        this.hp = hero.baseHp || 2600;
        this.maxHp = this.hp;
        this.patk = hero.basePatk || 120;
        this.matk = hero.baseMatk || 35;
        this.pdef = hero.basePdef || 20;
        this.mdef = hero.baseMdef || 15;
        this.moveSpeed = 6.4;
        this.isHero = true;

        this.currentTarget = null;
        this.cooldowns = { q: 0, w: 0, r: 0 };
        this.decisionTimer = 0;
        this.recallTimer = 0;
    }

    update(dt, allEntities = []) {
        if (this.hp <= 0) return;

        this.decisionTimer += dt;
        for (const k in this.cooldowns) {
            if (this.cooldowns[k] > 0) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
        }

        // FSM Evaluation every 0.35s
        if (this.decisionTimer >= 0.35) {
            this.decisionTimer = 0;
            this.evaluateFSM(allEntities);
        }

        // Execute current state action
        this.executeStateAction(dt);
    }

    evaluateFSM(entities) {
        const hpPercent = this.hp / this.maxHp;

        // 1. Retreat & Recall if HP < 22%
        if (hpPercent < 0.22) {
            this.state = BOT_STATES.RETREAT_RECALL;
            return;
        }

        // 2. Tower Dive Guard check
        const enemyTurret = this.objectives.turrets.find(t => t.hp > 0 && t.team !== this.team && t.position.distanceTo(this.position) <= t.range + 2.0);
        const friendlyMinionsInTurret = this.objectives.minions.some(m => m.hp > 0 && m.team === this.team && enemyTurret && m.position.distanceTo(enemyTurret.position) <= enemyTurret.range);

        if (enemyTurret && !friendlyMinionsInTurret) {
            this.state = BOT_STATES.TOWER_DIVE_GUARD;
            return;
        }

        // 3. Find enemy hero
        const enemyHero = entities.find(e => e.isHero && e.hp > 0 && e.team !== this.team && e.position.distanceTo(this.position) < 16);
        if (enemyHero) {
            this.currentTarget = enemyHero;
            const enemyHpRatio = enemyHero.hp / (enemyHero.maxHp || 1);

            // Combo All-In if enemy is low or bot ultimate is ready
            if (enemyHpRatio < 0.45 && this.cooldowns.r <= 0) {
                this.state = BOT_STATES.COMBO_ALL_IN;
            } else {
                this.state = BOT_STATES.TRADE_KITE;
            }
            return;
        }

        // 4. Default: Laning
        this.state = BOT_STATES.LANING;
    }

    executeStateAction(dt) {
        if (this.state === BOT_STATES.RETREAT_RECALL) {
            // Move back towards home nexus
            const homeX = this.team === 'team_dream' ? -80 : 80;
            const dir = new THREE.Vector3(homeX - this.position.x, 0, -this.position.z).normalize();
            this.position.add(dir.multiplyScalar(this.moveSpeed * dt));

            if (Math.abs(this.position.x - homeX) < 5.0) {
                this.recallTimer += dt;
                if (this.recallTimer >= 4.0) {
                    this.hp = this.maxHp;
                    this.recallTimer = 0;
                    this.state = BOT_STATES.LANING;
                }
            }
            return;
        }

        if (this.state === BOT_STATES.TOWER_DIVE_GUARD) {
            // Run backward away from enemy turret
            const retreatDir = new THREE.Vector3(this.team === 'team_dream' ? -1 : 1, 0, 0);
            this.position.add(retreatDir.multiplyScalar(this.moveSpeed * dt));
            return;
        }

        if (this.state === BOT_STATES.COMBO_ALL_IN && this.currentTarget) {
            const toEnemy = this.currentTarget.position.clone().sub(this.position);
            const dist = toEnemy.length();
            const aimDir = toEnemy.clone().normalize();

            // Cast Ultimate -> Skill 1 -> Skill 2 -> Basic Attacks
            if (this.cooldowns.r <= 0 && dist < 12) {
                this.skills.executeUltimate(this, aimDir, this.currentTarget);
                this.cooldowns.r = 34;
            } else if (this.cooldowns.q <= 0 && dist < 10) {
                this.skills.executeSkill1(this, aimDir, this.currentTarget);
                this.cooldowns.q = 6.0;
            } else if (this.cooldowns.w <= 0 && dist < 8) {
                this.skills.executeSkill2(this, aimDir, this.currentTarget);
                this.cooldowns.w = 9.0;
            } else if (dist < 8) {
                this.skills.executeBasicAttack(this, this.currentTarget);
            }

            // Close gap
            if (dist > 4) {
                this.position.add(aimDir.multiplyScalar(this.moveSpeed * dt));
            }
            return;
        }

        if (this.state === BOT_STATES.TRADE_KITE && this.currentTarget) {
            const toEnemy = this.currentTarget.position.clone().sub(this.position);
            const dist = toEnemy.length();
            const aimDir = toEnemy.clone().normalize();

            // Harass with Skill 1 or Basic Attack, keep distance ~7.5m
            if (this.cooldowns.q <= 0 && dist < 11) {
                this.skills.executeSkill1(this, aimDir, this.currentTarget);
                this.cooldowns.q = 6.0;
            } else if (dist < 8.5) {
                this.skills.executeBasicAttack(this, this.currentTarget);
            }

            // Kite
            if (dist < 6.5) {
                // Back off
                this.position.add(aimDir.clone().negate().multiplyScalar(this.moveSpeed * 0.85 * dt));
            } else if (dist > 9.5) {
                // Move closer
                this.position.add(aimDir.multiplyScalar(this.moveSpeed * dt));
            }
            return;
        }

        if (this.state === BOT_STATES.LANING) {
            // Move toward center map
            const targetX = 0;
            const dx = targetX - this.position.x;
            if (Math.abs(dx) > 12) {
                const step = (dx > 0 ? 1 : -1) * this.moveSpeed * 0.7 * dt;
                this.position.x += step;
            }

            // Attack enemy minions if present
            const enemyMinion = this.objectives.minions.find(m => m.hp > 0 && m.team !== this.team && m.position.distanceTo(this.position) < 8.5);
            if (enemyMinion) {
                this.skills.executeBasicAttack(this, enemyMinion);
            }
        }
    }
}
