/**
 * ONYXPURE — JKT48 3D Arena
 * js/controls.js
 * 
 * Mobile Virtual Joystick + Desktop Keyboard WASD + 3rd-Person Orbit Follow Camera +
 * MOBA Skill Cluster with Cooldowns, Energy, and 3D Ground Aiming Indicator Reticles.
 */

import * as THREE from 'three';

export class ControlsManager {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.domElement
     * @param {THREE.Camera} options.camera
     * @param {THREE.Scene} options.scene
     * @param {Function} options.onMove
     * @param {Function} options.onBasicAttack
     * @param {Function} options.onSkillCast
     */
    constructor({ domElement, camera, scene, onMove, onBasicAttack, onSkillCast }) {
        this.dom = domElement;
        this.camera = camera;
        this.scene = scene;

        this.onMove = onMove || (() => {});
        this.onBasicAttack = onBasicAttack || (() => {});
        this.onSkillCast = onSkillCast || (() => {});

        // Movement Vector
        this.moveDir = new THREE.Vector3(0, 0, 0);
        this.moveIntensity = 0;

        // Keyboard State
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };

        // Joystick UI State
        this.joystick = {
            active: false,
            touchId: null,
            baseX: 0,
            baseY: 0,
            currX: 0,
            currY: 0,
            deltaX: 0,
            deltaY: 0,
            radius: 55
        };

        // 3rd-Person Camera Controls
        this.targetLookAt = new THREE.Vector3();
        this.camYaw = 0;       // horizontal orbit angle in radians
        this.camPitch = 0.42;  // vertical elevation angle in radians (~24 deg)
        this.camDistance = 8.5; // distance behind character
        this.minPitch = 0.15;
        this.maxPitch = 1.25;
        this.minDist = 4.0;
        this.maxDist = 15.0;

        // Camera Drag State
        this.isOrbiting = false;
        this.orbitTouchId = null;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Skill Cooldowns & Energy
        this.energy = 100;
        this.maxEnergy = 100;
        this.energyRegenRate = 12; // per second

        this.skillCooldowns = {
            q: { current: 0, max: 4.5, energyCost: 20, name: 'Skill 1' },
            w: { current: 0, max: 8.0, energyCost: 35, name: 'Skill 2' },
            r: { current: 0, max: 24.0, energyCost: 50, name: 'Ultimate' }
        };

        // Skill Aiming Reticle State
        this.activeAimSkill = null; // 'q', 'w', or 'r'
        this.aimDragStart = { x: 0, y: 0 };
        this.aimDragCurr = { x: 0, y: 0 };
        this.aimDir = new THREE.Vector3(0, 0, 1);
        this.aimGroundPos = new THREE.Vector3();

        // 3D Aim Reticle Meshes in Scene
        this.initAimReticles();

        // Attach DOM Listeners
        this.initEventListeners();
    }

    /**
     * Initializes 3D ground projectors for skill aiming
     */
    initAimReticles() {
        this.reticleGroup = new THREE.Group();
        this.reticleGroup.visible = false;

        // 1. Directional Arrow for Skill 1 (Skill Shot / Beam)
        const arrowGeo = new THREE.ConeGeometry(0.8, 2.2, 16);
        arrowGeo.rotateX(Math.PI / 2);
        const arrowMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        this.aimArrow = new THREE.Mesh(arrowGeo, arrowMat);
        this.aimArrow.position.set(0, 0.08, 3.2);

        // Arrow Line
        const lineGeo = new THREE.PlaneGeometry(0.35, 6.0);
        lineGeo.rotateX(-Math.PI / 2);
        const lineMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        });
        this.aimLine = new THREE.Mesh(lineGeo, lineMat);
        this.aimLine.position.set(0, 0.07, 3.0);

        this.arrowParent = new THREE.Group();
        this.arrowParent.add(this.aimArrow);
        this.arrowParent.add(this.aimLine);
        this.reticleGroup.add(this.arrowParent);

        // 2. Circular AoE Decal for Ultimate
        const aoeGeo = new THREE.RingGeometry(5.0, 5.4, 48);
        aoeGeo.rotateX(-Math.PI / 2);
        const aoeMat = new THREE.MeshBasicMaterial({
            color: 0xec4899,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        this.aimAoERing = new THREE.Mesh(aoeGeo, aoeMat);
        this.aimAoERing.position.y = 0.08;

        const aoeFillGeo = new THREE.CircleGeometry(5.0, 32);
        aoeFillGeo.rotateX(-Math.PI / 2);
        const aoeFillMat = new THREE.MeshBasicMaterial({
            color: 0xec4899,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        });
        this.aimAoEFill = new THREE.Mesh(aoeFillGeo, aoeFillMat);
        this.aimAoEFill.position.y = 0.07;

        this.aoeParent = new THREE.Group();
        this.aoeParent.add(this.aimAoERing);
        this.aoeParent.add(this.aimAoEFill);
        this.reticleGroup.add(this.aoeParent);

        this.scene.add(this.reticleGroup);
    }

    /**
     * Wires keyboard, mouse, and touch events
     */
    initEventListeners() {
        // Keyboard Listeners
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Joystick Element Setup
        const joyBase = document.getElementById('joystick-base');
        const joyThumb = document.getElementById('joystick-thumb');

        if (joyBase && joyThumb) {
            // Touch Events on Joystick
            joyBase.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                this.joystick.touchId = touch.identifier;
                this.joystick.active = true;
                const rect = joyBase.getBoundingClientRect();
                this.joystick.baseX = rect.left + rect.width / 2;
                this.joystick.baseY = rect.top + rect.height / 2;
                this.updateJoystickPos(touch.clientX, touch.clientY);
            }, { passive: false });

            window.addEventListener('touchmove', (e) => {
                if (!this.joystick.active) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === this.joystick.touchId) {
                        e.preventDefault();
                        this.updateJoystickPos(touch.clientX, touch.clientY);
                        break;
                    }
                }
            }, { passive: false });

            const endJoyTouch = (e) => {
                if (!this.joystick.active) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.joystick.touchId) {
                        this.resetJoystick();
                        break;
                    }
                }
            };
            window.addEventListener('touchend', endJoyTouch);
            window.addEventListener('touchcancel', endJoyTouch);

            // Mouse Drag Fallback on Joystick
            joyBase.addEventListener('mousedown', (e) => {
                this.joystick.active = true;
                this.joystick.touchId = 'mouse';
                const rect = joyBase.getBoundingClientRect();
                this.joystick.baseX = rect.left + rect.width / 2;
                this.joystick.baseY = rect.top + rect.height / 2;
                this.updateJoystickPos(e.clientX, e.clientY);
            });

            window.addEventListener('mousemove', (e) => {
                if (this.joystick.active && this.joystick.touchId === 'mouse') {
                    this.updateJoystickPos(e.clientX, e.clientY);
                } else if (this.isOrbiting) {
                    const dx = e.clientX - this.lastMouseX;
                    const dy = e.clientY - this.lastMouseY;
                    this.lastMouseX = e.clientX;
                    this.lastMouseY = e.clientY;
                    this.rotateCamera(dx, dy);
                }
            });

            window.addEventListener('mouseup', () => {
                if (this.joystick.active && this.joystick.touchId === 'mouse') {
                    this.resetJoystick();
                }
                this.isOrbiting = false;
            });
        }

        // Camera Orbit Touch / Drag on Viewport Canvas
        this.dom.addEventListener('mousedown', (e) => {
            if (e.target.closest('.hud-interactive') || e.target.closest('.control-btn')) return;
            this.isOrbiting = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        this.dom.addEventListener('touchstart', (e) => {
            if (e.target.closest('.hud-interactive') || e.target.closest('.control-btn')) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (!this.isOrbiting && touch.identifier !== this.joystick.touchId) {
                    this.isOrbiting = true;
                    this.orbitTouchId = touch.identifier;
                    this.lastMouseX = touch.clientX;
                    this.lastMouseY = touch.clientY;
                    break;
                }
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!this.isOrbiting) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.orbitTouchId) {
                    const dx = touch.clientX - this.lastMouseX;
                    const dy = touch.clientY - this.lastMouseY;
                    this.lastMouseX = touch.clientX;
                    this.lastMouseY = touch.clientY;
                    this.rotateCamera(dx, dy);
                    break;
                }
            }
        }, { passive: true });

        const endOrbitTouch = (e) => {
            if (!this.isOrbiting) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.orbitTouchId) {
                    this.isOrbiting = false;
                    this.orbitTouchId = null;
                    break;
                }
            }
        };
        window.addEventListener('touchend', endOrbitTouch);
        window.addEventListener('touchcancel', endOrbitTouch);

        // Zoom via Mouse Wheel
        window.addEventListener('wheel', (e) => {
            this.camDistance = THREE.MathUtils.clamp(
                this.camDistance + e.deltaY * 0.005,
                this.minDist,
                this.maxDist
            );
        }, { passive: true });

        // Wire HUD MOBA Buttons
        this.bindMobaButtons();
    }

    /**
     * Binds touch & click actions to Attack & Skill buttons
     */
    bindMobaButtons() {
        const btnAttack = document.getElementById('btn-attack');
        if (btnAttack) {
            btnAttack.addEventListener('click', () => this.triggerBasicAttack());
        }

        const skillSlots = ['q', 'w', 'r'];
        for (const slot of skillSlots) {
            const btn = document.getElementById(`btn-skill-${slot}`);
            if (!btn) continue;

            // Touch / Mouse Down -> Start Aiming
            const startAim = (cx, cy) => {
                if (this.skillCooldowns[slot].current > 0 || this.energy < this.skillCooldowns[slot].energyCost) {
                    return;
                }
                this.activeAimSkill = slot;
                this.aimDragStart = { x: cx, y: cy };
                this.aimDragCurr = { x: cx, y: cy };
                this.reticleGroup.visible = true;

                if (slot === 'r') {
                    this.arrowParent.visible = false;
                    this.aoeParent.visible = true;
                } else {
                    this.arrowParent.visible = true;
                    this.aoeParent.visible = false;
                }
            };

            btn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                startAim(e.clientX, e.clientY);
            });

            btn.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                const t = e.touches[0];
                startAim(t.clientX, t.clientY);
            }, { passive: true });
        }

        // Global Drag for Aiming
        window.addEventListener('mousemove', (e) => {
            if (!this.activeAimSkill) return;
            this.updateAimVector(e.clientX, e.clientY);
        });

        window.addEventListener('touchmove', (e) => {
            if (!this.activeAimSkill) return;
            const t = e.touches[0];
            if (t) this.updateAimVector(t.clientX, t.clientY);
        }, { passive: true });

        // Global Release to Fire Skill
        const releaseAim = () => {
            if (!this.activeAimSkill) return;
            const slot = this.activeAimSkill;
            this.activeAimSkill = null;
            this.reticleGroup.visible = false;

            this.castSkill(slot, this.aimDir.clone(), this.aimGroundPos.clone());
        };

        window.addEventListener('mouseup', releaseAim);
        window.addEventListener('touchend', releaseAim);
    }

    /**
     * Updates joystick visual thumb and calculated movement direction
     */
    updateJoystickPos(clientX, clientY) {
        const dx = clientX - this.joystick.baseX;
        const dy = clientY - this.joystick.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = this.joystick.radius;

        const clampedDist = Math.min(dist, maxR);
        const angle = Math.atan2(dy, dx);

        const thumbX = Math.cos(angle) * clampedDist;
        const thumbY = Math.sin(angle) * clampedDist;

        const thumbEl = document.getElementById('joystick-thumb');
        if (thumbEl) {
            thumbEl.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;
        }

        this.joystick.deltaX = thumbX / maxR;
        this.joystick.deltaY = thumbY / maxR;
    }

    /**
     * Resets joystick to dead center
     */
    resetJoystick() {
        this.joystick.active = false;
        this.joystick.touchId = null;
        this.joystick.deltaX = 0;
        this.joystick.deltaY = 0;

        const thumbEl = document.getElementById('joystick-thumb');
        if (thumbEl) {
            thumbEl.style.transform = 'translate(-50%, -50%)';
        }
    }

    /**
     * Rotates camera orbit
     */
    rotateCamera(deltaX, deltaY) {
        const sensitivity = 0.0055;
        this.camYaw -= deltaX * sensitivity;
        this.camPitch = THREE.MathUtils.clamp(
            this.camPitch - deltaY * sensitivity,
            this.minPitch,
            this.maxPitch
        );
    }

    /**
     * Updates aiming reticle direction and ground target position
     */
    updateAimVector(clientX, clientY) {
        this.aimDragCurr = { x: clientX, y: clientY };
        const dx = clientX - this.aimDragStart.x;
        const dy = clientY - this.aimDragStart.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 15) {
            // Screen drag vector rotated by camera yaw
            const screenAngle = Math.atan2(dx, dy);
            const worldAngle = this.camYaw - screenAngle;

            this.aimDir.set(Math.sin(worldAngle), 0, Math.cos(worldAngle)).normalize();
            this.arrowParent.rotation.y = worldAngle;

            // Ultimate AoE Target Position
            const maxCastRange = 12.0;
            const targetDist = Math.min(dist * 0.08, maxCastRange);
            this.aimGroundPos.copy(this.targetLookAt).addScaledVector(this.aimDir, targetDist);
            this.aoeParent.position.set(this.aimGroundPos.x, 0.08, this.aimGroundPos.z);
        }
    }

    /**
     * Keyboard key down
     */
    handleKeyDown(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'Space':
            case 'KeyJ':
                this.triggerBasicAttack();
                break;
            case 'KeyQ':
                this.castSkill('q', this.aimDir, this.aimGroundPos);
                break;
            case 'KeyE':
            case 'KeyW':
                if (e.code === 'KeyW' && (this.keys.forward || this.keys.backward)) break;
                this.castSkill('w', this.aimDir, this.aimGroundPos);
                break;
            case 'KeyR':
                this.castSkill('r', this.aimDir, this.aimGroundPos);
                break;
        }
    }

    /**
     * Keyboard key up
     */
    handleKeyUp(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
        }
    }

    /**
     * Triggers Basic Attack Combo
     */
    triggerBasicAttack() {
        const btn = document.getElementById('btn-attack');
        if (btn) {
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 120);
        }
        this.onBasicAttack();
    }

    /**
     * Triggers Skill Cast with energy deduction and cooldown activation
     */
    castSkill(slot, dir, pos) {
        const skill = this.skillCooldowns[slot];
        if (!skill) return;

        if (skill.current > 0) {
            console.log(`[Controls] ${skill.name} on cooldown: ${skill.current.toFixed(1)}s`);
            return;
        }

        if (this.energy < skill.energyCost) {
            console.log(`[Controls] Insufficient energy for ${skill.name}`);
            return;
        }

        this.energy -= skill.energyCost;
        skill.current = skill.max;

        this.onSkillCast(slot, dir, pos);
    }

    /**
     * Updates character position, camera orbit, cooldowns, and HUD each frame
     * @param {number} delta 
     * @param {THREE.Vector3} characterPos 
     */
    update(delta, characterPos) {
        this.targetLookAt.copy(characterPos);
        this.targetLookAt.y += 1.35; // Look at hero chest/head height

        // 1. Calculate Combined Movement Vector
        let kx = 0;
        let kz = 0;
        if (this.keys.forward) kz += 1;
        if (this.keys.backward) kz -= 1;
        if (this.keys.left) kx -= 1;
        if (this.keys.right) kx += 1;

        const keyLen = Math.hypot(kx, kz);
        let moveX = 0;
        let moveZ = 0;

        if (keyLen > 0.001) {
            moveX = kx / keyLen;
            moveZ = kz / keyLen;
        }

        // Add Virtual Joystick Input
        if (this.joystick.active) {
            moveX += this.joystick.deltaX;
            moveZ -= this.joystick.deltaY;
        }

        const totalMag = Math.hypot(moveX, moveZ);
        if (totalMag > 0.01) {
            const normX = moveX / totalMag;
            const normZ = moveZ / totalMag;
            this.moveIntensity = Math.min(totalMag, 1.0);

            // Rotate movement vector relative to camera yaw
            const sinY = Math.sin(this.camYaw);
            const cosY = Math.cos(this.camYaw);

            this.moveDir.x = normX * cosY - normZ * sinY;
            this.moveDir.z = normX * sinY + normZ * cosY;
            this.moveDir.y = 0;
            this.moveDir.normalize();

            // Store current move direction as default aim direction
            this.aimDir.copy(this.moveDir);
        } else {
            this.moveIntensity = 0;
            this.moveDir.set(0, 0, 0);
        }

        this.onMove(this.moveDir, this.moveIntensity, delta);

        // 2. Update 3rd-Person Orbit Camera
        const camX = this.targetLookAt.x + this.camDistance * Math.sin(this.camYaw) * Math.cos(this.camPitch);
        const camY = this.targetLookAt.y + this.camDistance * Math.sin(this.camPitch);
        const camZ = this.targetLookAt.z + this.camDistance * Math.cos(this.camYaw) * Math.cos(this.camPitch);

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(this.targetLookAt);

        // 3. Update Aim Reticle Ground Location to follow character
        if (this.reticleGroup.visible) {
            this.reticleGroup.position.set(characterPos.x, 0, characterPos.z);
        }

        // 4. Regenerate Energy
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate * delta);
        }

        // 5. Update Skill Cooldowns & DOM Overlay
        for (const slot of ['q', 'w', 'r']) {
            const sk = this.skillCooldowns[slot];
            if (sk.current > 0) {
                sk.current = Math.max(0, sk.current - delta);
            }

            const btnEl = document.getElementById(`btn-skill-${slot}`);
            const cdOverlay = document.getElementById(`cd-overlay-${slot}`);
            const cdText = document.getElementById(`cd-text-${slot}`);

            if (cdOverlay && cdText && btnEl) {
                if (sk.current > 0) {
                    const pct = (sk.current / sk.max) * 100;
                    cdOverlay.style.height = `${pct}%`;
                    cdText.textContent = Math.ceil(sk.current);
                    cdText.style.display = 'block';
                    btnEl.classList.add('on-cooldown');
                } else {
                    cdOverlay.style.height = '0%';
                    cdText.style.display = 'none';
                    btnEl.classList.remove('on-cooldown');
                }

                // Check Energy availability
                if (this.energy < sk.energyCost) {
                    btnEl.classList.add('no-energy');
                } else {
                    btnEl.classList.remove('no-energy');
                }
            }
        }

        // 6. Update Energy Bar in HUD
        const energyBar = document.getElementById('player-energy-bar');
        const energyText = document.getElementById('player-energy-text');
        if (energyBar) {
            const pct = (this.energy / this.maxEnergy) * 100;
            energyBar.style.width = `${pct}%`;
        }
        if (energyText) {
            energyText.textContent = `${Math.floor(this.energy)} / ${this.maxEnergy}`;
        }
    }
}
