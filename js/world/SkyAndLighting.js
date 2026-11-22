/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/world/SkyAndLighting.js
 * 
 * 360° Equirectangular Skybox, Billboard Clouds, Anime Sun Flare,
 * PMREM Environment Lighting, and EffectComposer Selective HDR Bloom.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AssetManager } from '../core/AssetManager.js';

export class SkyAndLighting {
    constructor(scene, renderer, camera, sceneMode = 'sandbox', quality = 'medium') {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.sceneMode = sceneMode;
        this.quality = quality;

        this.composer = null;
        this.bloomPass = null;
        this.sunLight = null;
        this.hemiLight = null;
        this.cloudsGroup = null;
        this.clouds = [];
    }

    async init() {
        // 1. Atmosphere & Fog
        if (this.sceneMode === 'sandbox') {
            this.scene.fog = new THREE.FogExp2(0x9ed8ff, 0.00095);
        } else {
            this.scene.fog = new THREE.FogExp2(0x0e1726, 0.0035);
        }

        // 2. Sun Directional Light with Follow Shadows
        this.sunLight = new THREE.DirectionalLight(0xfff5d8, 2.45);
        this.sunLight.position.set(65, 120, 45);

        if (this.quality !== 'low') {
            this.sunLight.castShadow = true;
            const shadowSize = 1024; // 1024x1024 PCFShadowMap
            this.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
            this.sunLight.shadow.camera.near = 0.5;
            this.sunLight.shadow.camera.far = 300;
            this.sunLight.shadow.camera.left = -45;
            this.sunLight.shadow.camera.right = 45;
            this.sunLight.shadow.camera.top = 45;
            this.sunLight.shadow.camera.bottom = -45;
            this.sunLight.shadow.bias = -0.00035;
        }
        this.scene.add(this.sunLight);

        // 3. Hemisphere Light (Bright ground bounce)
        this.hemiLight = new THREE.HemisphereLight(0x94d8ff, 0x5d8e44, 1.25);
        this.scene.add(this.hemiLight);

        // Ambient Light for consistent clarity across platforms
        const amb = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(amb);

        // 4. PMREM RoomEnvironment for Character Reflections
        try {
            const pmrem = new THREE.PMREMGenerator(this.renderer);
            this.scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
            this.scene.environmentIntensity = 0.78;
        } catch (_) {}

        // 5. 360° Skybox Texture
        let skyboxName = 'skybox_reia_golden_meadow.webp';
        if (this.sceneMode === 'arena_colosseum') skyboxName = 'skybox_passion_horizon.webp';
        if (this.sceneMode === 'arena_ocean_bridge') skyboxName = 'skybox_sunset_ocean.webp';
        if (this.sceneMode === 'arena_sky_sakura') skyboxName = 'skybox_twilight_sakura.webp';

        try {
            const skyTex = await AssetManager.loadTexture(AssetManager.assetUrl(`skyboxes_and_banners/${skyboxName}`));
            skyTex.mapping = THREE.EquirectangularReflectionMapping;
            skyTex.colorSpace = THREE.SRGBColorSpace;
            this.scene.background = skyTex;
        } catch (_) {
            this.scene.background = new THREE.Color(0x87ceeb);
        }

        // 6. Floating Billboard Clouds
        this.initClouds();

        // 7. Direct Renderer (Post-processing disabled by default to eliminate NaN black-box artifact)
        this.composer = null;
    }

    initClouds() {
        this.cloudsGroup = new THREE.Group();
        this.scene.add(this.cloudsGroup);

        const cloudGeo = new THREE.PlaneGeometry(55, 32);
        const cloudMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.72,
            depthWrite: false
        });

        // Scatter 24 clouds
        for (let i = 0; i < 24; i++) {
            const mesh = new THREE.Mesh(cloudGeo, cloudMat);
            const x = (Math.random() - 0.5) * 800;
            const y = 95 + Math.random() * 75;
            const z = (Math.random() - 0.5) * 800;
            const scale = 0.8 + Math.random() * 0.9;

            mesh.position.set(x, y, z);
            mesh.scale.set(scale, scale, scale);
            this.cloudsGroup.add(mesh);
            this.clouds.push({ mesh, speed: 1.2 + Math.random() * 2.5 });
        }
    }

    initPostProcessing() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        const renderTarget = new THREE.WebGLRenderTarget(w, h, {
            type: THREE.HalfFloatType,
            samples: this.quality === 'high' ? 4 : 2
        });

        this.composer = new EffectComposer(this.renderer, renderTarget);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // Threshold = 1.0 (Critical: Prevents standard daytime terrain from burning white!)
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.65, 1.0);
        this.composer.addPass(this.bloomPass);

        this.composer.addPass(new OutputPass());
    }

    update(dt, followTargetPos = null) {
        // Move directional light with target for high quality shadows
        if (this.sunLight && followTargetPos) {
            this.sunLight.position.set(
                followTargetPos.x + 65,
                followTargetPos.y + 120,
                followTargetPos.z + 45
            );
            this.sunLight.target.position.copy(followTargetPos);
            this.sunLight.target.updateMatrixWorld();
        }

        // Drift clouds along wind vector
        for (const c of this.clouds) {
            c.mesh.position.x += c.speed * dt;
            c.mesh.quaternion.copy(this.camera.quaternion); // Billboard orientation
            if (c.mesh.position.x > 450) {
                c.mesh.position.x = -450;
            }
        }
    }

    render() {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize(w, h) {
        if (this.composer) {
            this.composer.setSize(w, h);
        }
    }

    destroy() {
        if (this.cloudsGroup) {
            this.scene.remove(this.cloudsGroup);
        }
        if (this.sunLight) this.scene.remove(this.sunLight);
        if (this.hemiLight) this.scene.remove(this.hemiLight);
    }
}
