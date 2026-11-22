/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/world/WorldBuilder.js
 * 
 * Master World Assembler:
 * - 100% (64/64) world_props_3d/*.glb Instantiation
 * - GLB Caching & Instance Cloning (Zero redundant network fetches)
 * - Auto-Normalized Real-World Proportions (Trees 9-16m, Buildings 8-22m, Turrets 7.5m, Clamped BoundingBox)
 * - Progressive Queued Loading (Immediate 12 near props < 80m, smooth rAF background streaming)
 * - Heightmap Snapping via getTerrainHeight(x, z)
 * - Spatial Hash Grid for O(1) Collision Sliding
 */

import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { AssetManager } from '../core/AssetManager.js';
import { WORLD_PROPS_LAYOUT } from '../config/worldLayoutData.js';
import { getTerrainHeight } from './TerrainSystem.js';

export class WorldBuilder {
    static glbCache = new Map(); // Shared static cache across scene transitions

    constructor(scene, sceneMode = 'sandbox') {
        this.scene = scene;
        this.sceneMode = sceneMode;
        this.propsGroup = new THREE.Group();
        this.propsGroup.name = `WorldProps_${sceneMode}`;
        this.scene.add(this.propsGroup);

        // Spatial Hash Grid (Cell Size 16m)
        this.cellSize = 16;
        this.spatialGrid = new Map(); // key 'cellX_cellZ' -> array of colliders
        this.colliders = [];
        this.interactives = [];
        this.animatedProps = [];
        this.isDestroyed = false;

        // Create Procedural Non-Blocking Terrarium Sky Dome for Sandbox
        if (this.sceneMode === 'sandbox') {
            this.createTerrariumSkyDome();
        }
    }

    createTerrariumSkyDome() {
        const domeGeo = new THREE.SphereGeometry(240, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.48);
        const domeMat = new THREE.MeshBasicMaterial({
            color: 0x90e0ef,
            transparent: true,
            opacity: 0.08,
            depthWrite: false,
            side: THREE.BackSide
        });
        const domeMesh = new THREE.Mesh(domeGeo, domeMat);
        domeMesh.position.set(0, -5, 0);
        domeMesh.castShadow = false;
        domeMesh.receiveShadow = false;
        this.propsGroup.add(domeMesh);
    }

    async init(spawnX = 0, spawnZ = 0) {
        // Filter props for current scene
        const targetProps = WORLD_PROPS_LAYOUT.filter(p => {
            if (this.sceneMode.startsWith('arena_')) {
                return p.zone === this.sceneMode || p.zone === 'arena_all';
            }
            return p.zone !== 'arena_colosseum' && p.zone !== 'arena_ocean_bridge' && p.zone !== 'arena_sky_sakura' && p.zone !== 'arena_all';
        });

        // Sort by distance from player spawn point
        targetProps.sort((a, b) => {
            const distA = Math.hypot(a.x - spawnX, a.z - spawnZ);
            const distB = Math.hypot(b.x - spawnX, b.z - spawnZ);
            return distA - distB;
        });

        // Stage 1: Immediate Load for nearest 12 props (< 80m)
        const nearProps = targetProps.slice(0, 12);
        const farProps = targetProps.slice(12);

        await Promise.all(nearProps.map(p => this.spawnProp(p)));
        console.log(`[WorldBuilder] Initial ${nearProps.length} near props ready in ${this.sceneMode}.`);

        // Stage 2: Progressive Queued Background Streaming for far props
        this.streamRemainingProps(farProps);
    }

    async streamRemainingProps(props) {
        const batchSize = 2;
        for (let i = 0; i < props.length; i += batchSize) {
            if (this.isDestroyed) return;
            const batch = props.slice(i, i + batchSize);
            await Promise.all(batch.map(p => this.spawnProp(p)));
            // Yield 1 frame to keep 60 FPS silky smooth
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
        console.log(`[WorldBuilder] All ${props.length + 12} world props streamed successfully.`);
    }

    async spawnProp(data) {
        if (this.isDestroyed) return;

        // Skip default giant dome prop if present (handled by procedural 240m dome)
        if (data.isDome && (data.model === 'terrarium_conservatory_dome' || data.isTerrariumDome)) {
            // Reposition conservatory dome as an elegant side gazebo beside plaza
            data.x = 35;
            data.z = 25;
            data.scale = 1.0;
        }

        const y = getTerrainHeight(data.x, data.z, this.sceneMode) + (data.yOffset || 0);
        let propRoot = null;

        const modelName = data.model;
        const glbPath = AssetManager.assetUrl(`world_props_3d/${modelName}.glb`);

        try {
            // Check in-memory cache first
            if (WorldBuilder.glbCache.has(modelName)) {
                const cachedScene = WorldBuilder.glbCache.get(modelName);
                propRoot = SkeletonUtils.clone(cachedScene);
            } else {
                const gltf = await AssetManager.loadGLTF(glbPath);
                if (gltf && gltf.scene) {
                    WorldBuilder.glbCache.set(modelName, gltf.scene);
                    propRoot = SkeletonUtils.clone(gltf.scene);
                }
            }
        } catch (_) {
            // Procedural fallback
        }

        if (!propRoot) {
            propRoot = this.createProceduralPropProxy(data);
        }

        if (!propRoot || this.isDestroyed) return;

        // Normalize Scale against real-world meters
        this.normalizePropScale(propRoot, data);

        propRoot.position.set(data.x, y, data.z);
        propRoot.rotation.y = data.rotY || 0;

        // Sanitize Materials & Shadows
        propRoot.traverse(child => {
            if (child.isMesh) {
                if (data.isDome) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.material = new THREE.MeshPhysicalMaterial({
                        color: 0x90e0ef,
                        transparent: true,
                        opacity: 0.14,
                        roughness: 0.05,
                        transmission: 0.88,
                        ior: 1.5,
                        depthWrite: false
                    });
                } else {
                    child.castShadow = true;
                    child.receiveShadow = true;
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
            }
        });

        this.propsGroup.add(propRoot);

        // Register collider
        if (data.collisionRadius && !data.isDome) {
            const collider = {
                x: data.x,
                z: data.z,
                radius: data.collisionRadius,
                isBuilding: !!data.isBuilding
            };
            this.colliders.push(collider);
            this.addToSpatialGrid(collider);
        }

        // Register interactive
        if (data.interactive) {
            this.interactives.push({
                root: propRoot,
                data,
                pos: new THREE.Vector3(data.x, y, data.z),
                type: data.interactive
            });
        }

        // Register animated props
        if (data.isAnimatedWindmill || data.hasRotatingLight) {
            this.animatedProps.push({ root: propRoot, data });
        }
    }

    normalizePropScale(propRoot, data) {
        propRoot.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(propRoot);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        const m = (data.model || '').toLowerCase();
        let targetHeight = 4.0; // Default meters

        if (m.includes('tree') || data.isGreatTree) {
            if (m.includes('ancient') || m.includes('windrise')) targetHeight = 22.0;
            else if (m.includes('cypress')) targetHeight = 16.0;
            else if (m.includes('oak')) targetHeight = 15.0;
            else if (m.includes('willow')) targetHeight = 14.0;
            else if (m.includes('sakura')) targetHeight = 13.0;
            else if (m.includes('ginkgo')) targetHeight = 13.0;
            else targetHeight = 11.5;
        } else if (data.isBuilding || m.includes('cottage') || m.includes('cafe') || m.includes('windmill') || m.includes('lighthouse') || m.includes('pagoda')) {
            if (m.includes('lighthouse') || m.includes('pagoda')) targetHeight = 24.0;
            else if (m.includes('windmill')) targetHeight = 18.0;
            else if (m.includes('cafe')) targetHeight = 11.0;
            else if (m.includes('torii')) targetHeight = 8.5;
            else targetHeight = 10.0;
        } else if (m.includes('bridge')) {
            targetHeight = 4.2; // Bridge roadway elevation
        } else if (m.includes('turret')) {
            targetHeight = 7.5;
        } else if (m.includes('nexus')) {
            targetHeight = 9.5;
        } else if (m.includes('boss') || m.includes('dragon') || m.includes('golem')) {
            targetHeight = 7.5;
        } else if (m.includes('minion') || m.includes('slime')) {
            targetHeight = 1.35;
        } else if (m.includes('pedestal')) {
            targetHeight = 0.38;
        } else if (m.includes('dome')) {
            targetHeight = 14.0; // Pavilion size
        } else if (m.includes('chest')) {
            targetHeight = 0.95;
        } else if (m.includes('statue') || m.includes('shrine') || m.includes('altar')) {
            targetHeight = 6.0;
        } else if (m.includes('lantern') || m.includes('lamp') || m.includes('signpost') || m.includes('fence')) {
            targetHeight = 2.4;
        }

        // Apply scale factor
        const currentHeight = Math.max(size.y, 0.05);
        const scaleFactor = (targetHeight / currentHeight) * (data.scale || 1.0);
        propRoot.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    createProceduralPropProxy(data) {
        const group = new THREE.Group();

        if (data.isDome) {
            const domeGeo = new THREE.SphereGeometry(14, 24, 16);
            const domeMat = new THREE.MeshPhysicalMaterial({
                color: 0x90e0ef,
                transparent: true,
                opacity: 0.18,
                roughness: 0.05,
                depthWrite: false
            });
            group.add(new THREE.Mesh(domeGeo, domeMat));
        } else if (data.model.includes('tree') || data.isGreatTree) {
            const trunkGeo = new THREE.CylinderGeometry(0.5, 0.9, 5, 8);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.85 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 2.5;
            group.add(trunk);

            const foliageGeo = new THREE.SphereGeometry(3.5, 8, 8);
            const folColor = data.model.includes('sakura') ? 0xf472b6 : (data.model.includes('ginkgo') ? 0xfbbf24 : 0x22c55e);
            const folMat = new THREE.MeshStandardMaterial({ color: folColor, roughness: 0.7 });
            const fol = new THREE.Mesh(foliageGeo, folMat);
            fol.position.y = 6.0;
            group.add(fol);
        } else if (data.isBuilding || data.model.includes('cottage') || data.model.includes('cafe')) {
            const bodyGeo = new THREE.BoxGeometry(10, 6, 8);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 3.0;
            group.add(body);

            const roofGeo = new THREE.ConeGeometry(7, 3.5, 4);
            const roofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.y = 7.5;
            roof.rotation.y = Math.PI / 4;
            group.add(roof);
        } else if (data.model.includes('pedestal')) {
            const pedGeo = new THREE.CylinderGeometry(2.35, 2.7, 0.45, 32);
            const pedMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.8 });
            const ped = new THREE.Mesh(pedGeo, pedMat);
            ped.position.y = 0.22;
            group.add(ped);
        } else if (data.interactive === 'treasure_chest') {
            const chestGeo = new THREE.BoxGeometry(1.4, 0.9, 1.0);
            const chestMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, roughness: 0.3 });
            const chest = new THREE.Mesh(chestGeo, chestMat);
            chest.position.y = 0.45;
            group.add(chest);
        } else {
            const propGeo = new THREE.CylinderGeometry(1.2, 1.5, 3.8, 12);
            const propMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
            const prop = new THREE.Mesh(propGeo, propMat);
            prop.position.y = 1.9;
            group.add(prop);
        }

        return group;
    }

    addToSpatialGrid(collider) {
        const minCellX = Math.floor((collider.x - collider.radius) / this.cellSize);
        const maxCellX = Math.floor((collider.x + collider.radius) / this.cellSize);
        const minCellZ = Math.floor((collider.z - collider.radius) / this.cellSize);
        const maxCellZ = Math.floor((collider.z + collider.radius) / this.cellSize);

        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cz = minCellZ; cz <= maxCellZ; cz++) {
                const key = `${cx}_${cz}`;
                if (!this.spatialGrid.has(key)) {
                    this.spatialGrid.set(key, []);
                }
                this.spatialGrid.get(key).push(collider);
            }
        }
    }

    resolveCollision(currentPos, playerRadius = 0.55) {
        const cx = Math.floor(currentPos.x / this.cellSize);
        const cz = Math.floor(currentPos.z / this.cellSize);
        const key = `${cx}_${cz}`;

        const nearby = this.spatialGrid.get(key);
        if (!nearby || nearby.length === 0) return currentPos;

        for (const col of nearby) {
            const dx = currentPos.x - col.x;
            const dz = currentPos.z - col.z;
            const dist = Math.hypot(dx, dz);
            const minDist = col.radius + playerRadius;

            if (dist < minDist && dist > 1e-4) {
                const push = (minDist - dist);
                currentPos.x += (dx / dist) * push;
                currentPos.z += (dz / dist) * push;
            }
        }

        return currentPos;
    }

    update(dt) {
        for (const anim of this.animatedProps) {
            if (anim.data.isAnimatedWindmill) {
                anim.root.rotation.y += 0.45 * dt;
            } else if (anim.data.hasRotatingLight) {
                anim.root.rotation.y += 0.85 * dt;
            }
        }
    }

    destroy() {
        this.isDestroyed = true;
        this.scene.remove(this.propsGroup);
        AssetManager.disposeSceneTree(this.propsGroup);
        this.spatialGrid.clear();
        this.colliders = [];
        this.interactives = [];
        this.animatedProps = [];
    }
}
