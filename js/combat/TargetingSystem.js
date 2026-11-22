/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/combat/TargetingSystem.js
 * 
 * Master Hybrid 3D Targeting & Camera Management:
 * - Dual Camera Switcher (Genshin 3D Action vs MLBB Tactical Isometric)
 * - 4-Layer Target Lock (Auto Soft-Lock, Hard-Lock Hero Wheel, Minion/Turret Priority)
 * - Quick-Tap vs Hold-and-Drag 3D Ground Reticle Projections adhering to Terrain
 * - Red Cancel Zone (icon_cancel.webp)
 */

import * as THREE from 'three';
import { CAMERA_PROFILES } from '../config/constants.js';
import { getTerrainHeight } from '../world/TerrainSystem.js';

export class TargetingSystem {
    /**
     * @param {Object} options
     * @param {THREE.Camera} options.camera
     * @param {THREE.Scene} options.scene
     * @param {HTMLElement} options.domElement
     */
    constructor({ camera, scene, domElement }) {
        this.camera = camera;
        this.scene = scene;
        this.dom = domElement;

        this.cameraMode = 'genshin'; // 'genshin' or 'mlbb'
        this.camYaw = 0;
        this.camPitch = CAMERA_PROFILES.GENSHIN.minPitch + 0.25;
        this.camDist = CAMERA_PROFILES.GENSHIN.distance;

        this.player = null;
        this.entities = [];
        this.softTarget = null;
        this.hardTarget = null;
        this.targetPriority = 'lowest_hp_pct'; // 'lowest_hp_pct' or 'closest'

        // 3D Reticle Decals Group
        this.reticlesGroup = new THREE.Group();
        this.scene.add(this.reticlesGroup);

        this.activeAimSkill = null;
        this.aimDir = new THREE.Vector3(0, 0, 1);
        this.aimGroundPos = new THREE.Vector3();
        this.isAiming = false;
        this.isCancelHovered = false;

        this.initDecals();
        this.setupCameraControls();
    }

    setupCameraControls() {
        let isDragging = false;
        let lastX = 0, lastY = 0;

        window.addEventListener('pointerdown', (e) => {
            // Check if clicking interactive UI element
            if (e.target && e.target.closest('button, .analog-zone, .skill-btn, .skill-btn-circle, .btn-action-main, .hud-interactive, .modal, .curr-pill, .btn-filter-icon, .team-tab-btn, .hero-card-3col, .arena-card-thumb, .sandbox-card-thumb, .minimap-frame-box, .fast-travel-panel')) {
                return;
            }
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });

        window.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;

            // 360 Full Horizontal Rotation
            this.camYaw -= dx * 0.0055;

            // Vertical Elevation Clamp: 10 deg (0.17 rad) to 65 deg (1.13 rad)
            const minPitch = 0.17;
            const maxPitch = 1.13;
            this.camPitch = Math.max(minPitch, Math.min(maxPitch, this.camPitch + dy * 0.004));
        });

        window.addEventListener('pointerup', () => {
            isDragging = false;
        });

        window.addEventListener('pointercancel', () => {
            isDragging = false;
        });

        // Mouse Wheel Zoom: 3.5m to 18.0m
        window.addEventListener('wheel', (e) => {
            const zoomDelta = e.deltaY * 0.01;
            this.camDist = Math.max(3.5, Math.min(18.0, this.camDist + zoomDelta));
        }, { passive: true });
    }

    setPlayer(player) {
        this.player = player;
    }

    setEntities(entities) {
        this.entities = entities;
    }

    setCameraMode(mode) {
        this.cameraMode = mode;
        if (mode === 'mlbb') {
            this.camera.fov = CAMERA_PROFILES.MLBB.fov;
            this.camPitch = CAMERA_PROFILES.MLBB.pitch;
            this.camDist = CAMERA_PROFILES.MLBB.distance;
        } else {
            this.camera.fov = CAMERA_PROFILES.GENSHIN.fov;
            this.camDist = CAMERA_PROFILES.GENSHIN.distance;
        }
        this.camera.updateProjectionMatrix();
    }

    initDecals() {
        // Directional Aim Arrow (Cone + Line)
        const arrowGeo = new THREE.ConeGeometry(0.8, 2.2, 16);
        arrowGeo.rotateX(Math.PI / 2);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, depthWrite: false });
        this.aimArrow = new THREE.Mesh(arrowGeo, arrowMat);
        this.aimArrow.position.set(0, 0.08, 4.5);

        const lineGeo = new THREE.PlaneGeometry(0.4, 7.5);
        lineGeo.rotateX(-Math.PI / 2);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, depthWrite: false });
        this.aimLine = new THREE.Mesh(lineGeo, lineMat);
        this.aimLine.position.set(0, 0.07, 3.5);

        this.arrowGroup = new THREE.Group();
        this.arrowGroup.add(this.aimArrow);
        this.arrowGroup.add(this.aimLine);
        this.arrowGroup.visible = false;
        this.reticlesGroup.add(this.arrowGroup);

        // Circular AoE Ring
        const ringGeo = new THREE.RingGeometry(4.2, 4.6, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.85, depthWrite: false });
        this.aoeRing = new THREE.Mesh(ringGeo, ringMat);

        const fillGeo = new THREE.CircleGeometry(4.2, 24);
        fillGeo.rotateX(-Math.PI / 2);
        const fillMat = new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.25, depthWrite: false });
        this.aoeFill = new THREE.Mesh(fillGeo, fillMat);

        this.aoeGroup = new THREE.Group();
        this.aoeGroup.add(this.aoeRing);
        this.aoeGroup.add(this.aoeFill);
        this.aoeGroup.visible = false;
        this.reticlesGroup.add(this.aoeGroup);
    }

    startAiming(skillSlot, isAoE = false) {
        this.isAiming = true;
        this.activeAimSkill = skillSlot;
        this.isCancelHovered = false;

        if (isAoE) {
            this.aoeGroup.visible = true;
            this.arrowGroup.visible = false;
        } else {
            this.arrowGroup.visible = true;
            this.aoeGroup.visible = false;
        }
    }

    updateAimDrag(dragDeltaX, dragDeltaY, isCancelHovered = false) {
        if (!this.isAiming || !this.player) return;
        this.isCancelHovered = isCancelHovered;

        // Project relative to camera forward
        const sin = Math.sin(this.camYaw);
        const cos = Math.cos(this.camYaw);

        const worldX = dragDeltaX * cos + dragDeltaY * sin;
        const worldZ = -dragDeltaX * sin + dragDeltaY * cos;

        this.aimDir.set(worldX, 0, worldZ).normalize();
        this.aimGroundPos.copy(this.player.position).add(this.aimDir.clone().multiplyScalar(6.5));

        // Update Arrow
        this.arrowGroup.position.copy(this.player.position);
        this.arrowGroup.position.y += 0.05;
        this.arrowGroup.rotation.y = Math.atan2(this.aimDir.x, this.aimDir.z);

        // Update AoE
        this.aoeGroup.position.copy(this.aimGroundPos);
        this.aoeGroup.position.y = getTerrainHeight(this.aimGroundPos.x, this.aimGroundPos.z, this.sceneMode) + 0.08;

        // Color update if in cancel zone
        const color = isCancelHovered ? 0xef4444 : 0x38bdf8;
        this.aimArrow.material.color.set(color);
        this.aimLine.material.color.set(color);
        this.aoeRing.material.color.set(isCancelHovered ? 0xef4444 : 0xec4899);
    }

    endAiming() {
        const result = {
            cancelled: this.isCancelHovered,
            skillSlot: this.activeAimSkill,
            aimDir: this.aimDir.clone(),
            aimPos: this.aimGroundPos.clone(),
            target: this.hardTarget || this.softTarget
        };

        this.isAiming = false;
        this.activeAimSkill = null;
        this.arrowGroup.visible = false;
        this.aoeGroup.visible = false;

        return result;
    }

    update(dt) {
        this.updateTargeting();
        this.updateCamera(dt);
    }

    /**
     * Finds and updates auto soft-target and hero wheel candidates
     */
    updateTargeting(range = 14) {
        if (!this.player || !this.player.position) return;

        // Scan valid enemies
        const enemies = this.entities.filter(e => e && e.hp > 0 && e.team !== this.player.team);
        let bestTarget = null;
        let bestScore = Infinity;

        for (const e of enemies) {
            const dist = e.position.distanceTo(this.player.position);
            if (dist > range) continue;

            const hpRatio = e.hp / (e.maxHp || 1);
            let score = dist;

            if (this.targetPriority === 'lowest_hp_pct') {
                score = hpRatio * 100 + (dist * 0.5);
            }

            // Hero priority bonus
            if (e.isHero) score -= 30;

            if (score < bestScore) {
                bestScore = score;
                bestTarget = e;
            }
        }

        this.softTarget = bestTarget;

        // If hard target is dead or out of range, clear it
        if (this.hardTarget && (this.hardTarget.hp <= 0 || this.hardTarget.position.distanceTo(this.player.position) > 28)) {
            this.hardTarget = null;
        }
    }

    setHardTarget(entity) {
        this.hardTarget = entity;
    }

    setPriorityTarget(type) {
        // type: 'minion' or 'turret'
        const candidate = this.entities.find(e => {
            if (!e || e.hp <= 0 || e.team === this.player.team) return false;
            if (type === 'minion' && e.isMinion) return true;
            if (type === 'turret' && (e.isTurret || e.isNexus)) return true;
            return false;
        });

        if (candidate) {
            this.hardTarget = candidate;
        }
    }

    getCurrentTarget() {
        return this.hardTarget || this.softTarget || null;
    }

    updateCamera(dt) {
        if (!this.player || !this.player.position) return;

        const targetPos = this.player.position;

        if (this.cameraMode === 'genshin') {
            // Third person follow
            const cx = targetPos.x - Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
            const cy = targetPos.y + CAMERA_PROFILES.GENSHIN.heightOffset + Math.sin(this.camPitch) * this.camDist;
            const cz = targetPos.z - Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;

            this.camera.position.set(cx, cy, cz);
            this.camera.lookAt(targetPos.x, targetPos.y + CAMERA_PROFILES.GENSHIN.heightOffset, targetPos.z);
        } else {
            // MLBB Tactical Top-Down
            const cx = targetPos.x;
            const cy = targetPos.y + Math.sin(this.camPitch) * this.camDist;
            const cz = targetPos.z + Math.cos(this.camPitch) * this.camDist;

            this.camera.position.set(cx, cy, cz);
            this.camera.lookAt(targetPos.x, targetPos.y, targetPos.z);
        }
    }
}
