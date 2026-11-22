/**
 * ONYXPURE — JKT48 3D Arena
 * js/vfxSystem.js
 * 
 * 3D VFX & Particle Engine for MOBA combat:
 * - Passive Auras (orbiting runes & crystal sparkles)
 * - Skill 1 Projectiles & Beam Trails
 * - Skill 2 Dash Ghosts & Protective Shield Domes
 * - Ultimate Magic Circles, Celestial Beings & Shockwaves
 * - Dynamic Floating Damage & Healing Sprites
 * - Fallback Procedural VFX if external GLB VFX is not provided
 */

import * as THREE from 'three';

export class VFXSystem {
    /**
     * @param {THREE.Scene} scene 
     * @param {THREE.Camera} camera 
     */
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Active effect registries
        this.projectiles = [];
        this.floatingTexts = [];
        this.auras = [];
        this.aoeRings = [];
        this.shields = [];
        this.hitFlashes = [];

        // Pre-create shared canvas for high-performance damage sprites
        this.canvasPool = [];

        // Camera shake state
        this.shakeTime = 0;
        this.shakeIntensity = 0;
        this.origCamPos = new THREE.Vector3();
    }

    /**
     * Resolves team color hex
     * @param {string} team 
     * @returns {number}
     */
    getTeamColorHex(team) {
        switch (team) {
            case 'team_dream':
                return 0x38bdf8; // Vivid Cyan
            case 'team_love':
                return 0xec4899; // Radiant Magenta
            case 'team_passion':
                return 0xf59e0b; // Blazing Amber
            default:
                return 0x38bdf8;
        }
    }

    /**
     * Creates or attaches an orbiting Passive Aura to a hero
     * @param {THREE.Object3D} heroRoot 
     * @param {string} team 
     */
    attachPassiveAura(heroRoot, team = 'team_dream') {
        this.removePassiveAura(heroRoot);

        const colorHex = this.getTeamColorHex(team);
        const group = new THREE.Group();
        group.name = '__vfx_passive_aura';

        // 1. Ground Ring
        const ringGeo = new THREE.RingGeometry(0.7, 0.85, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.y = 0.05;
        group.add(ringMesh);

        // 2. Swirling Sparkle Particles
        const particleCount = 28;
        const pGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const angles = new Float32Array(particleCount);
        const speeds = new Float32Array(particleCount);
        const radii = new Float32Array(particleCount);
        const heights = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            angles[i] = Math.random() * Math.PI * 2;
            speeds[i] = 1.5 + Math.random() * 2.0;
            radii[i] = 0.5 + Math.random() * 0.45;
            heights[i] = Math.random() * 1.5;

            positions[i * 3 + 0] = Math.cos(angles[i]) * radii[i];
            positions[i * 3 + 1] = heights[i];
            positions[i * 3 + 2] = Math.sin(angles[i]) * radii[i];
        }

        pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const pMat = new THREE.PointsMaterial({
            color: colorHex,
            size: 0.12,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });
        const particles = new THREE.Points(pGeo, pMat);
        group.add(particles);

        heroRoot.add(group);

        this.auras.push({
            group,
            ringMesh,
            particles,
            angles,
            speeds,
            radii,
            heights,
            particleCount,
            heroRoot
        });
    }

    /**
     * Removes passive aura from hero
     * @param {THREE.Object3D} heroRoot 
     */
    removePassiveAura(heroRoot) {
        const found = heroRoot.getObjectByName('__vfx_passive_aura');
        if (found) {
            heroRoot.remove(found);
        }
        this.auras = this.auras.filter(a => a.heroRoot !== heroRoot);
    }

    /**
     * Spawns a Skill 1 Projectile traveling toward a target point
     * @param {THREE.Vector3} startPos 
     * @param {THREE.Vector3} targetPos 
     * @param {string} team 
     * @param {Function} onHitCallback Callback triggered when projectile strikes
     */
    spawnProjectile(startPos, targetPos, team = 'team_dream', onHitCallback = null) {
        const colorHex = this.getTeamColorHex(team);

        // Projectile direction & velocity
        const dir = new THREE.Vector3().subVectors(targetPos, startPos);
        dir.y = 0; // maintain horizontal MOBA plane
        if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
        dir.normalize();

        const speed = 22.0; // meters per second
        const maxDist = 20.0;

        // Outer Glowing Orb
        const orbGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const orbMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const mesh = new THREE.Mesh(orbGeo, orbMat);
        mesh.position.copy(startPos);
        mesh.position.y = 1.0; // Torso level

        // Trailing Ribbon
        const trailGeo = new THREE.CylinderGeometry(0.05, 0.35, 1.2, 8);
        trailGeo.rotateX(Math.PI / 2);
        const trailMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        const trail = new THREE.Mesh(trailGeo, trailMat);
        mesh.add(trail);

        this.scene.add(mesh);

        this.projectiles.push({
            mesh,
            dir,
            speed,
            traveled: 0,
            maxDist,
            colorHex,
            onHit: onHitCallback,
            isAlive: true
        });
    }

    /**
     * Spawns Skill 2 Protective Shield Dome around target
     * @param {THREE.Object3D} targetRoot 
     * @param {string} team 
     * @param {number} duration Duration in seconds
     */
    spawnShieldDome(targetRoot, team = 'team_dream', duration = 3.5) {
        const colorHex = this.getTeamColorHex(team);

        const domeGeo = new THREE.SphereGeometry(1.3, 24, 24);
        const domeMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.35,
            wireframe: true,
            blending: THREE.AdditiveBlending
        });
        const domeMesh = new THREE.Mesh(domeGeo, domeMat);
        domeMesh.position.y = 1.0;
        targetRoot.add(domeMesh);

        this.shields.push({
            mesh: domeMesh,
            parent: targetRoot,
            timeLeft: duration,
            maxTime: duration
        });

        // Spawn a burst of heal particles
        this.spawnBurst(targetRoot.position, colorHex, 20);
    }

    /**
     * Spawns Ultimate Magic Circle & Celestial Pillar
     * @param {THREE.Vector3} targetPos 
     * @param {string} team 
     * @param {Function} onImpactCallback 
     */
    spawnUltimateAoE(targetPos, team = 'team_dream', onImpactCallback = null) {
        const colorHex = this.getTeamColorHex(team);

        // 1. Giant Ground Decagram Circle
        const radius = 5.5;
        const ringGeo = new THREE.RingGeometry(radius - 0.4, radius, 48);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(targetPos.x, 0.08, targetPos.z);
        this.scene.add(ringMesh);

        // 2. Inner Pulsing Star Rune
        const innerGeo = new THREE.CircleGeometry(radius - 0.5, 6);
        innerGeo.rotateX(-Math.PI / 2);
        const innerMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.25,
            wireframe: true,
            blending: THREE.AdditiveBlending
        });
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        innerMesh.position.set(targetPos.x, 0.09, targetPos.z);
        this.scene.add(innerMesh);

        // 3. Skyward Celestial Energy Beam
        const beamGeo = new THREE.CylinderGeometry(radius * 0.8, radius * 0.9, 28, 24, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.set(targetPos.x, 14, targetPos.z);
        beamMesh.scale.set(0.01, 1, 0.01); // expand on impact
        this.scene.add(beamMesh);

        // Trigger camera shake
        this.triggerCameraShake(0.65, 0.45);

        this.aoeRings.push({
            ringMesh,
            innerMesh,
            beamMesh,
            pos: targetPos.clone(),
            radius,
            colorHex,
            progress: 0,
            duration: 1.8,
            impactTriggered: false,
            onImpact: onImpactCallback
        });
    }

    /**
     * Triggers a burst of exploding sparks at hit point
     * @param {THREE.Vector3} pos 
     * @param {number} colorHex 
     * @param {number} count 
     */
    spawnBurst(pos, colorHex = 0xffffff, count = 25) {
        const pGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3 + 0] = pos.x;
            positions[i * 3 + 1] = pos.y + 0.8;
            positions[i * 3 + 2] = pos.z;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 3.5 + Math.random() * 5.5;

            velocities.push(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                (Math.cos(phi) + 0.4) * speed,
                Math.sin(phi) * Math.sin(theta) * speed
            ));
        }

        pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const pMat = new THREE.PointsMaterial({
            color: colorHex,
            size: 0.18,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });
        const pSystem = new THREE.Points(pGeo, pMat);
        this.scene.add(pSystem);

        this.hitFlashes.push({
            system: pSystem,
            velocities,
            count,
            age: 0,
            maxAge: 0.6
        });
    }

    /**
     * Spawns a floating combat text sprite (damage, crit, heal)
     * @param {string} text 
     * @param {THREE.Vector3} worldPos 
     * @param {'crit'|'damage'|'heal'|'shield'} type 
     */
    spawnFloatingText(text, worldPos, type = 'damage') {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        let fontColor = '#ffffff';
        let strokeColor = '#000000';
        let fontSize = '44px';

        if (type === 'crit') {
            fontColor = '#ff3366';
            strokeColor = '#fff700';
            fontSize = 'bold 54px';
        } else if (type === 'heal') {
            fontColor = '#10b981';
            strokeColor = '#064e3b';
            fontSize = '46px';
        } else if (type === 'shield') {
            fontColor = '#38bdf8';
            strokeColor = '#0369a1';
            fontSize = '42px';
        }

        ctx.font = `${fontSize} 'Outfit', 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.lineWidth = 6;
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(text, 128, 64);

        ctx.fillStyle = fontColor;
        ctx.fillText(text, 128, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(worldPos);
        sprite.position.y += 2.1 + (Math.random() * 0.4);
        sprite.position.x += (Math.random() - 0.5) * 0.6;
        sprite.scale.set(1.8, 0.9, 1);

        this.scene.add(sprite);

        this.floatingTexts.push({
            sprite,
            tex,
            velY: 1.6 + Math.random() * 0.6,
            age: 0,
            maxAge: 1.1
        });
    }

    /**
     * Triggers screen / camera shake
     * @param {number} intensity 
     * @param {number} duration 
     */
    triggerCameraShake(intensity = 0.5, duration = 0.4) {
        this.shakeIntensity = intensity;
        this.shakeTime = duration;
    }

    /**
     * Updates all active VFX instances each frame
     * @param {number} delta 
     */
    update(delta) {
        // 1. Update Camera Shake
        if (this.shakeTime > 0) {
            this.shakeTime -= delta;
            const factor = Math.max(0, this.shakeTime) * this.shakeIntensity;
            this.camera.position.x += (Math.random() - 0.5) * factor;
            this.camera.position.y += (Math.random() - 0.5) * factor;
            this.camera.position.z += (Math.random() - 0.5) * factor;
        }

        // 2. Update Passive Auras
        for (const aura of this.auras) {
            aura.ringMesh.rotation.z += delta * 1.5;
            const posAttr = aura.particles.geometry.attributes.position;
            const posArr = posAttr.array;

            for (let i = 0; i < aura.particleCount; i++) {
                aura.angles[i] += delta * aura.speeds[i];
                aura.heights[i] += delta * 0.45;
                if (aura.heights[i] > 1.8) {
                    aura.heights[i] = 0.05;
                }

                posArr[i * 3 + 0] = Math.cos(aura.angles[i]) * aura.radii[i];
                posArr[i * 3 + 1] = aura.heights[i];
                posArr[i * 3 + 2] = Math.sin(aura.angles[i]) * aura.radii[i];
            }
            posAttr.needsUpdate = true;
        }

        // 3. Update Skill 1 Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const step = p.speed * delta;
            p.mesh.position.addScaledVector(p.dir, step);
            p.traveled += step;

            // Rotate mesh for missile flare effect
            p.mesh.rotation.y += delta * 12;

            if (p.traveled >= p.maxDist) {
                if (p.onHit) p.onHit(p.mesh.position);
                this.spawnBurst(p.mesh.position, p.colorHex, 18);
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.projectiles.splice(i, 1);
            }
        }

        // 4. Update Shields
        for (let i = this.shields.length - 1; i >= 0; i--) {
            const s = this.shields[i];
            s.timeLeft -= delta;
            s.mesh.rotation.y += delta * 2.2;
            s.mesh.rotation.x += delta * 1.1;

            const alpha = s.timeLeft / s.maxTime;
            s.mesh.material.opacity = alpha * 0.45;

            if (s.timeLeft <= 0) {
                s.parent.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
                this.shields.splice(i, 1);
            }
        }

        // 5. Update Ultimate AoE
        for (let i = this.aoeRings.length - 1; i >= 0; i--) {
            const aoe = this.aoeRings[i];
            aoe.progress += delta / aoe.duration;

            aoe.ringMesh.rotation.z += delta * 2.5;
            aoe.innerMesh.rotation.z -= delta * 1.5;

            // Expand celestial beam
            if (aoe.progress > 0.25 && !aoe.impactTriggered) {
                aoe.impactTriggered = true;
                if (aoe.onImpact) aoe.onImpact(aoe.pos);
                this.spawnBurst(aoe.pos, aoe.colorHex, 45);
            }

            if (aoe.impactTriggered) {
                const beamScale = Math.sin((aoe.progress - 0.25) / 0.75 * Math.PI);
                aoe.beamMesh.scale.set(beamScale, 1, beamScale);
                aoe.beamMesh.material.opacity = beamScale * 0.9;
            }

            const fade = 1.0 - Math.min(1.0, aoe.progress);
            aoe.ringMesh.material.opacity = fade * 0.9;
            aoe.innerMesh.material.opacity = fade * 0.3;

            if (aoe.progress >= 1.0) {
                this.scene.remove(aoe.ringMesh);
                this.scene.remove(aoe.innerMesh);
                this.scene.remove(aoe.beamMesh);
                aoe.ringMesh.geometry.dispose();
                aoe.innerMesh.geometry.dispose();
                aoe.beamMesh.geometry.dispose();
                this.aoeRings.splice(i, 1);
            }
        }

        // 6. Update Particle Bursts
        for (let i = this.hitFlashes.length - 1; i >= 0; i--) {
            const h = this.hitFlashes[i];
            h.age += delta;
            const posAttr = h.system.geometry.attributes.position;
            const arr = posAttr.array;

            for (let j = 0; j < h.count; j++) {
                arr[j * 3 + 0] += h.velocities[j].x * delta;
                arr[j * 3 + 1] += h.velocities[j].y * delta;
                arr[j * 3 + 2] += h.velocities[j].z * delta;
                h.velocities[j].y -= 9.8 * delta; // Gravity
            }
            posAttr.needsUpdate = true;
            h.system.material.opacity = 1.0 - (h.age / h.maxAge);

            if (h.age >= h.maxAge) {
                this.scene.remove(h.system);
                h.system.geometry.dispose();
                h.system.material.dispose();
                this.hitFlashes.splice(i, 1);
            }
        }

        // 7. Update Floating Combat Text
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.age += delta;
            ft.sprite.position.y += ft.velY * delta;

            const alpha = 1.0 - (ft.age / ft.maxAge);
            ft.sprite.material.opacity = alpha;

            if (ft.age >= ft.maxAge) {
                this.scene.remove(ft.sprite);
                ft.tex.dispose();
                ft.sprite.material.dispose();
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    /**
     * Cleans up all active VFX instances
     */
    clearAll() {
        for (const a of this.auras) this.removePassiveAura(a.heroRoot);
        for (const p of this.projectiles) this.scene.remove(p.mesh);
        for (const s of this.shields) s.parent.remove(s.mesh);
        for (const a of this.aoeRings) {
            this.scene.remove(a.ringMesh);
            this.scene.remove(a.innerMesh);
            this.scene.remove(a.beamMesh);
        }
        for (const h of this.hitFlashes) this.scene.remove(h.system);
        for (const f of this.floatingTexts) this.scene.remove(f.sprite);

        this.auras = [];
        this.projectiles = [];
        this.shields = [];
        this.aoeRings = [];
        this.hitFlashes = [];
        this.floatingTexts = [];
    }
}
