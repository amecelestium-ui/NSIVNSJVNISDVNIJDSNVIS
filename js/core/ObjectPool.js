/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/core/ObjectPool.js
 * 
 * Generic Zero-GC Object Pool System:
 * - Projectiles, Shockwaves, Dynamic Lights, Floating Damage Numbers, Footsteps & Ripples
 */

import * as THREE from 'three';

export class ObjectPool {
    /**
     * @param {Object} options
     * @param {Function} options.create Factory function
     * @param {Function} options.reset Reset callback
     * @param {number} [options.initialSize=16]
     * @param {number} [options.maxSize=256]
     */
    constructor({ create, reset = (obj) => obj, initialSize = 16, maxSize = 256 }) {
        this.create = create;
        this.reset = reset;
        this.maxSize = maxSize;

        this.pool = [];
        this.active = new Set();

        this.warmup(initialSize);
    }

    warmup(count) {
        for (let i = 0; i < count; i++) {
            const obj = this.create();
            this.pool.push(obj);
        }
    }

    acquire(...args) {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.create();
        }

        this.reset(obj, ...args);
        this.active.add(obj);
        return obj;
    }

    release(obj) {
        if (!this.active.has(obj)) return;
        this.active.delete(obj);

        if (this.pool.length < this.maxSize) {
            this.reset(obj);
            this.pool.push(obj);
        } else {
            // Let GC take it if pool exceeds capacity
            if (obj.dispose) obj.dispose();
        }
    }

    releaseAll() {
        for (const obj of this.active) {
            this.reset(obj);
            if (this.pool.length < this.maxSize) {
                this.pool.push(obj);
            }
        }
        this.active.clear();
    }

    getActive() {
        return Array.from(this.active);
    }
}

// =========================================================================
// CONCRETE PRESET POOLS
// =========================================================================

/**
 * Explosion & Skill Impact PointLight Pool (Max 4 active lights)
 */
export function createPointLightPool(scene) {
    return new ObjectPool({
        initialSize: 4,
        maxSize: 8,
        create: () => {
            const light = new THREE.PointLight(0x38bdf8, 0, 14, 2.0);
            light.visible = false;
            scene.add(light);
            return {
                light,
                life: 0,
                maxLife: 0.35,
                peakIntensity: 4.5,
                active: false
            };
        },
        reset: (item, color = 0x38bdf8, intensity = 4.5, duration = 0.35, pos = null) => {
            if (pos) {
                item.light.position.copy(pos);
                item.light.color.set(color);
                item.light.intensity = intensity;
                item.light.visible = true;
                item.life = duration;
                item.maxLife = duration;
                item.peakIntensity = intensity;
                item.active = true;
            } else {
                item.light.visible = false;
                item.active = false;
            }
        }
    });
}

/**
 * Expanding Shockwave Ring Mesh Pool
 */
export function createShockwavePool(scene) {
    const ringGeo = new THREE.RingGeometry(0.2, 0.45, 32);
    ringGeo.rotateX(-Math.PI / 2);

    return new ObjectPool({
        initialSize: 6,
        maxSize: 16,
        create: () => {
            const mat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(ringGeo, mat);
            mesh.visible = false;
            scene.add(mesh);
            return {
                mesh,
                scale: 1,
                maxScale: 6.5,
                life: 0,
                maxLife: 0.4,
                active: false
            };
        },
        reset: (item, color = 0x38bdf8, maxRadius = 6.5, duration = 0.4, pos = null) => {
            if (pos) {
                item.mesh.position.copy(pos);
                item.mesh.position.y += 0.08;
                item.mesh.scale.set(1, 1, 1);
                item.mesh.material.color.set(color);
                item.mesh.material.opacity = 0.9;
                item.mesh.visible = true;
                item.scale = 1;
                item.maxScale = maxRadius;
                item.life = duration;
                item.maxLife = duration;
                item.active = true;
            } else {
                item.mesh.visible = false;
                item.active = false;
            }
        }
    });
}
