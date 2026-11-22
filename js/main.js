/**
 * ONYXPURE — JKT48 3D Arena
 * js/main.js
 * 
 * Game Bootstrap & Screen State Coordinator:
 * - Orchestrates the luxury Obsidian & Gold/Cyan Calligraphy Loading Screen
 * - Initiates GitHub Repository & Local Model Asset Scanning
 * - Manages Screen Transitions (Loading -> Hero Selection Lobby -> 3D MOBA Arena)
 */

import { scanRepository } from './githubScanner.js';
import { HeroSelectManager } from './heroSelect.js';
import { ArenaEngine } from './arenaEngine.js';

class GameApp {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingProgress = document.getElementById('loading-bar-fill');
        this.loadingStatus = document.getElementById('loading-status-text');

        this.lobbyContainer = document.getElementById('lobby-container');
        this.arenaContainer = document.getElementById('arena-container');

        this.heroSelectManager = null;
        this.arenaEngine = null;

        this.init();
    }

    /**
     * Initializes Game Application & Calligraphy Loading Sequence
     */
    async init() {
        console.log('⚡ [ONYXPURE] Booting 3D Hero Arena Engine...');
        const startTime = performance.now();

        // 1. Stage 1: WebGL & Three.js Pipeline Check
        this.updateLoading(25, 'Initializing WebGL & Three.js PBR Pipeline...');
        await this.sleep(600);

        // 2. Stage 2: GitHub Repository & Asset Scan
        this.updateLoading(50, 'Scanning GitHub Repository for Available 3D Heroes...');
        try {
            await scanRepository((percent, message) => {
                const mappedPercent = 50 + (percent * 0.4);
                this.updateLoading(mappedPercent, message);
            });
        } catch (err) {
            console.warn('[Main] Scanner non-critical notice:', err);
        }

        // 3. Ensure calligraphy animation runs for at least 2.2 seconds
        const elapsedTime = (performance.now() - startTime) / 1000;
        const remainingDelay = Math.max(0, 2400 - (elapsedTime * 1000));
        await this.sleep(remainingDelay);

        // 4. Stage 3: Ready Transition
        this.updateLoading(100, 'Ready! Entering Arena Lobby...');
        await this.sleep(450);

        // Fade out Loading Screen and Switch to Hero Selection Lobby
        this.transitionToLobby();
    }

    /**
     * Updates loading progress bar and status message
     * @param {number} percent 0 to 100
     * @param {string} text 
     */
    updateLoading(percent, text) {
        if (this.loadingProgress) {
            this.loadingProgress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
        if (this.loadingStatus) {
            this.loadingStatus.textContent = text;
        }
    }

    /**
     * Smooth cinematic transition from Loading Screen to Hero Selection Lobby
     */
    transitionToLobby() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 650);
        }

        this.lobbyContainer.style.display = 'block';
        this.arenaContainer.style.display = 'none';

        // Initialize Lobby Manager
        this.heroSelectManager = new HeroSelectManager({
            container: this.lobbyContainer,
            onEnterArena: (hero) => this.transitionToArena(hero)
        });
    }

    /**
     * Transitions from Hero Selection Lobby into 3D Gameplay Arena
     * @param {Object} hero Selected Hero Data
     */
    transitionToArena(hero) {
        console.log(`[Main] Launching Arena with Hero: ${hero.name}`);

        // Destroy turntable lobby resources to preserve GPU VRAM
        if (this.heroSelectManager) {
            this.heroSelectManager.destroy();
            this.heroSelectManager = null;
        }

        this.lobbyContainer.style.display = 'none';
        this.arenaContainer.style.display = 'block';

        // Launch Gameplay Arena Engine
        this.arenaEngine = new ArenaEngine({
            container: this.arenaContainer,
            hero,
            onBackToLobby: () => this.transitionBackToLobby()
        });
    }

    /**
     * Returns from Arena back to Hero Selection Lobby
     */
    transitionBackToLobby() {
        console.log('[Main] Returning to Hero Selection Lobby...');

        if (this.arenaEngine) {
            this.arenaEngine.destroy();
            this.arenaEngine = null;
        }

        this.arenaContainer.style.display = 'none';
        this.lobbyContainer.style.display = 'block';

        this.heroSelectManager = new HeroSelectManager({
            container: this.lobbyContainer,
            onEnterArena: (hero) => this.transitionToArena(hero)
        });
    }

    /**
     * Helper Promise sleep
     * @param {number} ms 
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Bootstrap application once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new GameApp();
});
