/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/world/WaterSystem.js
 * 
 * Stylized Depth-Foam Water Shader with Caustics,
 * Fresnel Sky Reflection, Step Ripples, and Sinusoidal Buoyancy.
 */

import * as THREE from 'three';
import { AssetManager } from '../core/AssetManager.js';

export class WaterSystem {
    constructor(scene, camera, sceneMode = 'sandbox') {
        this.scene = scene;
        this.camera = camera;
        this.sceneMode = sceneMode;
        this.waterMeshes = [];
        this.buoyantObjects = [];
        this.clock = new THREE.Clock();
    }

    async init() {
        const causticsTex = await AssetManager.loadTexture(AssetManager.assetUrl('hd_textures_genshin/tex_ocean_caustics.png'));
        causticsTex.wrapS = THREE.RepeatWrapping;
        causticsTex.wrapT = THREE.RepeatWrapping;

        this.waterUniforms = {
            uTime: { value: 0 },
            uCausticsTex: { value: causticsTex },
            uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
            uShallowColor: { value: new THREE.Color(0x3be8df) },
            uDeepColor: { value: new THREE.Color(0x0b4a8f) },
            uFoamColor: { value: new THREE.Color(0xffffff) }
        };

        const waterMat = new THREE.ShaderMaterial({
            uniforms: this.waterUniforms,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                uniform float uTime;

                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    // Gentle wave displacement
                    pos.z += sin(pos.x * 0.15 + uTime * 1.8) * 0.12 + cos(pos.y * 0.12 + uTime * 1.4) * 0.08;
                    vNormal = normalize(normalMatrix * normal);
                    vec4 wPos = modelMatrix * vec4(pos, 1.0);
                    vWorldPos = wPos.xyz;
                    gl_Position = projectionMatrix * viewMatrix * wPos;
                }
            `,
            fragmentShader: `
                precision highp float;
                uniform float uTime;
                uniform sampler2D uCausticsTex;
                uniform vec3 uSunDir;
                uniform vec3 uShallowColor;
                uniform vec3 uDeepColor;
                uniform vec3 uFoamColor;

                varying vec2 vUv;
                varying vec3 vWorldPos;
                varying vec3 vNormal;

                void main() {
                    vec2 uvC1 = vWorldPos.xz * 0.08 + vec2(uTime * 0.04, uTime * 0.02);
                    vec2 uvC2 = vWorldPos.xz * 0.07 - vec2(uTime * 0.03, uTime * 0.04);
                    vec4 caust1 = texture2D(uCausticsTex, uvC1);
                    vec4 caust2 = texture2D(uCausticsTex, uvC2);
                    float caustics = (caust1.r + caust2.r) * 0.5;

                    // Approximation of depth based on distance from center/shore
                    float depthFactor = smoothstep(-0.5, -2.5, vWorldPos.y);
                    vec3 col = mix(uShallowColor, uDeepColor, depthFactor);
                    col += caustics * 0.35 * (1.0 - depthFactor);

                    // Foam edge
                    float foam = smoothstep(0.12, -0.05, vWorldPos.y) * 0.65;
                    col = mix(col, uFoamColor, foam);

                    // Specular glint
                    vec3 viewDir = normalize(cameraPosition - vWorldPos);
                    vec3 halfV = normalize(uSunDir + viewDir);
                    float spec = pow(max(dot(vNormal, halfV), 0.0), 48.0) * 0.75;
                    col += vec3(spec);

                    gl_FragColor = vec4(col, 0.78);
                }
            `
        });

        // 1. Crystal Aquifer Pool (circular)
        if (!this.sceneMode.startsWith('arena_')) {
            const aquiferGeo = new THREE.CircleGeometry(36, 48);
            aquiferGeo.rotateX(-Math.PI / 2);
            const aquiferMesh = new THREE.Mesh(aquiferGeo, waterMat);
            aquiferMesh.position.set(0, -0.15, -84);
            this.scene.add(aquiferMesh);
            this.waterMeshes.push(aquiferMesh);

            // 2. Eastern Azure Ocean
            const oceanGeo = new THREE.PlaneGeometry(800, 1920, 48, 48);
            oceanGeo.rotateX(-Math.PI / 2);
            const oceanMesh = new THREE.Mesh(oceanGeo, waterMat);
            oceanMesh.position.set(800, -0.35, 0);
            this.scene.add(oceanMesh);
            this.waterMeshes.push(oceanMesh);
        } else if (this.sceneMode === 'arena_ocean_bridge') {
            // Grand Ocean Bridge ocean plane
            const oceanGeo = new THREE.PlaneGeometry(1600, 1600, 64, 64);
            oceanGeo.rotateX(-Math.PI / 2);
            const oceanMesh = new THREE.Mesh(oceanGeo, waterMat);
            oceanMesh.position.set(0, -14.0, 0);
            this.scene.add(oceanMesh);
            this.waterMeshes.push(oceanMesh);
        }
    }

    addBuoyantObject(object, baseHeight = 0, amplitude = 0.12, freq = 1.4) {
        this.buoyantObjects.push({ object, baseHeight, amplitude, freq, offset: Math.random() * Math.PI * 2 });
    }

    update(dt) {
        const time = this.clock.getElapsedTime();
        if (this.waterUniforms) {
            this.waterUniforms.uTime.value = time;
        }

        // Update buoyant objects
        for (const b of this.buoyantObjects) {
            if (b.object) {
                b.object.position.y = b.baseHeight + Math.sin(time * b.freq + b.offset) * b.amplitude;
                b.object.rotation.z = Math.sin(time * b.freq * 0.8 + b.offset) * 0.03;
                b.object.rotation.x = Math.cos(time * b.freq * 0.7 + b.offset) * 0.025;
            }
        }
    }

    destroy() {
        for (const mesh of this.waterMeshes) {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
        }
        this.waterMeshes = [];
        this.buoyantObjects = [];
    }
}
