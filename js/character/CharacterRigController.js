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

                // Tone down overly shiny metallic defaults if missing maps
                if (child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    for (const m of mats) {
                        if (m.metalness > 0.85 && !m.metalnessMap) {
                            m.metalness = 0.25;
                        }
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
            // Dual Twin Skyblades (One in HandR, One mirror in HandL)
            this.weaponMeshR = weaponScene.clone();
            this.weaponMeshR.scale.set(0.92, 0.92, 0.92);
            this.weaponMeshR.position.set(0.04, -0.06, 0.08);
            this.weaponMeshR.rotation.set(0, Math.PI / 2, 0);
            handR.add(this.weaponMeshR);

            this.weaponMeshL = weaponScene.clone();
            this.weaponMeshL.scale.set(-0.92, 0.92, 0.92); // Mirrored
            this.weaponMeshL.position.set(-0.04, -0.06, 0.08);
            this.weaponMeshL.rotation.set(0, -Math.PI / 2, 0);
            handL.add(this.weaponMeshL);

        } else if (slug === 'erine') {
            // Floating Orbiting Chessboard
            this.orbitWeaponPivot = new THREE.Group();
            this.orbitWeaponPivot.position.set(0.62, 0.25, 0.20);
            weaponScene.scale.set(0.85, 0.85, 0.85);
            this.orbitWeaponPivot.add(weaponScene);
            chest.add(this.orbitWeaponPivot);
            this.weaponMeshR = weaponScene;

        } else if (slug === 'michie') {
            // Infinity Bow on HandL
            this.weaponMeshL = weaponScene;
            this.weaponMeshL.scale.set(1.05, 1.05, 1.05);
            this.weaponMeshL.position.set(0.02, 0, 0.05);
            this.weaponMeshL.rotation.set(0, 0, Math.PI / 2);
            handL.add(this.weaponMeshL);

        } else {
            // Christy (Crossbow), Marsha (Scepter), Fiony (Baton) on HandR
            this.weaponMeshR = weaponScene;
            const s = slug === 'marsha' ? 1.25 : (slug === 'fiony' ? 0.88 : 0.95);
            this.weaponMeshR.scale.set(s, s, s);
            this.weaponMeshR.position.set(0.05, -0.05, 0.06);
            handR.add(this.weaponMeshR);
        }
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
