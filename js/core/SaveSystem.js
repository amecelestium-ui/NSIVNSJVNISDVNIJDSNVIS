/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/core/SaveSystem.js
 * 
 * Hybrid Persistence: LocalStorage + Cloud Sync (Hugging Face / Turso)
 */

const STORAGE_KEY = 'onyxpure_player_save_v2';

class SaveSystemClass {
    constructor() {
        this.data = this.getDefaultData();
        this.load();
    }

    getDefaultData() {
        return {
            playerId: 'player_' + Math.random().toString(36).substring(2, 10),
            username: 'Sovereign Traveler',
            rankTier: 1, // Trainee
            rankStars: 1,
            onyxGems: 480,
            starCoins: 3500,
            gachaTickets: 8,
            exp: 0,
            level: 1,
            selectedHeroId: 'freya',
            selectedArenaId: 'arena_colosseum',
            inventory: {
                item_phys_01_blade: 1,
                item_boot_01_swift: 1
            },
            unlockedHeroes: ['christy', 'marsha', 'freya', 'erine', 'fiony', 'michie'],
            matchHistory: [],
            settings: {
                bgmVolume: 0.75,
                sfxVolume: 0.9,
                quality: 'medium',
                cameraMode: 'genshin', // 'genshin' or 'mlbb'
                targetPriority: 'lowest_hp_pct', // 'lowest_hp_pct' or 'closest'
                analogMode: 'fixed', // 'fixed' or 'floating'
                hudScale: 1.0, // 0.7 to 1.3
                hudAlpha: 0.92 // 0.3 to 1.0
            }
        };
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.data = { ...this.data, ...parsed };
                if (parsed.settings) {
                    this.data.settings = { ...this.data.settings, ...parsed.settings };
                }
            }
        } catch (e) {
            console.warn('[SaveSystem] LocalStorage load failed, using defaults:', e);
        }
        return this.data;
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('[SaveSystem] LocalStorage save failed:', e);
        }
    }

    /**
     * Sync with Cloud Backend
     * @param {string} backendUrl 
     */
    async syncCloud(backendUrl) {
        if (!backendUrl) return;
        try {
            const resp = await fetch(`${backendUrl}/api/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: this.data.playerId,
                    username: this.data.username,
                    rankTier: this.data.rankTier,
                    rankStars: this.data.rankStars,
                    onyxGems: this.data.onyxGems,
                    starCoins: this.data.starCoins,
                    gachaTickets: this.data.gachaTickets,
                    hudConfig: this.data.settings
                })
            });
            if (resp.ok) {
                const cloudData = await resp.json();
                console.log('[SaveSystem] Cloud profile synced:', cloudData);
            }
        } catch (e) {
            // Offline or sleeping Space
        }
    }

    addCurrency(type, amount) {
        if (typeof this.data[type] === 'number') {
            this.data[type] = Math.max(0, this.data[type] + amount);
            this.save();
        }
    }

    updateSetting(key, val) {
        this.data.settings[key] = val;
        this.save();
    }
}

export const SaveSystem = new SaveSystemClass();
