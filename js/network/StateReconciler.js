/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/network/StateReconciler.js
 * 
 * Gabriel Gambetta Fast-Paced Multiplayer Architecture:
 * - 60 Hz Client-Side Prediction with Pending Input Sequence Buffer
 * - Authoritative Server Reconciliation Replay with Error Smoothing
 * - 100ms Entity Interpolation Buffer for Remote Players & Minions
 */

import * as THREE from 'three';
import { NETWORK } from '../config/constants.js';

export class StateReconciler {
    constructor() {
        this.inputSequence = 0;
        this.pendingInputs = []; // { seq, dx, dz, dt, sprint, jump }

        // Ring buffer for remote entity snapshots (5 frames)
        this.remoteSnapshots = [];
        this.maxSnapshots = 5;
    }

    /**
     * Records local player input before applying prediction
     */
    recordInput(dx, dz, dt, sprint = false, jump = false) {
        this.inputSequence++;
        const inputItem = {
            seq: this.inputSequence,
            dx,
            dz,
            dt,
            sprint,
            jump
        };
        this.pendingInputs.push(inputItem);
        return inputItem;
    }

    /**
     * Reconciles local player state against authoritative server snapshot
     * @param {Object} playerController Local player LocomotionController
     * @param {Object} serverState Server authoritative player state
     */
    reconcile(playerController, serverState) {
        if (!playerController || !serverState) return;

        const seqAck = serverState.seqAck || 0;

        // Discard acknowledged inputs
        this.pendingInputs = this.pendingInputs.filter(item => item.seq > seqAck);

        // Calculate discrepancy between local predicted position and server position
        const serverPos = new THREE.Vector3(serverState.x, serverState.y, serverState.z);
        const dist = playerController.position.distanceTo(serverPos);

        if (dist > NETWORK.SNAP_DISTANCE_METERS) {
            // Hard snap if discrepancy exceeds 2.5m
            playerController.setPosition(serverPos.x, serverPos.y, serverPos.z);
        } else if (dist > 0.08) {
            // Exponential smoothing replay
            playerController.position.lerp(serverPos, NETWORK.INPUT_PREDICTION_SMOOTHING);

            // Replay remaining unacknowledged inputs
            for (const input of this.pendingInputs) {
                playerController.setMoveInput(input.dx, input.dz, playerController.facingYaw);
                playerController.update(input.dt);
            }
        }
    }

    /**
     * Pushes remote server snapshot for 100ms entity interpolation
     */
    pushRemoteSnapshot(snapshot) {
        this.remoteSnapshots.push({
            timestamp: Date.now(),
            ...snapshot
        });

        if (this.remoteSnapshots.length > this.maxSnapshots) {
            this.remoteSnapshots.shift();
        }
    }

    /**
     * Interpolates remote entities at renderTime = Date.now() - 100ms
     * @param {Map<string, Object>} remoteMeshes Map of remote entities
     */
    interpolateRemoteEntities(remoteMeshes) {
        if (this.remoteSnapshots.length < 2) return;

        const renderTime = Date.now() - NETWORK.ENTITY_INTERPOLATION_OFFSET_MS;

        // Find 2 surrounding snapshots
        let s0 = null;
        let s1 = null;

        for (let i = 0; i < this.remoteSnapshots.length - 1; i++) {
            if (this.remoteSnapshots[i].timestamp <= renderTime && this.remoteSnapshots[i + 1].timestamp >= renderTime) {
                s0 = this.remoteSnapshots[i];
                s1 = this.remoteSnapshots[i + 1];
                break;
            }
        }

        if (!s0 || !s1) {
            s0 = this.remoteSnapshots[this.remoteSnapshots.length - 2];
            s1 = this.remoteSnapshots[this.remoteSnapshots.length - 1];
        }

        const delta = s1.timestamp - s0.timestamp;
        const alpha = delta > 0 ? (renderTime - s0.timestamp) / delta : 0;
        const clampedAlpha = Math.max(0, Math.min(1, alpha));

        // Interpolate each remote player
        if (s0.players && s1.players) {
            for (const [id, entity] of remoteMeshes.entries()) {
                const p0 = s0.players[id];
                const p1 = s1.players[id];
                if (p0 && p1 && entity.mesh) {
                    entity.mesh.position.set(
                        THREE.MathUtils.lerp(p0.x, p1.x, clampedAlpha),
                        THREE.MathUtils.lerp(p0.y, p1.y, clampedAlpha),
                        THREE.MathUtils.lerp(p0.z, p1.z, clampedAlpha)
                    );
                    entity.mesh.rotation.y = THREE.MathUtils.lerp(p0.yaw || 0, p1.yaw || 0, clampedAlpha);
                }
            }
        }
    }
}
