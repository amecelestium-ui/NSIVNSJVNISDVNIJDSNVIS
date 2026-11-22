/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/character/AnimationStateMachine.js
 * 
 * Master Skeletal Animation Controller:
 * - Hybrid: Plays GLTF AnimationMixer clips if present
 * - Full Procedural Skeletal Animator (Anti A-Pose, Real Striding Steps, Arm Swings, Combat Slashes)
 * - Rest Pose Relative Quaternion Mathematics: bone.quaternion.copy(restQuat).multiply(deltaQuat)
 * - LateUpdate Spine Aiming & Recoil
 */

import * as THREE from 'three';

export class AnimationStateMachine {
    /**
     * @param {Object} options
     * @param {THREE.Group} options.modelRoot
     * @param {Object} options.bones Mapped 16 bones
     * @param {Array<THREE.AnimationClip>} [options.clips=[]]
     */
    constructor({ modelRoot, bones, clips = [] }) {
        this.modelRoot = modelRoot;
        this.bones = bones;
        this.clips = clips || [];

        this.mixer = new THREE.AnimationMixer(modelRoot);
        this.actions = {};
        this.currentState = 'IDLE';
        this.currentAction = null;
        this.hasValidClips = false;

        // Procedural Animation State
        this.proceduralPhase = 0;
        this.attackPhase = 0;
        this.isAttacking = false;
        this.attackDuration = 0.44; // 0.12s fore + 0.14s hit + 0.18s back
        this.attackComboIndex = 1;

        // Recoil Spring State
        this.recoilPitch = 0;
        this.recoilVelocity = 0;

        // Target Aim Delta Angle
        this.targetAimYaw = 0;

        this.initClips();
    }

    initClips() {
        if (this.clips && this.clips.length > 0) {
            for (const clip of this.clips) {
                const name = clip.name.toUpperCase();
                this.actions[name] = this.mixer.clipAction(clip);
                this.hasValidClips = true;
            }

            if (this.actions['IDLE']) {
                this.currentAction = this.actions['IDLE'];
                this.currentAction.play();
            } else if (this.clips[0]) {
                this.currentAction = this.mixer.clipAction(this.clips[0]);
                this.currentAction.play();
            }
        }
    }

    setState(newState, duration = 0.16) {
        if (this.currentState === newState && !newState.startsWith('BASIC_')) return;

        const prevAction = this.currentAction;
        this.currentState = newState;
        const nextAction = this.actions[newState.toUpperCase()];

        if (nextAction && prevAction !== nextAction) {
            nextAction.reset();
            nextAction.enabled = true;
            nextAction.play();
            if (prevAction) {
                prevAction.crossFadeTo(nextAction, duration, true);
            }
            this.currentAction = nextAction;
        }

        // Handle procedural attack timing
        if (newState.startsWith('BASIC_') || newState.startsWith('SKILL_') || newState === 'ULTIMATE') {
            this.isAttacking = true;
            this.attackPhase = 0;
            this.attackDuration = newState === 'ULTIMATE' ? 0.85 : (newState.startsWith('SKILL_') ? 0.50 : 0.38);
        } else {
            this.isAttacking = false;
        }
    }

    triggerAttack(combo = 1) {
        this.attackComboIndex = combo;
        this.setState(`BASIC_${combo}`);
    }

    triggerRecoil(impulse = -0.22) {
        this.recoilVelocity += impulse;
    }

    setTargetAimYaw(deltaYaw) {
        const maxRad = 42 * (Math.PI / 180);
        this.targetAimYaw = Math.max(-maxRad, Math.min(maxRad, deltaYaw));
    }

    update(dt, moveSpeedRatio = 0, isGrounded = true, terrainNormal = null) {
        this.proceduralPhase += dt;

        // 1. Advance clip mixer if model has valid animation clips
        if (this.hasValidClips) {
            this.mixer.update(dt);
        }

        // 2. Procedural Skeletal Animation Layer (Always active to ensure anti-A-pose and natural body dynamics)
        this.updateProceduralSkeletal(dt, moveSpeedRatio, isGrounded);

        // 3. LateUpdate Bone Overrides
        this.applyLateUpdateOverrides(dt, terrainNormal);
    }

    applyBoneDelta(bone, rx, ry, rz) {
        if (!bone) return;
        const baseQuat = bone.userData.restQuat || bone.quaternion;
        const qDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
        bone.quaternion.copy(baseQuat).multiply(qDelta);
    }

    updateProceduralSkeletal(dt, moveSpeedRatio, isGrounded) {
        const t = this.proceduralPhase;
        const b = this.bones;

        // Attack Animation
        if (this.isAttacking) {
            this.attackPhase += dt;
            const progress = this.attackPhase / this.attackDuration;

            if (progress <= 1.0) {
                if (progress < 0.28) {
                    // Phase 1: Foreswing (Wind-up)
                    const f = progress / 0.28;
                    this.applyBoneDelta(b.chest, 0, -0.35 * f, 0);
                    this.applyBoneDelta(b.upperArmR, -0.65 * f, 0.25 * f, 0.45 * f);
                    this.applyBoneDelta(b.forearmR, 0.55 * f, 0, 0);
                } else if (progress < 0.65) {
                    // Phase 2: Strike Slash
                    const s = (progress - 0.28) / 0.37;
                    this.applyBoneDelta(b.chest, 0.12 * s, -0.35 + 0.75 * s, 0);
                    this.applyBoneDelta(b.upperArmR, -0.65 + 1.25 * s, -0.35 * s, 0.25 * (1 - s));
                    this.applyBoneDelta(b.forearmR, 0.55 - 0.35 * s, 0, 0);
                    this.applyBoneDelta(b.handR, 0, 0, 0.45 * s);
                } else {
                    // Phase 3: Follow-through / Recover
                    const r = (progress - 0.65) / 0.35;
                    this.applyBoneDelta(b.chest, 0.12 * (1 - r), 0.40 * (1 - r), 0);
                    this.applyBoneDelta(b.upperArmR, 0.60 * (1 - r), -0.35 * (1 - r), 0.25 * r);
                    this.applyBoneDelta(b.forearmR, 0.20 * (1 - r), 0, 0);
                }
            } else {
                this.isAttacking = false;
            }
            return;
        }

        // Airborne Jump
        if (!isGrounded) {
            this.applyBoneDelta(b.thighR, 0.55, 0, 0);
            this.applyBoneDelta(b.thighL, 0.45, 0, 0);
            this.applyBoneDelta(b.calfR, -0.75, 0, 0);
            this.applyBoneDelta(b.calfL, -0.65, 0, 0);
            this.applyBoneDelta(b.upperArmR, 0, 0, 0.65);
            this.applyBoneDelta(b.upperArmL, 0, 0, -0.65);
            return;
        }

        // Locomotion: Walk / Run / Sprint
        if (moveSpeedRatio > 0.05) {
            const speed = Math.max(0.4, Math.min(1.0, moveSpeedRatio));
            const freq = 7.2 * speed;
            const legAmp = 0.72 * speed;
            const legPhase = t * freq;

            // Leg striding counter-phase
            this.applyBoneDelta(b.thighR, Math.sin(legPhase) * legAmp, 0, 0);
            this.applyBoneDelta(b.thighL, -Math.sin(legPhase) * legAmp, 0, 0);

            // Knees bend backwards when foot lifts off ground
            this.applyBoneDelta(b.calfR, Math.max(0, -Math.sin(legPhase + 0.3)) * 0.95, 0, 0);
            this.applyBoneDelta(b.calfL, Math.max(0, Math.sin(legPhase + 0.3)) * 0.95, 0, 0);

            // Counter arm swinging (opposite to legs)
            const armAmp = 0.58 * speed;
            this.applyBoneDelta(b.upperArmR, -Math.sin(legPhase) * armAmp, 0, 0.25);
            this.applyBoneDelta(b.upperArmL, Math.sin(legPhase) * armAmp, 0, -0.25);
            this.applyBoneDelta(b.forearmR, 0.35, 0, 0);
            this.applyBoneDelta(b.forearmL, 0.35, 0, 0);

            // Forward spine lean & gentle hip bounce
            this.applyBoneDelta(b.chest, 0.12 * speed, 0, 0);
            if (b.hips && b.hips.userData.restPos) {
                b.hips.position.y = b.hips.userData.restPos.y + Math.abs(Math.sin(legPhase * 2)) * 0.04;
            }
        } else {
            // Natural Relaxed Idle (Anti A-Pose: Arms down at sides, subtle breathing)
            const breath = Math.sin(t * 2.2) * 0.035;
            this.applyBoneDelta(b.chest, breath, 0, 0);
            this.applyBoneDelta(b.head, -breath * 0.6, 0, 0);

            // Lower upper arms to sides from T/A-pose
            this.applyBoneDelta(b.upperArmR, 0.08, 0, 0.45 + breath * 0.3);
            this.applyBoneDelta(b.upperArmL, 0.08, 0, -0.45 - breath * 0.3);
            this.applyBoneDelta(b.forearmR, 0.25, 0, 0);
            this.applyBoneDelta(b.forearmL, 0.25, 0, 0);

            // Reset legs to neutral rest pose
            this.applyBoneDelta(b.thighR, 0, 0, 0);
            this.applyBoneDelta(b.thighL, 0, 0, 0);
            this.applyBoneDelta(b.calfR, 0, 0, 0);
            this.applyBoneDelta(b.calfL, 0, 0, 0);
            if (b.hips && b.hips.userData.restPos) {
                b.hips.position.y = b.hips.userData.restPos.y;
            }
        }
    }

    applyLateUpdateOverrides(dt, terrainNormal) {
        const b = this.bones;

        // 1. Spine Target Aiming
        if (Math.abs(this.targetAimYaw) > 0.01 && b.chest) {
            const qAim = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.targetAimYaw * 0.5);
            b.chest.quaternion.multiply(qAim);
        }

        // 2. Damped Spring Hit Recoil
        const springStiffness = 180;
        const springDamping = 14;
        const springForce = -springStiffness * this.recoilPitch - springDamping * this.recoilVelocity;
        this.recoilVelocity += springForce * dt;
        this.recoilPitch += this.recoilVelocity * dt;

        if (b.chest && Math.abs(this.recoilPitch) > 0.001) {
            const qRecoil = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.recoilPitch);
            b.chest.quaternion.multiply(qRecoil);
        }
    }
}
