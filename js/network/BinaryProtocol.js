/**
 * ONYXPURE — JKT48 3D MOBA & OPEN-WORLD ARENA
 * js/network/BinaryProtocol.js
 * 
 * High-Performance 36-Byte Binary Protocol:
 * - Little-Endian DataView encoding/decoding
 * - Zero GC pauses in position update loops
 * - Supports POS_UPDATE (0x01), ACTION_CAST (0x02), PING_PONG (0x03)
 */

export const MSG_TYPE = {
    POS_UPDATE: 0x01,
    ACTION_CAST: 0x02,
    PING_PONG: 0x03
};

export const ANIM_STATE = {
    IDLE: 0,
    WALK: 1,
    RUN: 2,
    SPRINT: 3,
    JUMP: 4,
    BASIC_1: 5,
    BASIC_2: 6,
    BASIC_3: 7,
    S1: 8,
    S2: 9,
    ULT: 10,
    RECALL: 11,
    EMOTE: 12,
    DEATH: 13
};

export class BinaryProtocol {
    /**
     * Encodes position and movement state into a compact 36-byte ArrayBuffer
     * @param {Object} data
     * @returns {ArrayBuffer}
     */
    static encodePosUpdate(data) {
        const buffer = new ArrayBuffer(36);
        const view = new DataView(buffer);

        view.setUint8(0, MSG_TYPE.POS_UPDATE);
        view.setUint16(1, data.netId || 0, true);
        view.setUint16(3, (data.seq || 0) & 0xFFFF, true);
        view.setFloat32(5, data.posX || 0, true);
        view.setFloat32(9, data.posY || 0, true);
        view.setFloat32(13, data.posZ || 0, true);
        view.setFloat32(17, data.velX || 0, true);
        view.setFloat32(21, data.velZ || 0, true);
        view.setFloat32(25, data.yaw || 0, true);
        view.setUint8(29, data.animStateId || 0);

        // Pack HP (0..1000 in bits 0..9) and boolean flags (bits 10..12)
        const hpInt = Math.max(0, Math.min(1000, Math.round((data.hpPct !== undefined ? data.hpPct : 1.0) * 1000)));
        let flags = hpInt & 0x03FF;
        if (data.isGrounded) flags |= (1 << 10);
        if (data.isSprinting) flags |= (1 << 11);
        if (data.isAttacking) flags |= (1 << 12);
        view.setUint16(30, flags, true);

        const ts = (data.timestampMs !== undefined ? data.timestampMs : performance.now()) & 0xFFFFFFFF;
        view.setUint32(32, ts, true);

        return buffer;
    }

    /**
     * Decodes a 36-byte ArrayBuffer or DataView into a position packet
     * @param {ArrayBuffer|DataView} bufferOrView
     * @returns {Object}
     */
    static decodePosUpdate(bufferOrView) {
        const view = bufferOrView instanceof DataView ? bufferOrView : new DataView(bufferOrView);
        if (view.byteLength < 36) return null;

        const flags = view.getUint16(30, true);
        const hpPct = (flags & 0x03FF) / 1000;
        const isGrounded = (flags & (1 << 10)) !== 0;
        const isSprinting = (flags & (1 << 11)) !== 0;
        const isAttacking = (flags & (1 << 12)) !== 0;

        return {
            msgType: view.getUint8(0),
            netId: view.getUint16(1, true),
            seq: view.getUint16(3, true),
            posX: view.getFloat32(5, true),
            posY: view.getFloat32(9, true),
            posZ: view.getFloat32(13, true),
            velX: view.getFloat32(17, true),
            velZ: view.getFloat32(21, true),
            yaw: view.getFloat32(25, true),
            animStateId: view.getUint8(29),
            hpPct,
            isGrounded,
            isSprinting,
            isAttacking,
            timestampMs: view.getUint32(32, true)
        };
    }

    /**
     * Encodes an action cast (skill, attack, recall) into a 36-byte ArrayBuffer
     */
    static encodeActionCast(data) {
        const buffer = new ArrayBuffer(36);
        const view = new DataView(buffer);

        view.setUint8(0, MSG_TYPE.ACTION_CAST);
        view.setUint16(1, data.netId || 0, true);
        view.setUint16(3, (data.seq || 0) & 0xFFFF, true);
        view.setUint8(5, data.actionId || 0); // 1=Basic, 2=S1, 3=S2, 4=Ult, 5=Spell, 6=Recall
        view.setUint16(6, data.targetNetId || 0, true);
        view.setFloat32(8, data.aimX || 0, true);
        view.setFloat32(12, data.aimY || 0, true);
        view.setFloat32(16, data.aimZ || 0, true);
        view.setFloat32(20, data.yaw || 0, true);
        view.setUint32(32, (data.timestampMs || performance.now()) & 0xFFFFFFFF, true);

        return buffer;
    }

    /**
     * Decodes an action cast packet
     */
    static decodeActionCast(bufferOrView) {
        const view = bufferOrView instanceof DataView ? bufferOrView : new DataView(bufferOrView);
        if (view.byteLength < 36) return null;

        return {
            msgType: view.getUint8(0),
            netId: view.getUint16(1, true),
            seq: view.getUint16(3, true),
            actionId: view.getUint8(5),
            targetNetId: view.getUint16(6, true),
            aimX: view.getFloat32(8, true),
            aimY: view.getFloat32(12, true),
            aimZ: view.getFloat32(16, true),
            yaw: view.getFloat32(20, true),
            timestampMs: view.getUint32(32, true)
        };
    }

    /**
     * Encodes a ping-pong packet for RTT latency measurement
     */
    static encodePingPong(netId, seq, clientTimestampMs) {
        const buffer = new ArrayBuffer(36);
        const view = new DataView(buffer);

        view.setUint8(0, MSG_TYPE.PING_PONG);
        view.setUint16(1, netId || 0, true);
        view.setUint16(3, (seq || 0) & 0xFFFF, true);
        view.setUint32(32, (clientTimestampMs || performance.now()) & 0xFFFFFFFF, true);

        return buffer;
    }

    /**
     * Decodes a ping-pong packet
     */
    static decodePingPong(bufferOrView) {
        const view = bufferOrView instanceof DataView ? bufferOrView : new DataView(bufferOrView);
        return {
            msgType: view.getUint8(0),
            netId: view.getUint16(1, true),
            seq: view.getUint16(3, true),
            timestampMs: view.getUint32(32, true)
        };
    }

    /**
     * Modular 16-bit sequence comparison: returns true if seqA is strictly newer than seqB
     */
    static isSeqNewer(seqA, seqB) {
        return ((seqA - seqB) & 0xFFFF) < 32768 && seqA !== seqB;
    }
}
