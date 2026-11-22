/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/character/LocomotionController.js
 * 
 * Master Locomotion Physics:
 * - 360° Movement relative to Active Camera Yaw
 * - Acceleration & Deceleration Smoothing
 * - Jump & Gravity Arc with Hill Climb Slope Limits (max 35°)
 * - Collision Sliding & Boundary Clamping
 * - Footstep & Water Splash Trigger Callbacks
 */

import * as THREE from 'three';
import { PHYSICS, WORLDS } from '../config/constants.js';
import { getTerrainHeight, getTerrainNormal } from '../world/TerrainSystem.js';

export class LocomotionController {
    /**
     * @param {Object} options
     * @param {THREE.Object3D} options.characterRoot
     * @param {string} [options.sceneMode='sandbox']
     * @param {Object} [options.worldBuilder=null]
     * @param {Function} [options.onFootstep=null]
     */
    constructor({ characterRoot, sceneMode = 'sandbox', worldBuilder = null, onFootstep = null }) {
        this.root = characterRoot;
        this.sceneMode = sceneMode;
        this.worldBuilder = worldBuilder;
        this.onFootstep = onFootstep;

        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveDir = new THREE.Vector3(0, 0, 0);

        this.isGrounded = true;
        this.isSprinting = false;
        this.moveSpeedStat = 250; // MOBA MS stat (250 = 6.4 m/s)
        this.currentSpeed = 0;

        this.facingYaw = 0;
        this.targetFacingYaw = 0;
        this.lockedTargetPos = null;

        this.footstepDistance = 0;
        this.footstepStepSize = 2.4; // meters between footsteps
        this.terrainNormal = new THREE.Vector3(0, 1, 0);
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.root.position.copy(this.position);
    }

    setMoveInput(inputX, inputZ, cameraYaw = 0) {
        if (Math.hypot(inputX, inputZ) < 0.05) {
            this.moveDir.set(0, 0, 0);
            return;
        }

        // Project input relative to camera forward/right
        const sin = Math.sin(cameraYaw);
        const cos = Math.cos(cameraYaw);

        const worldX = inputX * cos + inputZ * sin;
        const worldZ = -inputX * sin + inputZ * cos;

        this.moveDir.set(worldX, 0, worldZ).normalize();
    }

    setSprinting(sprint) {
        this.isSprinting = sprint;
    }

    jump() {
        if (this.isGrounded) {
            this.velocity.y = PHYSICS.JUMP_VELOCITY;
            this.isGrounded = false;
            if (this.onFootstep) {
                this.onFootstep('jump', this.position);
            }
        }
    }

    setLockedTarget(targetPos) {
        this.lockedTargetPos = targetPos;
    }

    update(dt) {
        // 1. Calculate Target Ground Speed (m/s)
        let targetSpeed = (this.moveSpeedStat / 250) * 6.4;
        if (this.isSprinting && this.sceneMode === 'sandbox') {
            targetSpeed *= 1.48; // Sprint multiplier
        }

        const isMoving = this.moveDir.lengthSq() > 0.01;
        const accel = this.isGrounded ? PHYSICS.BASE_GROUND_ACCEL : PHYSICS.BASE_AIR_ACCEL;
        const decel = PHYSICS.BASE_GROUND_DECEL;

        // 2. Accelerate / Decelerate
        if (isMoving) {
            this.currentSpeed = Math.min(targetSpeed, this.currentSpeed + accel * dt);
        } else {
            this.currentSpeed = Math.max(0, this.currentSpeed - decel * dt);
        }

        // 3. Horizontal Velocity
        if (isMoving) {
            this.velocity.x = this.moveDir.x * this.currentSpeed;
            this.velocity.z = this.moveDir.z * this.currentSpeed;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // 4. Gravity & Vertical Velocity
        this.velocity.y += PHYSICS.GRAVITY * dt;
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
        this.position.y += this.velocity.y * dt;

        // 5. Ground Height & Slope Evaluation
        const groundY = getTerrainHeight(this.position.x, this.position.z, this.sceneMode);
        getTerrainNormal(this.position.x, this.position.z, this.sceneMode, this.terrainNormal);

        // Slope angle limit (max 35 deg = normal.y >= 0.819)
        if (this.terrainNormal.y < 0.819 && isMoving) {
            // Push back slightly down the slope
            this.position.x -= this.moveDir.x * 0.45 * dt;
            this.position.z -= this.moveDir.z * 0.45 * dt;
        }

        // Ground clamping
        if (this.position.y <= groundY) {
            this.position.y = groundY;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // 6. Collision Sliding with World Props
        if (this.worldBuilder) {
            this.worldBuilder.resolveCollision(this.position, 0.55);
        }

        // 7. World Boundary Clamping
        this.clampBoundaries();

        // 8. Update Character Visual Transform
        this.root.position.copy(this.position);

        // 9. Smooth Facing Rotation
        this.updateRotation(dt, isMoving);

        // 10. Footstep Triggers
        if (this.isGrounded && isMoving && this.currentSpeed > 1.0) {
            this.footstepDistance += this.currentSpeed * dt;
            if (this.footstepDistance >= this.footstepStepSize) {
                this.footstepDistance = 0;
                if (this.onFootstep) {
                    const isWater = this.position.y < 0.25;
                    this.onFootstep(isWater ? 'water_step' : 'step', this.position);
                }
            }
        }
    }

    clampBoundaries() {
        if (this.sceneMode === 'sandbox') {
            const b = WORLDS.SANDBOX.bounds;
            this.position.x = Math.max(b.minX, Math.min(b.maxX, this.position.x));
            this.position.z = Math.max(b.minZ, Math.min(b.maxZ, this.position.z));
        } else if (this.sceneMode === 'arena_colosseum') {
            const r = Math.hypot(this.position.x, this.position.z);
            const maxR = WORLDS.ARENA_COLOSSEUM.radius;
            if (r > maxR) {
                this.position.x = (this.position.x / r) * maxR;
                this.position.z = (this.position.z / r) * maxR;
            }
        } else if (this.sceneMode === 'arena_ocean_bridge') {
            const b = WORLDS.ARENA_OCEAN_BRIDGE.bounds;
            this.position.x = Math.max(b.minX, Math.min(b.maxX, this.position.x));
            this.position.z = Math.max(b.minZ, Math.min(b.maxZ, this.position.z));
        } else if (this.sceneMode === 'arena_sky_sakura') {
            const r = Math.hypot(this.position.x, this.position.z);
            const maxR = WORLDS.ARENA_SKY_SAKURA.radius;
            if (r > maxR) {
                this.position.x = (this.position.x / r) * maxR;
                this.position.z = (this.position.z / r) * maxR;
            }
        }
    }

    updateRotation(dt, isMoving) {
        if (this.lockedTargetPos) {
            // Face target directly when aiming or locked
            const dx = this.lockedTargetPos.x - this.position.x;
            const dz = this.lockedTargetPos.z - this.position.z;
            this.targetFacingYaw = Math.atan2(dx, dz);
        } else if (isMoving) {
            // Face movement direction
            this.targetFacingYaw = Math.atan2(this.moveDir.x, this.moveDir.z);
        }

        // Shortest arc slerp
        let diff = this.targetFacingYaw - this.facingYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const turnSpeed = 14.0;
        this.facingYaw += diff * Math.min(1.0, turnSpeed * dt);
        this.root.rotation.y = this.facingYaw;
    }
}
