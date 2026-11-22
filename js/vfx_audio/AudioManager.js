/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/vfx_audio/AudioManager.js
 * 
 * Web Audio API 3D Spatial Sound Engine:
 * - 4 BGM Tracks with 1.2s Smooth Gain Crossfade
 * - 210 Hero Unique SFX + 10 UI SFX
 * - 3D PannerNode with Realistic Attenuation & Listener Tracking
 * - Dynamic Pitch Jitter (0.96–1.04) Anti-Monotony
 */

import { AssetManager } from '../core/AssetManager.js';
import { SaveSystem } from '../core/SaveSystem.js';

class AudioManagerClass {
    constructor() {
        this.ctx = null;
        this.bgmGain = null;
        this.sfxGain = null;
        this.currentBgmSource = null;
        this.currentBgmTrack = null;

        this.audioBuffers = new Map(); // path -> AudioBuffer
        this.isUnlocked = false;

        this.initUnlockListeners();
    }

    initContext() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Master Gains
        this.bgmGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        const settings = SaveSystem.data.settings;
        this.bgmGain.gain.value = settings.bgmVolume ?? 0.75;
        this.sfxGain.gain.value = settings.sfxVolume ?? 0.90;

        this.bgmGain.connect(this.ctx.destination);
        this.sfxGain.connect(this.ctx.destination);
    }

    initUnlockListeners() {
        const unlock = () => {
            if (this.isUnlocked) return;
            this.initContext();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().then(() => {
                    this.isUnlocked = true;
                    console.log('⚡ [AudioManager] Web Audio Context unlocked');
                });
            } else {
                this.isUnlocked = true;
            }
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
        };

        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
    }

    async loadBuffer(url) {
        if (this.audioBuffers.has(url)) {
            return this.audioBuffers.get(url);
        }

        try {
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const arrayBuffer = await resp.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(url, audioBuffer);
            return audioBuffer;
        } catch (_) {
            return null;
        }
    }

    /**
     * Crossfades BGM to new track
     * @param {'loading'|'lobby'|'sandbox'|'arena'} trackKey 
     */
    async playBgm(trackKey) {
        if (this.currentBgmTrack === trackKey) return;
        this.initContext();

        const trackFiles = {
            loading: 'audio/bgm/bgm_loading_onyxpure.mp3',
            lobby: 'audio/bgm/bgm_lobby_terrarium.mp3',
            sandbox: 'audio/bgm/bgm_sandbox_explore.mp3',
            arena: 'audio/bgm/bgm_arena_battle.mp3'
        };

        const file = trackFiles[trackKey];
        if (!file) return;

        const url = AssetManager.assetUrl(file);
        const buffer = await this.loadBuffer(url);
        if (!buffer) return;

        // Crossfade out old source
        if (this.currentBgmSource) {
            const oldSource = this.currentBgmSource;
            const oldGain = oldSource.gainNode;
            if (oldGain) {
                oldGain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);
            }
            setTimeout(() => {
                try { oldSource.stop(); } catch (_) {}
            }, 1250);
        }

        // Create new BGM track source
        const newSource = this.ctx.createBufferSource();
        newSource.buffer = buffer;
        newSource.loop = true;

        const newGain = this.ctx.createGain();
        newGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        newGain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + 1.2);

        newSource.connect(newGain);
        newGain.connect(this.bgmGain);
        newSource.gainNode = newGain;

        newSource.start(0);
        this.currentBgmSource = newSource;
        this.currentBgmTrack = trackKey;
    }

    /**
     * Plays 3D spatial SFX or 2D UI SFX
     * @param {string} soundPath Relative path to .mp3
     * @param {THREE.Vector3} [worldPos=null] Optional 3D position
     */
    async playSfx(soundPath, worldPos = null) {
        this.initContext();
        if (!this.ctx) return;

        const url = AssetManager.assetUrl(soundPath);
        const buffer = await this.loadBuffer(url);
        if (!buffer) return;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        // Anti-monotony pitch jitter
        source.playbackRate.value = 0.96 + Math.random() * 0.08;

        if (worldPos) {
            // 3D Panner Node
            const panner = this.ctx.createPanner();
            panner.panningModel = 'equalpower';
            panner.distanceModel = 'inverse';
            panner.refDistance = 6.0;
            panner.maxDistance = 55.0;
            panner.rolloffFactor = 1.4;

            panner.positionX.value = worldPos.x;
            panner.positionY.value = worldPos.y;
            panner.positionZ.value = worldPos.z;

            source.connect(panner);
            panner.connect(this.sfxGain);
        } else {
            // 2D UI SFX
            source.connect(this.sfxGain);
        }

        source.start(0);
    }

    playHeroSfx(hero, slot, worldPos = null) {
        if (!hero || !hero.audio || !hero.audio[slot]) return;
        this.playSfx(hero.audio[slot], worldPos);
    }

    updateListener(camera) {
        if (!this.ctx || !camera) return;
        const pos = camera.position;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

        const listener = this.ctx.listener;
        if (listener.positionX) {
            listener.positionX.setValueAtTime(pos.x, this.ctx.currentTime);
            listener.positionY.setValueAtTime(pos.y, this.ctx.currentTime);
            listener.positionZ.setValueAtTime(pos.z, this.ctx.currentTime);
            listener.forwardX.setValueAtTime(forward.x, this.ctx.currentTime);
            listener.forwardY.setValueAtTime(forward.y, this.ctx.currentTime);
            listener.forwardZ.setValueAtTime(forward.z, this.ctx.currentTime);
            listener.upX.setValueAtTime(up.x, this.ctx.currentTime);
            listener.upY.setValueAtTime(up.y, this.ctx.currentTime);
            listener.upZ.setValueAtTime(up.z, this.ctx.currentTime);
        }
    }

    setBgmVolume(val) {
        if (this.bgmGain) this.bgmGain.gain.value = Math.max(0, Math.min(1, val));
        SaveSystem.updateSetting('bgmVolume', val);
    }

    setSfxVolume(val) {
        if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, val));
        SaveSystem.updateSetting('sfxVolume', val);
    }
}

export const AudioManager = new AudioManagerClass();
