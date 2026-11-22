/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/character/AnimationStateMachine.js
 * 
 * 13-State Animation Machine with Smooth Cross-Fading,
 * LateUpdate Bone Overrides (Spine Aiming, Slope Tilt, Hit Recoil),
 * and Mathematical Procedural Skeletal Animation Fallback.
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
        this.clips = clips;

        this.mixer = new THREE.AnimationMixer(modelRoot);
        this.actions = {};
        this.currentState = 'IDLE';
        this.currentAction = null;

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
        for (const clip of this.clips) {
            const name = clip.name.toUpperCase();
            this.actions[name] = this.mixer.clipAction(clip);
        }

        // Set initial action if available
        if (this.actions['IDLE']) {
            this.currentAction = this.actions['IDLE'];
            this.currentAction.play();
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
            this.attackDuration = newState === 'ULTIMATE' ? 0.95 : (newState.startsWith('SKILL_') ? 0.55 : 0.42);
        } else {
            this.isAttacking = false;
        }
    }

    triggerRecoil(impulse = -0.22) {
        this.recoilVelocity += impulse;
    }

    setTargetAimYaw(deltaYaw) {
        // Clamp to +-42 degrees
        const maxRad = 42 * (Math.PI / 180);
        this.targetAimYaw = Math.max(-maxRad, Math.min(maxRad, deltaYaw));
    }

    update(dt, moveSpeedRatio = 0, isGrounded = true, terrainNormal = null) {
        this.proceduralPhase += dt;

        // 1. Advance clip mixer
        this.mixer.update(dt);

        // 2. Procedural Animation Layer (Runs when clips are absent or for attacks)
        this.updateProceduralSkeletal(dt, moveSpeedRatio, isGrounded);

        // 3. LateUpdate Bone Overrides (Executed after mixer.update to eliminate flicker)
        this.applyLateUpdateOverrides(dt, terrainNormal);
    }

    updateProceduralSkeletal(dt, moveSpeedRatio, isGrounded) {
        const t = this.proceduralPhase;
        const bones = this.bones;
        if (!bones.chest) return;

        if (this.isAttacking) {
            this.attackPhase += dt;
            const progress = this.attackPhase / this.attackDuration;

            if (progress <= 1.0) {
                // Foreswing -> Active Strike -> Backswing
                if (progress < 0.28) {
                    // Foreswing: shoulder draw back
                    const fore = progress / 0.28;
                    if (bones.chest) bones.chest.rotation.y = -0.25 * fore;
                    if (bones.upperArmR) bones.upperArmR.rotation.x = -0.45 * fore;
                } else if (progress < 0.62) {
                    // Strike: forward slash
                    const strike = (progress - 0.28) / 0.34;
                    if (bones.chest) bones.chest.rotation.y = -0.25 + 0.65 * strike;
                    if (bones.upperArmR) bones.upperArmR.rotation.x = -0.45 + 0.95 * strike;
                    if (bones.handR) bones.handR.rotation.z = 0.45 * strike;
                } else {
                    // Backswing: return
                    const back = (progress - 0.62) / 0.38;
                    if (bones.chest) bones.chest.rotation.y = 0.40 * (1 - back);
                    if (bones.upperArmR) bones.upperArmR.rotation.x = 0.50 * (1 - back);
                }
            } else {
                this.isAttacking = false;
            }
            return;
        }

        if (!isGrounded) {
            // Jump pose: legs tucked slightly
            if (bones.thighR) bones.thighR.rotation.x = 0.45;
            if (bones.thighL) bones.thighL.rotation.x = 0.35;
            if (bones.calfR) bones.calfR.rotation.x = -0.65;
            if (bones.calfL) bones.calfL.rotation.x = -0.55;
            if (bones.upperArmR) bones.upperArmR.rotation.z = 0.45;
            if (bones.upperArmL) bones.upperArmL.rotation.z = -0.45;
            return;
        }

        if (moveSpeedRatio > 0.1) {
            // Locomotion Walk / Run / Sprint
            const freq = 6.8 * moveSpeedRatio;
            const legAmp = 0.68 * Math.min(1.0, moveSpeedRatio);

            const legPhase = t * freq;
            if (bones.thighR) bones.thighR.rotation.x = Math.sin(legPhase) * legAmp;
            if (bones.thighL) bones.thighL.rotation.x = -Math.sin(legPhase) * legAmp;

            if (bones.calfR) bones.calfR.rotation.x = Math.max(0, -Math.sin(legPhase + 0.4)) * 0.92;
            if (bones.calfL) bones.calfL.rotation.x = Math.max(0, Math.sin(legPhase + 0.4)) * 0.92;

            // Opposing arm swing
            const armAmp = 0.55 * Math.min(1.0, moveSpeedRatio);
            if (bones.upperArmR) bones.upperArmR.rotation.x = -Math.sin(legPhase) * armAmp;
            if (bones.upperArmL) bones.upperArmL.rotation.x = Math.sin(legPhase) * armAmp;

            // Hip vertical bounce
            if (bones.hips) bones.hips.position.y = Math.abs(Math.sin(legPhase * 2)) * 0.06;
        } else {
            // Idle breathing
            const breath = Math.sin(t * 2.2) * 0.035;
            if (bones.chest) bones.chest.rotation.x = breath;
            if (bones.head) bones.head.rotation.x = -breath * 0.5;
            if (bones.upperArmR) bones.upperArmR.rotation.z = 0.15 + breath * 0.5;
            if (bones.upperArmL) bones.upperArmL.rotation.z = -0.15 - breath * 0.5;
        }
    }

    applyLateUpdateOverrides(dt, terrainNormal) {
        const bones = this.bones;

        // 1. Spine Target Aiming (Rotate upper body towards locked target)
        if (Math.abs(this.targetAimYaw) > 0.01) {
            const spineRot = this.targetAimYaw * 0.45;
            const chestRot = this.targetAimYaw * 0.55;

            if (bones.spine) bones.spine.rotation.y += spineRot;
            if (bones.chest) bones.chest.rotation.y += chestRot;
        }

        // 2. Damped Spring Hit Recoil
        const springStiffness = 180;
        const springDamping = 14;
        const springForce = -springStiffness * this.recoilPitch - springDamping * this.recoilVelocity;
        this.recoilVelocity += springForce * dt;
        this.recoilPitch += this.recoilVelocity * dt;

        if (bones.chest && Math.abs(this.recoilPitch) > 0.001) {
            bones.chest.rotation.x += this.recoilPitch;
        }

        // 3. Terrain Slope Tilt Compensation
        if (terrainNormal && bones.hips) {
            const slopePitch = Math.asin(Math.max(-0.25, Math.min(0.25, -terrainNormal.z)));
            bones.hips.rotation.x += slopePitch * 0.65;
        }
    }
}
