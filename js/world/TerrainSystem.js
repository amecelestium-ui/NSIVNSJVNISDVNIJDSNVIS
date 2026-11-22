/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/world/TerrainSystem.js
 * 
 * Deterministic 4-Octave FBM Heightmap with 7 Flat Zones,
 * Analytical Slope Normal Calculation, and GLSL3 Anti-Tiling Splat Shader.
 */

import * as THREE from 'three';
import { AssetManager } from '../core/AssetManager.js';

export const FLAT_ZONES = [
    { id: 'plaza',       cx: 0,    cz: 0,    rIn: 32, rOut: 62,  y: 0.0 },
    { id: 'cafe',        cx: 78,   cz: -4,   rIn: 28, rOut: 52,  y: 0.0 },
    { id: 'village',     cx: -86,  cz: 0,    rIn: 40, rOut: 70,  y: 0.0 },
    { id: 'aquifer',     cx: 0,    cz: -84,  rIn: 42, rOut: 72,  y: 0.0 },
    { id: 'south_gate',  cx: 0,    cz: 158,  rIn: 24, rOut: 48,  y: 0.0 },
    { id: 'east_harbor', cx: 540,  cz: 0,    rIn: 60, rOut: 110, y: 0.0 },
    { id: 'west_pagoda', cx: -760, cz: 0,    rIn: 55, rOut: 100, y: 4.0 }
];

function hash2(x, z) {
    const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
    return n - Math.floor(n);
}

function valueNoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const a = hash2(ix, iz), b = hash2(ix + 1, iz);
    const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x, z) {
    let val = 0, amp = 0.5, freq = 1.0;
    for (let i = 0; i < 4; i++) {
        val += amp * (valueNoise(x * freq, z * freq) * 2 - 1);
        freq *= 2.02;
        amp *= 0.48;
    }
    return val;
}

function smoothstep(e0, e1, x) {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
}

/**
 * Deterministic heightmap evaluator
 */
export function getTerrainHeight(x, z, sceneMode = 'sandbox') {
    if (sceneMode && sceneMode.startsWith('arena_')) {
        return 0.0;
    }

    const rCenter = Math.hypot(x, z);
    const isOuter = smoothstep(145, 210, rCenter);
    const amp = 6.5 * (1 - isOuter) + 24.0 * isOuter;

    let h = Math.max(0, (fbm(x * 0.0085, z * 0.0085) * 0.65 + fbm(x * 0.022, z * 0.022) * 0.25 + 0.35) * amp);

    // Ocean drop in East
    const oceanDrop = smoothstep(500, 620, x);
    h = h * (1 - oceanDrop) + (-3.2) * oceanDrop;

    // Apply 7 flat zones
    for (const zf of FLAT_ZONES) {
        const d = Math.hypot(x - zf.cx, z - zf.cz);
        const m = 1 - smoothstep(zf.rIn, zf.rOut, d);
        h = h * (1 - m) + zf.y * m;
    }

    return h;
}

/**
 * Calculates surface normal from height derivatives
 */
export function getTerrainNormal(x, z, sceneMode = 'sandbox', target = new THREE.Vector3()) {
    if (sceneMode && sceneMode.startsWith('arena_')) {
        return target.set(0, 1, 0);
    }

    const e = 0.5;
    const hL = getTerrainHeight(x - e, z, sceneMode);
    const hR = getTerrainHeight(x + e, z, sceneMode);
    const hD = getTerrainHeight(x, z - e, sceneMode);
    const hU = getTerrainHeight(x, z + e, sceneMode);

    return target.set(hL - hR, 2 * e, hD - hU).normalize();
}

export class TerrainSystem {
    constructor(scene, sceneMode = 'sandbox', quality = 'medium') {
        this.scene = scene;
        this.sceneMode = sceneMode;
        this.quality = quality;
        this.mesh = null;
    }

    async init() {
        const size = this.sceneMode.startsWith('arena_') ? 320 : 1920;
        let segments = 170;
        if (this.quality === 'low') segments = 110;
        if (this.quality === 'high') segments = 220;

        const geo = new THREE.PlaneGeometry(size, size, segments, segments);
        geo.rotateX(-Math.PI / 2);

        const posAttr = geo.attributes.position;
        const roadMask = new Float32Array(posAttr.count);

        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const z = posAttr.getZ(i);
            const y = getTerrainHeight(x, z, this.sceneMode);
            posAttr.setY(i, y);

            // Road mask from central plaza to landmarks
            const distPlaza = Math.hypot(x, z);
            const isNearOrigin = distPlaza < 30;
            const isRoadToCafe = Math.abs(z - (-4)) < 4.5 && x > 0 && x < 78;
            const isRoadToVillage = Math.abs(z) < 4.5 && x < 0 && x > -86;
            const isRoadToAquifer = Math.abs(x) < 4.5 && z < 0 && z > -84;
            const isRoadToSouth = Math.abs(x) < 5.0 && z > 0 && z < 158;

            roadMask[i] = (isNearOrigin || isRoadToCafe || isRoadToVillage || isRoadToAquifer || isRoadToSouth) ? 1.0 : 0.0;
        }

        geo.setAttribute('aRoadMask', new THREE.BufferAttribute(roadMask, 1));
        geo.computeVertexNormals();

        // Load textures
        const meadowTex = await AssetManager.loadTexture(AssetManager.assetUrl('reia_nature_pack/tex_reia_meadow.webp'));
        const flowerTex = await AssetManager.loadTexture(AssetManager.assetUrl('reia_nature_pack/tex_reia_flower_meadow.webp'));
        const dirtTex = await AssetManager.loadTexture(AssetManager.assetUrl('reia_nature_pack/tex_reia_dirtpath.webp'));
        const cliffTex = await AssetManager.loadTexture(AssetManager.assetUrl('reia_nature_pack/tex_reia_cliff_smooth.webp'));
        const sandTex = await AssetManager.loadTexture(AssetManager.assetUrl('reia_nature_pack/tex_reia_sand_beach.webp'));
        const cobbleTex = await AssetManager.loadTexture(AssetManager.assetUrl('hd_textures_genshin/tex_cobble.png'));

        [meadowTex, flowerTex, dirtTex, cliffTex, sandTex, cobbleTex].forEach(t => {
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
        });

        const customUniforms = {
            uMeadowTex: { value: meadowTex },
            uFlowerTex: { value: flowerTex },
            uDirtTex: { value: dirtTex },
            uCliffTex: { value: cliffTex },
            uSandTex: { value: sandTex },
            uCobbleTex: { value: cobbleTex },
            uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
            uIsArena: { value: this.sceneMode.startsWith('arena_') ? 1.0 : 0.0 }
        };

        const mat = new THREE.ShaderMaterial({
            uniforms: customUniforms,
            vertexShader: `
                attribute float aRoadMask;
                varying vec2 vUv;
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                varying float vRoadMask;

                void main() {
                    vUv = uv;
                    vRoadMask = aRoadMask;
                    vNormal = normalize(normalMatrix * normal);
                    vec4 wPos = modelMatrix * vec4(position, 1.0);
                    vWorldPos = wPos.xyz;
                    gl_Position = projectionMatrix * viewMatrix * wPos;
                }
            `,
            fragmentShader: `
                precision highp float;

                uniform sampler2D uMeadowTex;
                uniform sampler2D uFlowerTex;
                uniform sampler2D uDirtTex;
                uniform sampler2D uCliffTex;
                uniform sampler2D uSandTex;
                uniform sampler2D uCobbleTex;
                uniform vec3 uSunDir;
                uniform float uIsArena;

                varying vec2 vUv;
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                varying float vRoadMask;

                vec4 hash4(vec2 p) {
                    return fract(sin(vec4(
                        1.0 + dot(p, vec2(37.0, 17.0)),
                        2.0 + dot(p, vec2(11.0, 47.0)),
                        3.0 + dot(p, vec2(41.0, 29.0)),
                        4.0 + dot(p, vec2(23.0, 31.0))
                    )) * 103.0);
                }

                vec4 textureNoTile(sampler2D samp, vec2 uv) {
                    vec2 iuv = floor(uv);
                    vec2 fuv = fract(uv);
                    vec4 ofa = hash4(iuv + vec2(0.0, 0.0));
                    vec4 ofb = hash4(iuv + vec2(1.0, 0.0));
                    vec4 ofc = hash4(iuv + vec2(0.0, 1.0));
                    vec4 ofd = hash4(iuv + vec2(1.0, 1.0));
                    vec2 ddx = dFdx(uv);
                    vec2 ddy = dFdy(uv);
                    ofa.zw = sign(ofa.zw - 0.5); ofb.zw = sign(ofb.zw - 0.5);
                    ofc.zw = sign(ofc.zw - 0.5); ofd.zw = sign(ofd.zw - 0.5);
                    vec2 b = smoothstep(0.25, 0.75, fuv);
                    return mix(
                        mix(textureGrad(samp, uv * ofa.zw + ofa.xy, ddx * ofa.zw, ddy * ofa.zw),
                            textureGrad(samp, uv * ofb.zw + ofb.xy, ddx * ofb.zw, ddy * ofb.zw), b.x),
                        mix(textureGrad(samp, uv * ofc.zw + ofc.xy, ddx * ofc.zw, ddy * ofc.zw),
                            textureGrad(samp, uv * ofd.zw + ofd.xy, ddx * ofd.zw, ddy * ofd.zw), b.x),
                        b.y
                    );
                }

                void main() {
                    if (uIsArena > 0.5) {
                        vec4 cobble = textureNoTile(uCobbleTex, vWorldPos.xz * 0.12);
                        gl_FragColor = vec4(cobble.rgb * 1.05, 1.0);
                        return;
                    }

                    vec2 uvGrass = vWorldPos.xz * 0.055;
                    vec4 meadow = textureNoTile(uMeadowTex, uvGrass);
                    vec4 flower = textureNoTile(uFlowerTex, uvGrass * 0.9);
                    vec4 dirt = textureNoTile(uDirtTex, vWorldPos.xz * 0.08);
                    vec4 cliff = textureNoTile(uCliffTex, vWorldPos.xz * 0.06);
                    vec4 sand = textureNoTile(uSandTex, vWorldPos.xz * 0.09);

                    // Sunlit golden meadow tint
                    vec3 sunTint = mix(vec3(0.74, 0.96, 0.66), vec3(1.12, 1.15, 0.72), smoothstep(1.0, 16.0, vWorldPos.y) * max(dot(vNormal, uSunDir), 0.2));
                    vec3 col = meadow.rgb * sunTint;

                    // Blend flower meadow on gentle slopes
                    if (vNormal.y > 0.91 && vWorldPos.y > 1.2 && vWorldPos.y < 15.0) {
                        float flowerFactor = smoothstep(0.4, 0.7, sin(vWorldPos.x * 0.04) * cos(vWorldPos.z * 0.04));
                        col = mix(col, flower.rgb * 1.08, flowerFactor * 0.65);
                    }

                    // Blend road/dirtpath
                    if (vRoadMask > 0.2) {
                        col = mix(col, dirt.rgb * 0.95, smoothstep(0.2, 0.8, vRoadMask));
                    }

                    // Blend cliff on steep slopes
                    if (vNormal.y < 0.86) {
                        float cliffFactor = smoothstep(0.86, 0.74, vNormal.y);
                        col = mix(col, cliff.rgb * 0.88, cliffFactor);
                    }

                    // Blend sand near eastern ocean
                    float oceanEdge = smoothstep(465.0, 520.0, vWorldPos.x) * (1.0 - smoothstep(1.2, 2.8, vWorldPos.y));
                    if (oceanEdge > 0.01) {
                        col = mix(col, sand.rgb, oceanEdge);
                    }

                    gl_FragColor = vec4(col, 1.0);
                }
            `
        });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}
