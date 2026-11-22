/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/character/CharacterRigController.js
 * 
 * Master Character Rigging & Weapon Attachment:
 * - SkeletonUtils.clone() with Unshared Bone Transforms
 * - Auto-Scale to 1.85m & Hip Grounding Compensation (Anti-Float / Anti-Sink)
 * - 16-Bone Regex Multi-Standard Mapper (Mixamo, Meshy, Blender, VRM)
 * - Calibrated 3D Weapon Sockets for 6 Active Heroes (Twin Blades, Orbiting Chess, Bow, Scepter, Baton)
 */

import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { AssetManager } from '../core/AssetManager.js';

export class CharacterRigController {
    /**
     * @param {Object} options
     * @param {Object} options.hero Hero definition data
     * @param {THREE.Group} options.templateScene GLTF scene template
     */
    constructor({ hero, templateScene }) {
        this.hero = hero;
        this.templateScene = templateScene;

        this.root = null;
        this.bones = {};
        this.weaponMeshR = null;
        this.weaponMeshL = null;
        this.orbitWeaponPivot = null;

        this.bladePoints = {
            right: { base: new THREE.Vector3(), tip: new THREE.Vector3() },
            left: { base: new THREE.Vector3(), tip: new THREE.Vector3() }
        };

        this.init();
    }

    get position() {
        return this.root ? this.root.position : null;
    }

    get rotation() {
        return this.root ? this.root.rotation : null;
    }

    init() {
        // 1. Deep clone skeleton hierarchy safely
        this.root = SkeletonUtils.clone(this.templateScene);

        // 2. Normalize scale to 1.85m & compensate hip pivot
        this.normalizeSkeleton();

        // 3. Map 16 bones across standard naming conventions
        this.mapBones();

        // 4. Attach hero-specific 3D weapon
        this.attachWeapon();
    }

    normalizeSkeleton() {
        // Ensure frustum culling disabled on SkinnedMeshes so character never vanishes
        this.root.traverse((child) => {
            if (child.isSkinnedMesh || child.isMesh) {
                child.frustumCulled = false;
                child.castShadow = true;
                child.receiveShadow = true;

                // Sanitize materials so character never becomes a black silhouette
                if (child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    for (const m of mats) {
                        m.envMapIntensity = 1.0;
                        if (m.metalness > 0.6) m.metalness = 0.2;
                        m.roughness = Math.max(m.roughness ?? 0.6, 0.45);
                        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
                    }
                }
            }
        });

        // Compute rest-pose bounding box
        this.root.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(this.root);
        const currentHeight = bbox.max.y - bbox.min.y;

        if (currentHeight > 0.1 && currentHeight < 100) {
            const targetHeight = 1.85;
            const scaleFactor = targetHeight / currentHeight;
            this.root.scale.set(scaleFactor, scaleFactor, scaleFactor);

            // Re-ground min.y to exactly 0.0
            this.root.updateMatrixWorld(true);
            const updatedBox = new THREE.Box3().setFromObject(this.root);
            this.root.position.y -= updatedBox.min.y;
        }
    }

    mapBones() {
        const patterns = {
            hips: /(hips|pelvis|root)/i,
            spine: /(spine[01]?|torso)/i,
            chest: /(chest|spine2|upper_torso)/i,
            neck: /(neck)/i,
            head: /(head)/i,
            upperArmR: /(upper_?arm\.r|r.*upper.*arm|rightarm)/i,
            forearmR: /(forearm\.r|r.*forearm|rightforearm)/i,
            handR: /(hand\.r|r.*hand|righthand|weapon_socket\.r)/i,
            upperArmL: /(upper_?arm\.l|l.*upper.*arm|leftarm)/i,
            forearmL: /(forearm\.l|l.*forearm|leftforearm)/i,
            handL: /(hand\.l|l.*hand|lefthand|weapon_socket\.l)/i,
            thighR: /(thigh\.r|r.*thigh|rightupleg)/i,
            calfR: /(calf\.r|r.*calf|rightleg)/i,
            footR: /(foot\.r|r.*foot|rightfoot)/i,
            thighL: /(thigh\.l|l.*thigh|leftupleg)/i,
            calfL: /(calf\.l|l.*calf|leftleg)/i,
            footL: /(foot\.l|l.*foot|leftfoot)/i
        };

        this.root.traverse((child) => {
            if (child.isBone) {
                const name = child.name;
                for (const [key, regex] of Object.entries(patterns)) {
                    if (!this.bones[key] && regex.test(name)) {
                        this.bones[key] = child;
                    }
                }
            }
        });
    }

    async attachWeapon() {
        const weaponPath = AssetManager.assetUrl(this.hero.weaponGlb);
        let weaponScene = null;

        try {
            const gltf = await AssetManager.loadGLTF(weaponPath);
            weaponScene = gltf.scene;
        } catch (_) {
            weaponScene = this.createProceduralWeaponProxy();
        }

        if (!weaponScene) return;

        const slug = this.hero.slug || this.hero.id;
        const handR = this.bones.handR || this.root;
        const handL = this.bones.handL || this.root;
        const chest = this.bones.chest || this.bones.spine || this.root;

        if (slug === 'freya') {
            // Dual Twin Skyblades (One in HandR, One in HandL)
            this.weaponMeshR = this.normalizeAndAttachWeapon(weaponScene, handR, 'freya', false);
            this.weaponMeshL = this.normalizeAndAttachWeapon(weaponScene, handL, 'freya', true);
        } else if (slug === 'erine') {
            // Floating Orbiting Chessboard beside shoulder
            this.weaponMeshR = this.normalizeAndAttachWeapon(weaponScene, chest, 'erine', false);
        } else if (slug === 'michie') {
            // Infinity Bow on Left Hand
            this.weaponMeshL = this.normalizeAndAttachWeapon(weaponScene, handL, 'michie', true);
        } else {
            // Christy (Crossbow), Marsha (Scepter), Fiony (Baton) on HandR
            this.weaponMeshR = this.normalizeAndAttachWeapon(weaponScene, handR, slug, false);
        }
    }

    normalizeAndAttachWeapon(rawWeaponScene, parentNode, heroSlug, isLeftHand = false) {
        if (!rawWeaponScene || !parentNode) return null;

        const weaponHolder = new THREE.Group();
        weaponHolder.name = `WeaponHolder_${heroSlug}_${isLeftHand ? 'L' : 'R'}`;
        const weaponInstance = rawWeaponScene.clone();

        // 1. Sanitize materials so weapon never renders pitch black
        weaponInstance.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                if (child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    for (const m of mats) {
                        m.envMapIntensity = 1.0;
                        if (m.metalness > 0.6) m.metalness = 0.2;
                        m.roughness = Math.max(m.roughness ?? 0.6, 0.45);
                        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
                    }
                }
            }
        });

        // 2. Raw Bounding Box Calculation
        weaponInstance.updateMatrixWorld(true);
        const rawBox = new THREE.Box3().setFromObject(weaponInstance);
        const rawSize = new THREE.Vector3();
        rawBox.getSize(rawSize);

        // Find primary long axis
        let primaryAxis = 'y';
        let maxDim = rawSize.y;
        if (rawSize.x > maxDim) { maxDim = rawSize.x; primaryAxis = 'x'; }
        if (rawSize.z > maxDim) { maxDim = rawSize.z; primaryAxis = 'z'; }

        // 3. Shift weaponInstance so grip point (~20% from bottom along long axis) sits at (0, 0, 0)
        // NOT in the center of the blade!
        const center = new THREE.Vector3();
        rawBox.getCenter(center);

        const gripOffset = new THREE.Vector3();
        if (primaryAxis === 'y') {
            gripOffset.x = -center.x;
            gripOffset.y = -(rawBox.min.y + rawSize.y * 0.20);
            gripOffset.z = -center.z;
        } else if (primaryAxis === 'z') {
            gripOffset.x = -center.x;
            gripOffset.y = -center.y;
            gripOffset.z = -(rawBox.min.z + rawSize.z * 0.20);
        } else {
            gripOffset.x = -(rawBox.min.x + rawSize.x * 0.20);
            gripOffset.y = -center.y;
            gripOffset.z = -center.z;
        }
        weaponInstance.position.copy(gripOffset);
        weaponHolder.add(weaponInstance);

        // 4. Compensate Hand Bone World Scale
        const parentWorldScale = new THREE.Vector3();
        parentNode.getWorldScale(parentWorldScale);
        const boneScale = Math.max(0.001, Math.max(parentWorldScale.x, parentWorldScale.y, parentWorldScale.z));

        // 5. Target length in meters for 1.85m character
        let targetMeters = 0.88;
        if (heroSlug === 'christy' || heroSlug === 'fiony') targetMeters = 0.62;
        else if (heroSlug === 'freya') targetMeters = 0.88;
        else if (heroSlug === 'michie' || heroSlug === 'marsha') targetMeters = 1.05;
        else if (heroSlug === 'erine') targetMeters = 0.65;

        const finalScale = (targetMeters / Math.max(maxDim, 0.001)) / boneScale;
        weaponHolder.scale.setScalar(finalScale);

        // 6. Lock Grip Orientation: Point blade forward/up (+Z / +Y) away from body, NEVER piercing torso!
        if (heroSlug === 'erine') {
            // Floating chessboard beside right shoulder
            weaponHolder.position.set(0.65, 1.35, 0.0);
            weaponHolder.rotation.set(0.25, 0, 0);
        } else if (heroSlug === 'michie') {
            // Bow on Left Hand
            weaponHolder.position.set(0.02, 0.02, 0.04);
            weaponHolder.rotation.set(0, 0, isLeftHand ? Math.PI / 2 : -Math.PI / 2);
        } else if (heroSlug === 'freya') {
            // Twin Blades
            if (isLeftHand) {
                weaponHolder.position.set(-0.04, 0.02, 0.08);
                weaponHolder.rotation.set(Math.PI * 0.45, -Math.PI * 0.2, -Math.PI * 0.1);
            } else {
                weaponHolder.position.set(0.04, 0.02, 0.08);
                weaponHolder.rotation.set(Math.PI * 0.45, Math.PI * 0.2, Math.PI * 0.1);
            }
        } else if (heroSlug === 'christy') {
            // Crossbow on Right Hand pointing straight forward, resting on forearm
            weaponHolder.position.set(0.06, 0.04, 0.12);
            weaponHolder.rotation.set(Math.PI * 0.35, 0, Math.PI * 0.08);
        } else {
            // Scepter/Baton
            weaponHolder.position.set(0.04, 0.02, 0.08);
            weaponHolder.rotation.set(Math.PI * 0.4, 0, 0);
        }

        parentNode.add(weaponHolder);

        // 7. Safety Clamp: World size must not exceed 1.25 meters
        weaponHolder.updateMatrixWorld(true);
        const finalWorldBox = new THREE.Box3().setFromObject(weaponHolder);
        const finalSize = new THREE.Vector3();
        finalWorldBox.getSize(finalSize);
        const finalMaxDim = Math.max(finalSize.x, finalSize.y, finalSize.z);
        if (finalMaxDim > 1.25) {
            const clampRatio = 1.15 / finalMaxDim;
            weaponHolder.scale.multiplyScalar(clampRatio);
        }

        return weaponHolder;
    }

    createProceduralWeaponProxy() {
        const group = new THREE.Group();
        const slug = this.hero.slug || this.hero.id;

        if (slug === 'freya') {
            // Twin Blade Proxy
            const bladeGeo = new THREE.BoxGeometry(0.06, 0.95, 0.14);
            const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.85, roughness: 0.2 });
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.position.y = 0.45;
            group.add(blade);
        } else if (slug === 'erine') {
            // Chessboard Plate Proxy
            const plateGeo = new THREE.BoxGeometry(0.55, 0.04, 0.55);
            const plateMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 });
            group.add(new THREE.Mesh(plateGeo, plateMat));
        } else if (slug === 'michie') {
            // Bow Arc Proxy
            const arcGeo = new THREE.TorusGeometry(0.48, 0.03, 8, 24, Math.PI);
            const arcMat = new THREE.MeshStandardMaterial({ color: 0xec4899, metalness: 0.7 });
            group.add(new THREE.Mesh(arcGeo, arcMat));
        } else {
            // Scepter / Crossbow proxy
            const shaftGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.2, 8);
            const shaftMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 });
            const shaft = new THREE.Mesh(shaftGeo, shaftMat);
            shaft.position.y = 0.55;
            group.add(shaft);
        }

        return group;
    }

    update(dt) {
        // Update floating orbiting chessboard for Erine
        if (this.orbitWeaponPivot) {
            this.orbitWeaponPivot.rotation.y += 1.8 * dt;
            this.orbitWeaponPivot.position.y = 0.25 + Math.sin(Date.now() * 0.003) * 0.08;
        }

        // Update sword ribbon trail tracking points
        if (this.weaponMeshR) {
            this.weaponMeshR.getWorldPosition(this.bladePoints.right.base);
            // Tip point 0.9m along weapon local Y
            const tipLocal = new THREE.Vector3(0, 0.9, 0);
            this.bladePoints.right.tip.copy(this.weaponMeshR.localToWorld(tipLocal));
        }

        if (this.weaponMeshL) {
            this.weaponMeshL.getWorldPosition(this.bladePoints.left.base);
            const tipLocal = new THREE.Vector3(0, 0.9, 0);
            this.bladePoints.left.tip.copy(this.weaponMeshL.localToWorld(tipLocal));
        }
    }
}
