/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/network/NetworkClient.js
 * 
 * Authoritative Multiplayer Network Client:
 * - WSS Protocol to Hugging Face Spaces (Port 7860)
 * - 25s Ping/Pong Heartbeat (Bypasses Mobile NAT & Proxy Timeouts)
 * - Silent Disconnect Detection & Exponential Backoff Reconnection
 * - Cold-Start /health Polling with Seamless Offline Bot Fallback
 */

import { NETWORK } from '../config/constants.js';

class NetworkClientClass {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.isOfflineMode = true;
        this.roomId = null;
        this.sessionId = null;

        this.heartbeatTimer = null;
        this.lastPongTime = 0;
        this.missedHeartbeats = 0;
        this.reconnectAttempts = 0;

        this.messageHandlers = new Map(); // type -> Set<Function>
        this.onConnectionChange = () => {};
    }

    /**
     * Checks if Hugging Face Space is active or sleeping
     * @returns {Promise<boolean>}
     */
    async checkBackendHealth() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), NETWORK.COLD_START_TIMEOUT_MS);

            const resp = await fetch(`${NETWORK.BACKEND_URL}/health`, {
                signal: controller.signal
            });
            clearTimeout(timeout);
            return resp.ok;
        } catch (_) {
            return false;
        }
    }

    /**
     * Connect to Room (Arena or Sandbox)
     */
    async connect(roomType = 'arena', options = {}) {
        const isHealthy = await this.checkBackendHealth();
        if (!isHealthy) {
            console.log('[NetworkClient] Backend sleeping or unreachable. Seamlessly activating Offline Mode.');
            this.isOfflineMode = true;
            this.onConnectionChange(false, 'offline_bot_fallback');
            return false;
        }

        const wsUrl = NETWORK.BACKEND_URL.replace(/^http/, 'ws') + `/ws/${roomType}`;
        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.isConnected = true;
                this.isOfflineMode = false;
                this.reconnectAttempts = 0;
                this.missedHeartbeats = 0;
                this.startHeartbeat();
                this.onConnectionChange(true, 'connected');

                // Send join handshake
                this.send('JOIN_ROOM', { roomType, ...options });
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.ws.onclose = () => {
                this.handleDisconnect();
            };

            this.ws.onerror = (err) => {
                console.warn('[NetworkClient] WebSocket error:', err);
            };

            return true;
        } catch (e) {
            this.isOfflineMode = true;
            this.onConnectionChange(false, 'connection_failed');
            return false;
        }
    }

    startHeartbeat() {
        clearInterval(this.heartbeatTimer);
        this.lastPongTime = Date.now();
        this.missedHeartbeats = 0;

        this.heartbeatTimer = setInterval(() => {
            if (!this.isConnected || !this.ws) return;

            // Check if missed more than 2 heartbeats (50s)
            if (this.missedHeartbeats >= 3) {
                console.warn('[NetworkClient] Silent disconnect detected (3 missed heartbeats). Reconnecting...');
                this.ws.close();
                return;
            }

            this.missedHeartbeats++;
            this.send('PING', { t: Date.now() });
        }, NETWORK.HEARTBEAT_INTERVAL_MS);
    }

    handleMessage(data) {
        try {
            const msg = JSON.parse(data);
            if (msg.type === 'PONG') {
                this.lastPongTime = Date.now();
                this.missedHeartbeats = 0;
                return;
            }

            const listeners = this.messageHandlers.get(msg.type);
            if (listeners) {
                for (const fn of listeners) {
                    fn(msg.payload);
                }
            }
        } catch (e) {
            console.warn('[NetworkClient] Message parse error:', e);
        }
    }

    send(type, payload = {}) {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        this.ws.send(JSON.stringify({ type, payload }));
        return true;
    }

    on(type, callback) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type).add(callback);
    }

    off(type, callback) {
        if (this.messageHandlers.has(type)) {
            this.messageHandlers.get(type).delete(callback);
        }
    }

    handleDisconnect() {
        this.isConnected = false;
        clearInterval(this.heartbeatTimer);
        this.onConnectionChange(false, 'disconnected');

        // Exponential backoff reconnect
        if (!this.isOfflineMode && this.reconnectAttempts < 4) {
            this.reconnectAttempts++;
            const delay = Math.min(NETWORK.RECONNECT_MAX_MS, NETWORK.RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts - 1));
            console.log(`[NetworkClient] Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts})...`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.log('[NetworkClient] Fallback to Offline Mode.');
            this.isOfflineMode = true;
        }
    }

    disconnect() {
        clearInterval(this.heartbeatTimer);
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}

export const NetworkClient = new NetworkClientClass();
