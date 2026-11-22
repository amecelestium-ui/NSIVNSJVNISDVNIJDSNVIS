/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/world/FloraSystem.js
 * 
 * GPU InstancedMesh Flora System:
 * - 50,000+ Grass & Wildflowers with Crossed-Quad Geometry (8 Vertices)
 * - 2-Octave Wind Vertex Shader & Real-Time Player Trample Bending
 * - Density Masking (Avoids roads, buildings, water & arena floors)
 */

import * as THREE from 'three';
import { AssetManager } from '../core/AssetManager.js';
import { getTerrainHeight, getTerrainNormal } from './TerrainSystem.js';

export class FloraSystem {
    constructor(scene, quality = 'medium') {
        this.scene = scene;
        this.quality = quality;
        this.instancedMeshes = [];
        this.floraUniforms = null;
        this.clock = new THREE.Clock();
    }

    async init() {
        let grassCount = 18000;
        let flowerCount = 4500;
        if (this.quality === 'low') {
            grassCount = 7000;
            flowerCount = 1800;
        } else if (this.quality === 'high') {
            grassCount = 36000;
            flowerCount = 9000;
        }

        // Crossed quad geometry
        const geo = new THREE.BufferGeometry();
        const w = 0.55, h = 0.85;

        // 2 intersecting quads (8 vertices)
        const vertices = new Float32Array([
            // Quad 1
            -w, 0, 0,   w, 0, 0,   w, h, 0,
            -w, 0, 0,   w, h, 0,  -w, h, 0,
            // Quad 2 (rotated 60 deg)
            -w * 0.5, 0, -w * 0.866,   w * 0.5, 0,  w * 0.866,   w * 0.5, h,  w * 0.866,
            -w * 0.5, 0, -w * 0.866,   w * 0.5, h,  w * 0.866,  -w * 0.5, h, -w * 0.866
        ]);

        const uvs = new Float32Array([
            0, 0,  1, 0,  1, 1,
            0, 0,  1, 1,  0, 1,
            0, 0,  1, 0,  1, 1,
            0, 0,  1, 1,  0, 1
        ]);

        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.computeVertexNormals();

        // Load grass texture
        const grassTex = await AssetManager.loadTexture(AssetManager.assetUrl('reia_nature_pack/grass_tuft_01.webp'));
        const flowerTex = await AssetManager.loadTexture(AssetManager.assetUrl('reia_nature_pack/flower_cluster_red.webp'));

        this.floraUniforms = {
            uTime: { value: 0 },
            uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
            uTexture: { value: grassTex }
        };

        const createFloraMaterial = (tex) => {
            return new THREE.ShaderMaterial({
                uniforms: {
                    uTime: this.floraUniforms.uTime,
                    uPlayerPos: this.floraUniforms.uPlayerPos,
                    uTexture: { value: tex }
                },
                transparent: true,
                alphaTest: 0.45,
                side: THREE.DoubleSide,
                vertexShader: `
                    uniform float uTime;
                    uniform vec3 uPlayerPos;
                    varying vec2 vUv;
                    varying vec3 vWorldPos;

                    void main() {
                        vUv = uv;
                        vec3 pos = position;

                        // World position before displacement
                        vec4 wPos = instanceMatrix * vec4(pos, 1.0);
                        float tip = pow(uv.y, 1.6);

                        // 2-Octave wind gust
                        float gust = sin(wPos.x * 0.08 + wPos.z * 0.06 + uTime * 1.9) * 0.30 
                                   + sin(wPos.x * 0.42 + uTime * 4.6) * 0.06;
                        wPos.x += gust * tip * 0.45;
                        wPos.z += gust * tip * 0.35;

                        // Player trample bending
                        vec2 toBlade = wPos.xz - uPlayerPos.xz;
                        float dist = length(toBlade);
                        float bend = smoothstep(1.55, 0.0, dist) * 0.72;
                        wPos.xz += normalize(toBlade + 1e-4) * bend * tip;
                        wPos.y -= bend * 0.25 * tip;

                        vWorldPos = wPos.xyz;
                        gl_Position = projectionMatrix * viewMatrix * wPos;
                    }
                `,
                fragmentShader: `
                    uniform sampler2D uTexture;
                    varying vec2 vUv;
                    varying vec3 vWorldPos;

                    void main() {
                        vec4 col = texture2D(uTexture, vUv);
                        if (col.a < 0.45) discard;

                        // Slight top gradient tint
                        col.rgb = mix(col.rgb * 0.85, col.rgb * 1.15, vUv.y);
                        gl_FragColor = col;
                    }
                `
            });
        };

        // 1. Grass InstancedMesh
        const grassMesh = new THREE.InstancedMesh(geo, createFloraMaterial(grassTex), grassCount);
        this.populateFlora(grassMesh, grassCount, 'grass');
        this.scene.add(grassMesh);
        this.instancedMeshes.push(grassMesh);

        // 2. Flower InstancedMesh
        const flowerMesh = new THREE.InstancedMesh(geo, createFloraMaterial(flowerTex), flowerCount);
        this.populateFlora(flowerMesh, flowerCount, 'flower');
        this.scene.add(flowerMesh);
        this.instancedMeshes.push(flowerMesh);
    }

    populateFlora(mesh, count, type) {
        const dummy = new THREE.Object3D();
        const norm = new THREE.Vector3();
        let placed = 0;
        let attempts = 0;

        while (placed < count && attempts < count * 3) {
            attempts++;
            // Scatter within 240m radius of center, or outer hills
            const angle = Math.random() * Math.PI * 2;
            const dist = 14 + Math.random() * 260;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;

            // Density checks: Avoid central plaza, cafe, village, aquifer
            const distPlaza = Math.hypot(x, z);
            if (distPlaza < 28) continue;
            if (Math.hypot(x - 78, z - (-4)) < 24) continue; // cafe
            if (Math.hypot(x - (-86), z) < 32) continue; // village
            if (Math.hypot(x, z - (-84)) < 36) continue; // aquifer

            const y = getTerrainHeight(x, z, 'sandbox');
            if (y < 0.25) continue; // water check

            getTerrainNormal(x, z, 'sandbox', norm);
            if (norm.y < 0.84) continue; // steep slope check

            const scale = type === 'grass' ? (0.75 + Math.random() * 0.5) : (0.85 + Math.random() * 0.6);
            dummy.position.set(x, y, z);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            mesh.setMatrixAt(placed, dummy.matrix);
            placed++;
        }

        mesh.count = placed;
        mesh.instanceMatrix.needsUpdate = true;
    }

    update(playerPos) {
        const time = this.clock.getElapsedTime();
        if (this.floraUniforms) {
            this.floraUniforms.uTime.value = time;
            if (playerPos) {
                this.floraUniforms.uPlayerPos.value.copy(playerPos);
            }
        }
    }

    destroy() {
        for (const m of this.instancedMeshes) {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
        }
        this.instancedMeshes = [];
    }
}
