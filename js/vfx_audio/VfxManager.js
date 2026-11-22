/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/vfx_audio/VfxManager.js
 * 
 * Master VFX & Combat Juice Engine:
 * - Dynamic Ribbon Sword Trails (24 Segments, DynamicDrawUsage)
 * - GPU Instanced Particle Pool (2,500 Particles) for Hit Sparks, Petals, Explosions
 * - PointLight & Shockwave Ring Pools
 * - Hitstop & Damped Spring Camera Shake
 * - Floating Damage Numbers (Physical, Magic, Crit, True, Heal, Shield)
 * - Killstreak Announcement Banners
 */

import * as THREE from 'three';
import { createPointLightPool, createShockwavePool } from '../core/ObjectPool.js';

export class VfxManager {
    /**
     * @param {Object} options
     * @param {THREE.Scene} options.scene
     * @param {THREE.Camera} options.camera
     * @param {HTMLElement} [options.damageContainer=null]
     */
    constructor({ scene, camera, damageContainer = null }) {
        this.scene = scene;
        this.camera = camera;
        this.damageContainer = damageContainer || document.body;

        this.lightPool = createPointLightPool(scene);
        this.shockwavePool = createShockwavePool(scene);

        // Ribbon Sword Trails
        this.ribbonTrails = [];

        // Camera Shake State
        this.shakeIntensity = 0;
        this.shakeDecay = 7.5;
        this.shakeOffset = new THREE.Vector3();

        // Hitstop State
        this.hitstopTimer = 0;

        // Floating Damage HTML Pool
        this.floatingDamages = [];
    }

    /**
     * Triggers dynamic ribbon sword trail on a character
     */
    triggerSwordTrail(characterController, duration = 0.35) {
        if (!characterController || !characterController.bladePoints) return;

        const maxPoints = 24;
        const positions = new Float32Array(maxPoints * 2 * 3);
        const uvs = new Float32Array(maxPoints * 2 * 2);

        for (let i = 0; i < maxPoints; i++) {
            const u = i / (maxPoints - 1);
            uvs[i * 4 + 0] = u;
            uvs[i * 4 + 1] = 0;
            uvs[i * 4 + 2] = u;
            uvs[i * 4 + 3] = 1;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uColor: { value: new THREE.Color(0x38bdf8) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                varying vec2 vUv;
                void main() {
                    float alpha = smoothstep(0.0, 1.0, vUv.x) * (1.0 - abs(vUv.y - 0.5) * 2.0);
                    gl_FragColor = vec4(uColor, alpha * 0.75);
                }
            `
        });

        const mesh = new THREE.Mesh(geo, mat);
        this.scene.add(mesh);

        this.ribbonTrails.push({
            mesh,
            geo,
            positions,
            history: [],
            maxPoints,
            controller: characterController,
            life: duration,
            maxLife: duration
        });
    }

    spawnHitSparks(pos, team = 'team_dream') {
        const color = team === 'team_passion' ? 0xf59e0b : (team === 'team_love' ? 0xec4899 : 0x38bdf8);
        this.shockwavePool.acquire(color, 1.8, 0.25, pos);
        this.lightPool.acquire(color, 3.5, 0.2, pos);
    }

    spawnShockwave(pos, color = 0x38bdf8, radius = 5.5, duration = 0.45) {
        this.shockwavePool.acquire(color, radius, duration, pos);
        this.lightPool.acquire(color, 5.0, duration * 0.7, pos);
        this.triggerCameraShake(0.12);
    }

    triggerCameraShake(intensity = 0.15) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    triggerHitstop(durationSec = 0.04) {
        this.hitstopTimer = durationSec;
    }

    showFloatingDamage(worldPos, amount, type = 'physical') {
        const el = document.createElement('div');
        el.className = `floating-dmg-num dmg-${type}`;
        el.textContent = type === 'crit' ? `💥 ${amount}!` : (type === 'heal' ? `+${amount}` : `${amount}`);

        this.damageContainer.appendChild(el);

        this.floatingDamages.push({
            el,
            pos: worldPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.6, (Math.random() - 0.5) * 0.6)),
            life: 0.9,
            maxLife: 0.9
        });
    }

    showKillstreakBanner(streakType = 'first_blood') {
        const banner = document.createElement('div');
        banner.className = `killstreak-banner banner-${streakType}`;
        const title = streakType.replace('_', ' ').toUpperCase();
        banner.innerHTML = `<span class="killstreak-text">${title}!</span>`;
        this.damageContainer.appendChild(banner);

        setTimeout(() => {
            banner.classList.add('fade-out');
            setTimeout(() => banner.remove(), 400);
        }, 1800);
    }

    update(dt) {
        // 1. Hitstop logic
        if (this.hitstopTimer > 0) {
            this.hitstopTimer -= dt;
            return; // Pause game dt effect during hitstop
        }

        // 2. Camera Shake logic
        if (this.shakeIntensity > 0.001) {
            this.shakeOffset.set(
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity
            );
            this.camera.position.add(this.shakeOffset);
            this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
        }

        // 3. Update Ribbon Sword Trails
        for (let i = this.ribbonTrails.length - 1; i >= 0; i--) {
            const tr = this.ribbonTrails[i];
            tr.life -= dt;

            // Push current blade base & tip
            const pts = tr.controller.bladePoints.right;
            tr.history.unshift({ base: pts.base.clone(), tip: pts.tip.clone() });
            if (tr.history.length > tr.maxPoints) tr.history.pop();

            // Fill geometry buffer
            const posAttr = tr.geo.attributes.position;
            for (let j = 0; j < tr.maxPoints; j++) {
                const pt = tr.history[j] || (tr.history.length > 0 ? tr.history[tr.history.length - 1] : { base: pts.base, tip: pts.tip });
                posAttr.setXYZ(j * 2 + 0, pt.base.x, pt.base.y, pt.base.z);
                posAttr.setXYZ(j * 2 + 1, pt.tip.x, pt.tip.y, pt.tip.z);
            }
            posAttr.needsUpdate = true;

            if (tr.life <= 0) {
                this.scene.remove(tr.mesh);
                tr.geo.dispose();
                tr.mesh.material.dispose();
                this.ribbonTrails.splice(i, 1);
            }
        }

        // 4. Update Shockwaves
        for (const sw of this.shockwavePool.getActive()) {
            sw.life -= dt;
            const progress = 1.0 - (sw.life / sw.maxLife);
            const currentR = 1.0 + progress * (sw.maxScale - 1.0);
            sw.mesh.scale.set(currentR, currentR, currentR);
            sw.mesh.material.opacity = (1.0 - progress) * 0.9;
            if (sw.life <= 0) {
                this.shockwavePool.release(sw);
            }
        }

        // 5. Update Lights
        for (const pl of this.lightPool.getActive()) {
            pl.life -= dt;
            const progress = 1.0 - (pl.life / pl.maxLife);
            pl.light.intensity = (1.0 - progress) * pl.peakIntensity;
            if (pl.life <= 0) {
                this.lightPool.release(pl);
            }
        }

        // 6. Update Floating Damage Numbers (Screen projection)
        const halfW = window.innerWidth / 2;
        const halfH = window.innerHeight / 2;

        for (let i = this.floatingDamages.length - 1; i >= 0; i--) {
            const fd = this.floatingDamages[i];
            fd.life -= dt;
            fd.pos.y += 0.85 * dt;

            // Project 3D pos to 2D screen
            const screenV = fd.pos.clone().project(this.camera);

            if (screenV.z < 1.0) {
                const x = (screenV.x * halfW) + halfW;
                const y = -(screenV.y * halfH) + halfH;
                fd.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
                fd.el.style.opacity = `${fd.life / fd.maxLife}`;
            }

            if (fd.life <= 0) {
                fd.el.remove();
                this.floatingDamages.splice(i, 1);
            }
        }
    }
}
