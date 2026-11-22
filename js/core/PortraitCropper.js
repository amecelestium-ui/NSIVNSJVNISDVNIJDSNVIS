/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/core/PortraitCropper.js
 * 
 * In-Memory Dual-Crop Pipeline for 42 JKT48 Member Photos:
 * - Avatar Variant (256×256): Cuts bottom 13% banner & top-left setlist logo (Minimap, Lock Wheel, Killfeed)
 * - Card Variant (440×484): Bust portrait with subtle dark bottom vignette (Hero Select Grid, Loading)
 * - Zero 404 Network HEAD checks: Crops directly from source photo in memory.
 */

import { AssetManager } from './AssetManager.js';
import { AssetRegistry } from './AssetRegistry.js';

class PortraitCropperClass {
    constructor() {
        this.cache = new Map(); // key: `${slug}_${variant}` -> dataURL
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * Gets or generates cropped portrait URL in memory
     * @param {Object} hero 
     * @param {'avatar'|'card'} variant 
     * @returns {Promise<string>} Data URL or resolved image URL
     */
    async getCroppedPortrait(hero, variant = 'avatar') {
        if (!hero) return '';

        const cacheKey = `${hero.slug || hero.id}_${variant}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Resolve raw source photo
        const rawUrl = AssetRegistry.resolve(hero.portraitSource);

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            const timer = setTimeout(() => {
                this.cache.set(cacheKey, rawUrl);
                resolve(rawUrl);
            }, 1200);

            img.onerror = () => {
                clearTimeout(timer);
                AssetRegistry.markFailed(rawUrl, 'Portrait Image Failed to Load');
                this.cache.set(cacheKey, rawUrl);
                resolve(rawUrl);
            };

            img.onload = () => {
                clearTimeout(timer);
                const W = img.naturalWidth || img.width;
                const H = img.naturalHeight || img.height;

                try {
                    let croppedUrl = '';
                    if (variant === 'avatar') {
                        // Tight circular avatar: 24% left, 7% top, size 58%
                        const ax = Math.floor(W * 0.24);
                        const ay = Math.floor(H * 0.07);
                        const asize = Math.floor(Math.min(W, H) * 0.58);

                        this.canvas.width = 256;
                        this.canvas.height = 256;
                        this.ctx.clearRect(0, 0, 256, 256);

                        this.ctx.drawImage(img, ax, ay, asize, asize, 0, 0, 256, 256);
                        croppedUrl = this.canvas.toDataURL('image/webp', 0.92);
                    } else {
                        // Bust card: 16% left, 5% top, 72% width, 79% height
                        const cx = Math.floor(W * 0.16);
                        const cy = Math.floor(H * 0.05);
                        const cw = Math.floor(W * 0.72);
                        const ch = Math.floor(H * 0.79);

                        this.canvas.width = 440;
                        this.canvas.height = 484;
                        this.ctx.clearRect(0, 0, 440, 484);

                        this.ctx.drawImage(img, cx, cy, cw, ch, 0, 0, 440, 484);

                        // Subtle bottom vignette gradient so nameplate is ultra-legible
                        const grad = this.ctx.createLinearGradient(0, 320, 0, 484);
                        grad.addColorStop(0, 'rgba(5, 8, 14, 0)');
                        grad.addColorStop(1, 'rgba(5, 8, 14, 0.92)');
                        this.ctx.fillStyle = grad;
                        this.ctx.fillRect(0, 320, 440, 164);

                        croppedUrl = this.canvas.toDataURL('image/webp', 0.92);
                    }

                    this.cache.set(cacheKey, croppedUrl);
                    AssetRegistry.markUsed(hero.portraitSource);
                    resolve(croppedUrl);
                } catch (e) {
                    this.cache.set(cacheKey, rawUrl);
                    resolve(rawUrl);
                }
            };

            img.src = rawUrl;
        });
    }

    preloadAllRoster(heroes, onProgress = null) {
        if (!heroes || !heroes.length) return Promise.resolve();
        let loaded = 0;
        return Promise.all(heroes.map(async (h) => {
            await this.getCroppedPortrait(h, 'card');
            loaded++;
            if (onProgress) onProgress(loaded, heroes.length);
        }));
    }
}

export const PortraitCropper = new PortraitCropperClass();
