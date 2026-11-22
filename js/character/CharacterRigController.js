/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/character/CharacterRigController.js
 * 
 * 2-Layer Robust Bone Rig Mapping & Real-World Proportional Weapon Attachment:
 * - Layer 1: Comprehensive Regex (Mixamo, Meshy, Blender, Bip01, standard names)
 * - Layer 2: Spatial Geometry Fallback Classifier based on Rest World Positions
 * - Rest Pose Quaternion preservation (bone.userData.restQuat) for Procedural Animation
 * - Hand-Locked Weapon Binding: Grip handle seated directly in palm (0, 0, 0)
 * - Lightweight Dark Circular Blob Shadow (0% GPU shadow overhead)
 */

import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { AssetManager } from '../core/AssetManager.js';

export class CharacterRigController {
    /**
     * @param {Object} options
     * @param {Object} options.hero Hero configuration data
     * @param {THREE.Group} options.templateScene GLTF scene template
     */
    constructor({ hero, templateScene }) {
        this.hero = hero;
        this.templateScene = templateScene;

        this.root = null;
        this.bones = {};
        this.weaponMeshR = null;
        this.weaponMeshL = null;
        this.blobShadow = null;

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

        // 2. Normalize scale to 1.85m & ground root
        this.normalizeSkeleton();

        // 3. 2-Layer Robust Bone Mapping
        this.mapBones();

        // 4. Attach hero-specific 3D weapon
        this.attachWeapon();

        // 5. Attach Lightweight Dark Circular Blob Shadow under feet
        this.createBlobShadow();
    }

    normalizeSkeleton() {
        this.root.traverse((child) => {
            if (child.isSkinnedMesh || child.isMesh) {
                child.frustumCulled = false;
                child.castShadow = false;
                child.receiveShadow = false;

                // Sanitize materials so hero never becomes pitch black
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

    createBlobShadow() {
        const shadowGeo = new THREE.CircleGeometry(0.55, 16);
        shadowGeo.rotateX(-Math.PI / 2);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x050810,
            transparent: true,
            opacity: 0.38,
            depthWrite: false
        });
        this.blobShadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.blobShadow.position.set(0, 0.02, 0);
        this.root.add(this.blobShadow);
    }

    mapBones() {
        // Layer 1: Comprehensive Regex Pattern
        const patterns = {
            hips: /(hips|pelvis|root|mixamorig:?hips|bip01_?pelvis)/i,
            spine: /(spine[01]?|torso|mixamorig:?spine[01]?|bip01_?spine)/i,
            chest: /(chest|spine2|upper_torso|mixamorig:?spine2|mixamorig:?chest)/i,
            neck: /(neck|mixamorig:?neck)/i,
            head: /(head|mixamorig:?head)/i,
            upperArmR: /(upper_?arm\.r|r.*upper.*arm|rightarm|mixamorig:?rightarm|bip01_?r_?upperarm|arm\.r|r_arm)/i,
            forearmR: /(forearm\.r|r.*forearm|rightforearm|mixamorig:?rightforearm|bip01_?r_?forearm|lowerarm\.r)/i,
            handR: /(hand\.r|r.*hand|righthand|weapon_socket\.r|mixamorig:?righthand|bip01_?r_?hand|wrist\.r)/i,
            upperArmL: /(upper_?arm\.l|l.*upper.*arm|leftarm|mixamorig:?leftarm|bip01_?l_?upperarm|arm\.l|l_arm)/i,
            forearmL: /(forearm\.l|l.*forearm|leftforearm|mixamorig:?leftforearm|bip01_?l_?forearm|lowerarm\.l)/i,
            handL: /(hand\.l|l.*hand|lefthand|weapon_socket\.l|mixamorig:?lefthand|bip01_?l_?hand|wrist\.l)/i,
            thighR: /(thigh\.r|r.*thigh|rightupleg|mixamorig:?rightupleg|bip01_?r_?thigh|leg\.r|r_leg)/i,
            calfR: /(calf\.r|r.*calf|rightleg|mixamorig:?rightleg|bip01_?r_?calf|shin\.r|lowerleg\.r)/i,
            footR: /(foot\.r|r.*foot|rightfoot|mixamorig:?rightfoot|bip01_?r_?foot|ankle\.r)/i,
            thighL: /(thigh\.l|l.*thigh|leftupleg|mixamorig:?leftupleg|bip01_?l_?thigh|leg\.l|l_leg)/i,
            calfL: /(calf\.l|l.*calf|leftleg|mixamorig:?leftleg|bip01_?l_?calf|shin\.l|lowerleg\.l)/i,
            footL: /(foot\.l|l.*foot|leftfoot|mixamorig:?leftfoot|bip01_?l_?foot|ankle\.l)/i
        };

        const allBones = [];
        this.root.traverse((child) => {
            if (child.isBone) {
                allBones.push(child);
                const name = child.name;
                for (const [key, regex] of Object.entries(patterns)) {
                    if (!this.bones[key] && regex.test(name)) {
                        this.bones[key] = child;
                    }
                }
            }
        });

        // Layer 2: Spatial Geometry Fallback Classifier
        if (allBones.length > 0) {
            this.root.updateMatrixWorld(true);
            const bbox = new THREE.Box3().setFromObject(this.root);
            const H = Math.max(1.0, bbox.max.y - bbox.min.y);
            const rootPos = this.root.position;

            const boneInfos = allBones.map(b => {
                const wp = new THREE.Vector3();
                b.getWorldPosition(wp);
                return {
                    bone: b,
                    name: b.name,
                    x: wp.x - rootPos.x,
                    y: wp.y - rootPos.y,
                    z: wp.z - rootPos.z,
                    relY: (wp.y - rootPos.y) / H
                };
            });

            // Fallback for hips
            if (!this.bones.hips) {
                const hipCand = boneInfos.filter(b => Math.abs(b.x) < 0.12 && b.relY >= 0.40 && b.relY <= 0.62)
                                         .sort((a, b) => Math.abs(a.relY - 0.52) - Math.abs(b.relY - 0.52))[0];
                if (hipCand) this.bones.hips = hipCand.bone;
            }

            // Fallback for spine & chest
            if (!this.bones.chest) {
                const chestCand = boneInfos.filter(b => Math.abs(b.x) < 0.12 && b.relY >= 0.60 && b.relY <= 0.82)
                                           .sort((a, b) => Math.abs(a.relY - 0.72) - Math.abs(b.relY - 0.72))[0];
                if (chestCand) this.bones.chest = chestCand.bone;
            }
            if (!this.bones.spine) {
                const spineCand = boneInfos.filter(b => Math.abs(b.x) < 0.12 && b.relY >= 0.50 && b.relY <= 0.68)[0];
                if (spineCand) this.bones.spine = spineCand.bone;
            }

            // Fallback for Arms (Left = +X, Right = -X)
            if (!this.bones.upperArmL) {
                const cand = boneInfos.filter(b => b.x > 0.08 && b.relY >= 0.65 && b.relY <= 0.88)
                                      .sort((a, b) => a.x - b.x)[0];
                if (cand) this.bones.upperArmL = cand.bone;
            }
            if (!this.bones.forearmL) {
                const cand = boneInfos.filter(b => b.x > 0.20 && b.relY >= 0.50 && b.relY <= 0.82)[0];
                if (cand) this.bones.forearmL = cand.bone;
            }
            if (!this.bones.handL) {
                const cand = boneInfos.filter(b => b.x > 0.30 && b.relY <= 0.68)
                                      .sort((a, b) => b.x - a.x)[0];
                if (cand) this.bones.handL = cand.bone;
            }

            if (!this.bones.upperArmR) {
                const cand = boneInfos.filter(b => b.x < -0.08 && b.relY >= 0.65 && b.relY <= 0.88)
                                      .sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0];
                if (cand) this.bones.upperArmR = cand.bone;
            }
            if (!this.bones.forearmR) {
                const cand = boneInfos.filter(b => b.x < -0.20 && b.relY >= 0.50 && b.relY <= 0.82)[0];
                if (cand) this.bones.forearmR = cand.bone;
            }
            if (!this.bones.handR) {
                const cand = boneInfos.filter(b => b.x < -0.30 && b.relY <= 0.68)
                                      .sort((a, b) => Math.abs(b.x) - Math.abs(a.x))[0];
                if (cand) this.bones.handR = cand.bone;
            }

            // Fallback for Legs
            if (!this.bones.thighL) {
                const cand = boneInfos.filter(b => b.x > 0.03 && b.relY >= 0.35 && b.relY <= 0.54)[0];
                if (cand) this.bones.thighL = cand.bone;
            }
            if (!this.bones.calfL) {
                const cand = boneInfos.filter(b => b.x > 0.03 && b.relY >= 0.15 && b.relY <= 0.38)[0];
                if (cand) this.bones.calfL = cand.bone;
            }
            if (!this.bones.footL) {
                const cand = boneInfos.filter(b => b.x > 0.03 && b.relY <= 0.18)[0];
                if (cand) this.bones.footL = cand.bone;
            }

            if (!this.bones.thighR) {
                const cand = boneInfos.filter(b => b.x < -0.03 && b.relY >= 0.35 && b.relY <= 0.54)[0];
                if (cand) this.bones.thighR = cand.bone;
            }
            if (!this.bones.calfR) {
                const cand = boneInfos.filter(b => b.x < -0.03 && b.relY >= 0.15 && b.relY <= 0.38)[0];
                if (cand) this.bones.calfR = cand.bone;
            }
            if (!this.bones.footR) {
                const cand = boneInfos.filter(b => b.x < -0.03 && b.relY <= 0.18)[0];
                if (cand) this.bones.footR = cand.bone;
            }
        }

        // Store Rest Pose Transformations for Natural Procedural Skeletal Animation
        allBones.forEach(b => {
            b.userData.restQuat = b.quaternion.clone();
            b.userData.restPos = b.position.clone();
        });

        console.log(`[RigMapper] ${this.hero.name} mapped:`, {
            hips: this.bones.hips?.name,
            chest: this.bones.chest?.name,
            upperArmR: this.bones.upperArmR?.name,
            forearmR: this.bones.forearmR?.name,
            handR: this.bones.handR?.name,
            thighL: this.bones.thighL?.name,
            thighR: this.bones.thighR?.name,
            calfL: this.bones.calfL?.name,
            calfR: this.bones.calfR?.name
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
        const handR = this.bones.handR || this.bones.chest || this.root;
        const handL = this.bones.handL || this.bones.chest || this.root;
        const chest = this.bones.chest || this.bones.spine || this.root;

        if (slug === 'freya') {
            // Dual Twin Skyblades (One locked in HandR palm, One in HandL palm)
            this.weaponMeshR = this.normalizeAndAttachWeapon(weaponScene, handR, 'freya', false);
            this.weaponMeshL = this.normalizeAndAttachWeapon(weaponScene, handL, 'freya', true);
        } else if (slug === 'erine') {
            // Floating Orbiting Chessboard beside right shoulder
            this.weaponMeshR = this.normalizeAndAttachWeapon(weaponScene, chest, 'erine', false);
        } else if (slug === 'michie') {
            // Infinity Bow locked in Left Hand palm
            this.weaponMeshL = this.normalizeAndAttachWeapon(weaponScene, handL, 'michie', true);
        } else {
            // Christy (Crossbow), Marsha (Scepter), Fiony (Baton) locked in Right Hand palm
            this.weaponMeshR = this.normalizeAndAttachWeapon(weaponScene, handR, slug, false);
        }
    }

    normalizeAndAttachWeapon(rawWeaponScene, parentNode, heroSlug, isLeftHand = false) {
        if (!rawWeaponScene || !parentNode) return null;

        const weaponHolder = new THREE.Group();
        weaponHolder.name = `WeaponHolder_${heroSlug}_${isLeftHand ? 'L' : 'R'}`;
        const weaponInstance = rawWeaponScene.clone();

        // 1. Sanitize materials
        weaponInstance.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = false;
                child.receiveShadow = false;
                if (child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    for (const m of mats) {
                        m.envMapIntensity = 1.0;
                        if (m.metalness > 0.6) m.metalness = 0.25;
                        m.roughness = Math.max(m.roughness ?? 0.6, 0.45);
                        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
                    }
                }
            }
        });

        // 2. Measure raw bounds
        weaponInstance.updateMatrixWorld(true);
        const rawBox = new THREE.Box3().setFromObject(weaponInstance);
        const rawSize = new THREE.Vector3();
        rawBox.getSize(rawSize);

        // Primary long axis
        let primaryAxis = 'y';
        let maxDim = rawSize.y;
        if (rawSize.x > maxDim) { maxDim = rawSize.x; primaryAxis = 'x'; }
        if (rawSize.z > maxDim) { maxDim = rawSize.z; primaryAxis = 'z'; }

        // 3. Shift weaponInstance so grip point (~22% from bottom) sits at EXACT (0, 0, 0)
        const center = new THREE.Vector3();
        rawBox.getCenter(center);

        const gripOffset = new THREE.Vector3();
        if (primaryAxis === 'y') {
            gripOffset.x = -center.x;
            gripOffset.y = -(rawBox.min.y + rawSize.y * 0.22);
            gripOffset.z = -center.z;
        } else if (primaryAxis === 'z') {
            gripOffset.x = -center.x;
            gripOffset.y = -center.y;
            gripOffset.z = -(rawBox.min.z + rawSize.z * 0.22);
        } else {
            gripOffset.x = -(rawBox.min.x + rawSize.x * 0.22);
            gripOffset.y = -center.y;
            gripOffset.z = -center.z;
        }
        weaponInstance.position.copy(gripOffset);
        weaponHolder.add(weaponInstance);

        // 4. Compensate Hand Bone World Scale
        parentNode.updateWorldMatrix(true, false);
        const parentWorldScale = new THREE.Vector3();
        parentNode.getWorldScale(parentWorldScale);
        const boneScale = Math.max(0.001, Math.max(parentWorldScale.x, parentWorldScale.y, parentWorldScale.z));

        // 5. Target length in meters for 1.85m hero
        let targetMeters = 0.85;
        if (heroSlug === 'christy' || heroSlug === 'fiony') targetMeters = 0.65;
        else if (heroSlug === 'freya') targetMeters = 0.85;
        else if (heroSlug === 'michie' || heroSlug === 'marsha') targetMeters = 1.0;
        else if (heroSlug === 'erine') targetMeters = 0.65;

        const finalScale = (targetMeters / Math.max(maxDim, 0.001)) / boneScale;
        weaponHolder.scale.setScalar(finalScale);

        // 6. Lock grip orientation directly in hand bone palm
        if (heroSlug === 'erine') {
            // Floating chessboard beside shoulder
            weaponHolder.position.set(0.48, 0.40, 0.0);
            weaponHolder.rotation.set(0.25, 0, 0);
        } else if (heroSlug === 'michie') {
            // Bow locked in left palm
            weaponHolder.position.set(0.0, 0.0, 0.02);
            weaponHolder.rotation.set(0, 0, Math.PI / 2);
        } else if (heroSlug === 'freya') {
            // Twin Blades
            if (isLeftHand) {
                weaponHolder.position.set(0.0, 0.0, 0.02);
                weaponHolder.rotation.set(Math.PI * 0.45, -Math.PI * 0.15, 0);
            } else {
                weaponHolder.position.set(0.0, 0.0, 0.02);
                weaponHolder.rotation.set(Math.PI * 0.45, Math.PI * 0.15, 0);
            }
        } else if (heroSlug === 'christy') {
            // Crossbow forward resting on forearm
            weaponHolder.position.set(0.02, 0.0, 0.04);
            weaponHolder.rotation.set(Math.PI * 0.45, 0, 0);
        } else {
            // Scepter / Baton in hand palm pointing upright/forward
            weaponHolder.position.set(0.0, 0.0, 0.02);
            weaponHolder.rotation.set(Math.PI * 0.45, 0, 0);
        }

        // Attach DIRECTLY to the hand bone
        parentNode.add(weaponHolder);

        // 7. Safety Clamp: Never exceed 1.25 meters in world space
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
            const bladeGeo = new THREE.BoxGeometry(0.06, 0.85, 0.12);
            const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.85, roughness: 0.2 });
            group.add(new THREE.Mesh(bladeGeo, bladeMat));
        } else if (slug === 'christy') {
            const crossGeo = new THREE.BoxGeometry(0.55, 0.12, 0.65);
            const crossMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.3 });
            group.add(new THREE.Mesh(crossGeo, crossMat));
        } else {
            const rodGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.95, 12);
            const rodMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
            group.add(new THREE.Mesh(rodGeo, rodMat));
        }

        return group;
    }
}
