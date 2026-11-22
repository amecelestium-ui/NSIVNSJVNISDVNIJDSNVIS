/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/core/PortraitCropper.js
 * 
 * In-Memory Dual-Crop Pipeline for 42 JKT48 Member Photos:
 * - Avatar Variant (256×256): Cuts bottom 13% banner & top-left setlist logo (Minimap, Lock Wheel, Killfeed)
 * - Card Variant (440×484): Bust portrait with subtle dark bottom vignette (Hero Select Grid, Loading)
 * - Blob URL Caching + CSS Object-Position Fallback
 */

import { AssetManager } from './AssetManager.js';

class PortraitCropperClass {
    constructor() {
        this.cache = new Map(); // key: `${slug}_${variant}` -> objectURL
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * Gets or generates cropped portrait URL
     * @param {Object} hero 
     * @param {'avatar'|'card'} variant 
     * @returns {Promise<string>} Blob URL or direct image URL
     */
    async getCroppedPortrait(hero, variant = 'avatar') {
        if (!hero) return '';

        const cacheKey = `${hero.slug}_${variant}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // 1. Check if pre-cropped version exists in repository
        const preCroppedPath = variant === 'avatar' ? hero.avatarCropped : hero.cardCropped;
        if (preCroppedPath) {
            const resolvedPre = AssetManager.assetUrl(preCroppedPath);
            try {
                const head = await fetch(resolvedPre, { method: 'HEAD' });
                if (head.ok) {
                    this.cache.set(cacheKey, resolvedPre);
                    return resolvedPre;
                }
            } catch (_) {}
        }

        // 2. Load original raw source image
        const rawUrl = AssetManager.assetUrl(hero.portraitSource);

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            // Timeout safety
            const timer = setTimeout(() => {
                resolve(rawUrl);
            }, 1500);

            img.onerror = () => {
                clearTimeout(timer);
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

                        // Subtle bottom vignette gradient (bottom 18%)
                        const grad = this.ctx.createLinearGradient(0, 484 * 0.72, 0, 484);
                        grad.addColorStop(0, 'rgba(11, 15, 25, 0)');
                        grad.addColorStop(1, 'rgba(11, 15, 25, 0.92)');
                        this.ctx.fillStyle = grad;
                        this.ctx.fillRect(0, 484 * 0.72, 440, 484 * 0.28);

                        croppedUrl = this.canvas.toDataURL('image/webp', 0.90);
                    }

                    this.cache.set(cacheKey, croppedUrl);
                    resolve(croppedUrl);
                } catch (e) {
                    console.warn('[PortraitCropper] Canvas export restricted, using CSS fallback:', e);
                    this.cache.set(cacheKey, rawUrl);
                    resolve(rawUrl);
                }
            };

            img.onerror = () => {
                console.warn(`[PortraitCropper] Failed to load ${rawUrl}`);
                resolve(rawUrl);
            };

            img.src = rawUrl;
        });
    }

    /**
     * Helper to apply CSS fallback classes to image elements
     * @param {HTMLImageElement} imgElement 
     * @param {'avatar'|'card'} variant 
     */
    applyCssCropFallback(imgElement, variant = 'avatar') {
        if (!imgElement) return;
        imgElement.classList.add('portrait-crop-fallback');
        if (variant === 'avatar') {
            imgElement.style.objectFit = 'cover';
            imgElement.style.objectPosition = '52% 14%';
            imgElement.style.transform = 'scale(1.28)';
        } else {
            imgElement.style.objectFit = 'cover';
            imgElement.style.objectPosition = '50% 12%';
            imgElement.style.transform = 'scale(1.12)';
        }
    }
}

export const PortraitCropper = new PortraitCropperClass();
