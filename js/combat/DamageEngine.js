/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/combat/DamageEngine.js
 * 
 * Exact Mobile Legends: Bang Bang Combat Mathematics:
 * - 4-Step Effective Defense with Negative Defense Amplification down to -60
 * - 120 / (120 + EffDEF) Diminishing Returns Formula
 * - Physical, Magic, True Damage, Lifesteal, Spell Vamp & Shield Prioritization
 * - Crowd Control Hierarchy (Slow, Root, Silence, Stun, Airborne, Suppress)
 */

export function calculateDamage({
    rawDamage,
    damageType = 'physical',
    targetDef = 30,
    flatDefRed = 0,
    pctDefRed = 0,
    pctPen = 0,
    flatPen = 0,
    pctDR = 0,
    flatDR = 0,
    isCrit = false,
    critMultiplier = 2.0,
    extraCritDmg = 0
}) {
    // True Damage bypasses all defenses and standard DR
    if (damageType === 'true') {
        return Math.max(0, Math.round(rawDamage));
    }

    // Step 1: Flat Defense Reduction
    let d = targetDef - flatDefRed;

    // Step 2: Percentage Reduction & Penetration (Only applies when defense is positive)
    if (d > 0) {
        d = d * (1 - pctDefRed);
        d = d * (1 - pctPen);
    }

    // Step 3: Flat Penetration (Can push defense into negative down to -60 floor)
    const effDef = Math.max(-60, d - flatPen);

    // Step 4: Defense Multiplier (120 / (120 + EffDEF))
    const defMult = 120 / (120 + effDef);

    // Step 5: Raw Damage to Actual Damage with Damage Reduction
    let actual = Math.max(0, (rawDamage * defMult) * (1 - pctDR) - flatDR);

    // Step 6: Critical Damage
    if (isCrit) {
        actual *= (critMultiplier + extraCritDmg);
    }

    return Math.round(actual);
}

/**
 * Applies incoming damage against multiple stacked shields and health
 * @param {Object} target Target entity with hp, maxHp, shields array
 * @param {number} damage Incoming damage
 * @returns {Object} { finalDamage, shieldAbsorbed, hpLost, isDead }
 */
export function applyDamageToEntity(target, damage) {
    let remaining = damage;
    let shieldAbsorbed = 0;

    // Sort shields: earliest expiration first, then smallest amount
    if (Array.isArray(target.shields) && target.shields.length > 0) {
        target.shields.sort((a, b) => (a.expiresAt - b.expiresAt) || (a.amount - b.amount));

        for (let i = target.shields.length - 1; i >= 0; i--) {
            const sh = target.shields[i];
            if (sh.amount <= remaining) {
                remaining -= sh.amount;
                shieldAbsorbed += sh.amount;
                target.shields.splice(i, 1);
            } else {
                sh.amount -= remaining;
                shieldAbsorbed += remaining;
                remaining = 0;
                break;
            }
        }
    }

    const hpLost = Math.min(target.hp, remaining);

    // Check Undying status (e.g. Fiony Ultimate)
    if (target.isUndying && target.hp - hpLost < 1) {
        target.hp = 1;
    } else {
        target.hp = Math.max(0, target.hp - hpLost);
    }

    const isDead = target.hp <= 0;

    return {
        finalDamage: damage,
        shieldAbsorbed,
        hpLost,
        isDead
    };
}

/**
 * Crowd Control Hierarchy and Application
 */
export const CC_TYPES = {
    SLOW: 1,
    ROOT: 2,       // Blocks Dash / Blink
    SILENCE: 3,    // Blocks Skill / Spell
    STUN: 4,       // Blocks Movement, Attacks, and Skills
    KNOCKBACK: 5,  // Moves target + Stun
    AIRBORNE: 6,   // Vertical Knockup + Stun
    SUPPRESS: 7    // Unbreakable by Purify, bypasses Control Immunity
};

export function applyCrowdControl(target, type, durationSec) {
    if (!target) return;

    // Check Control Immunity
    if (target.hasControlImmunity && type !== CC_TYPES.SUPPRESS) {
        return; // Bypassed
    }

    // Apply Resilience reduction (except Suppress)
    const resilience = target.resilience || 0;
    const finalDuration = type === CC_TYPES.SUPPRESS ? durationSec : durationSec * (1 - resilience);

    if (finalDuration <= 0) return;

    if (!target.activeCC) target.activeCC = [];
    target.activeCC.push({
        type,
        duration: finalDuration,
        expiresAt: Date.now() + finalDuration * 1000
    });
}

export const DamageEngine = {
    calculateDamage,
    applyDamageToEntity,
    applyCrowdControl,
    CC_TYPES
};
