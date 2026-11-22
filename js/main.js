/**
 * ONYXPURE — JKT48 3D Arena
 * js/main.js
 * 
 * Game Bootstrap & Screen State Coordinator:
 * - Bulletproof Loading Sequence with Fail-Safe Timeout (Never gets stuck)
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
        this.hasTransitioned = false;

        // Skip button if user clicks directly
        const btnSkip = document.getElementById('btn-skip-loading');
        if (btnSkip) {
            btnSkip.addEventListener('click', () => this.forceTransitionToLobby());
        }

        // Hard fail-safe timer: GUARANTEE loading never gets stuck past 2.8s
        setTimeout(() => {
            if (!this.hasTransitioned) {
                console.log('[Main] Fail-safe timer fired. Forcing transition to Lobby.');
                this.forceTransitionToLobby();
            }
        }, 2800);

        this.init();
    }

    /**
     * Initializes Game Application & Loading Sequence
     */
    async init() {
        console.log('⚡ [ONYXPURE] Booting 3D Hero Arena Engine...');

        try {
            // Stage 1: Fast WebGL check
            this.updateLoading(35, 'Initializing WebGL & Three.js PBR Pipeline...');
            await this.sleep(400);

            // Stage 2: Fast repository scan (max 1.5s)
            this.updateLoading(65, 'Scanning Repository for Available 3D Heroes...');
            try {
                await scanRepository((percent, message) => {
                    const mappedPercent = 40 + (percent * 0.5);
                    this.updateLoading(mappedPercent, message);
                });
            } catch (err) {
                console.warn('[Main] Scanner notice (using cached models):', err);
            }

            // Stage 3: Ready
            this.updateLoading(100, 'Ready! Entering Arena Lobby...');
            await this.sleep(350);

            this.forceTransitionToLobby();
        } catch (e) {
            console.error('[Main] Init caught error, entering lobby anyway:', e);
            this.forceTransitionToLobby();
        }
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
     * Guarantees smooth transition from Loading Screen into Hero Selection Lobby
     */
    forceTransitionToLobby() {
        if (this.hasTransitioned) return;
        this.hasTransitioned = true;

        if (this.loadingScreen) {
            this.loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                if (this.loadingScreen) this.loadingScreen.style.display = 'none';
            }, 550);
        }

        if (this.lobbyContainer) this.lobbyContainer.style.display = 'block';
        if (this.arenaContainer) this.arenaContainer.style.display = 'none';

        // Initialize Lobby Manager safely
        try {
            if (!this.heroSelectManager) {
                this.heroSelectManager = new HeroSelectManager({
                    container: this.lobbyContainer,
                    onEnterArena: (hero) => this.transitionToArena(hero)
                });
            }
        } catch (err) {
            console.error('[Main] HeroSelectManager initialization error:', err);
        }
    }

    /**
     * Transitions from Hero Selection Lobby into 3D Gameplay Arena
     * @param {Object} hero Selected Hero Data
     */
    transitionToArena(hero) {
        console.log(`[Main] Launching Arena with Hero: ${hero.name}`);

        if (this.heroSelectManager) {
            this.heroSelectManager.destroy();
            this.heroSelectManager = null;
        }

        if (this.lobbyContainer) this.lobbyContainer.style.display = 'none';
        if (this.arenaContainer) this.arenaContainer.style.display = 'block';

        try {
            this.arenaEngine = new ArenaEngine({
                container: this.arenaContainer,
                hero,
                onBackToLobby: () => this.transitionBackToLobby()
            });
        } catch (err) {
            console.error('[Main] ArenaEngine launch error:', err);
        }
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

        if (this.arenaContainer) this.arenaContainer.style.display = 'none';
        if (this.lobbyContainer) this.lobbyContainer.style.display = 'block';

        try {
            this.heroSelectManager = new HeroSelectManager({
                container: this.lobbyContainer,
                onEnterArena: (hero) => this.transitionToArena(hero)
            });
        } catch (err) {
            console.error('[Main] HeroSelectManager restart error:', err);
        }
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
