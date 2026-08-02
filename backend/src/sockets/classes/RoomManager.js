import Room from "../../models/roomModel.js";
import RoomMember from "../../models/roomMember.js";
import { getRedisClient } from "../../config/redis.js";
import { Participant } from "./Participant.js";

// Redis TTL for room state cache (seconds)
const ROOM_CACHE_TTL = 300; // 5 minutes

/**
 * RoomManager
 *
 * Owns all in-memory state for one watch-party room AND provides
 * methods to mutate + broadcast that state.
 *
 * One instance per roomId, created on first join, destroyed when
 * the last participant leaves.
 *
 * Responsibilities:
 *  - Track live participants (Map<userId, Participant>)
 *  - Keep a local copy of video state (videoId, currentTime, playbackState)
 *  - Persist state changes to MongoDB + Redis cache
 *  - Broadcast events to the socket room via io
 */
export class RoomManager {
    /**
     * @param {object} opts
     * @param {string}        opts.roomId
     * @param {string}        opts.roomCode
     * @param {string}        opts.name
     * @param {string}        opts.hostId
     * @param {string}        opts.videoId
     * @param {number}        opts.currentTime
     * @param {string}        opts.playbackState
     * @param {import("socket.io").Server} opts.io
     */
    constructor({ roomId, roomCode, name, hostId, videoId, currentTime, playbackState, io }) {
        this.roomId = roomId;
        this.roomCode = roomCode;
        this.name = name;
        this.hostId = hostId;
        this.videoId = videoId || "";
        this.currentTime = currentTime || 0;
        this.playbackState = playbackState || "paused";
        this.io = io;

        /** @type {Map<string, Participant>} */
        this.participants = new Map();
    }

    // ── Participant management ───────────────────────────────────────────────────

    /**
     * Add or update a participant in the live map.
     * @param {Participant} participant
     */
    addParticipant(participant) {
        this.participants.set(participant.userId, participant);
    }

    /**
     * Remove a participant from the live map.
     * @param {string} userId
     */
    removeParticipant(userId) {
        this.participants.delete(userId);
    }

    /**
     * @param {string} userId
     * @returns {Participant|undefined}
     */
    getParticipant(userId) {
        return this.participants.get(userId);
    }

    /** Is the room empty? */
    isEmpty() {
        return this.participants.size === 0;
    }

    /**
     * Build full participant list — online users come from in-memory map,
     * offline members fetched from DB.
     * @returns {Promise<Array>}
     */
    async buildParticipantList() {
        // All DB members
        const dbMembers = await RoomMember.find({ roomId: this.roomId }).populate(
            "userId",
            "username"
        );

        return dbMembers.map((m) => {
            const uid = m.userId._id.toString();
            const online = this.participants.get(uid);
            return {
                userId: uid,
                username: m.userId.username,
                role: online ? online.role : m.role,  // live role overrides DB role
                online: !!online,
            };
        });
    }

    // ── Video state ──────────────────────────────────────────────────────────────

    /**
     * Update playback state in memory, DB, and Redis cache.
     * @param {{ playbackState?, currentTime?, videoId? }} patch
     */
    async applyVideoState(patch) {
        if (patch.playbackState !== undefined) this.playbackState = patch.playbackState;
        if (patch.currentTime !== undefined) this.currentTime = patch.currentTime;
        if (patch.videoId !== undefined) this.videoId = patch.videoId;

        // Persist to MongoDB
        const update = {};
        if (patch.playbackState !== undefined) update.playbackState = this.playbackState;
        if (patch.currentTime !== undefined) update.currentTime = this.currentTime;
        if (patch.videoId !== undefined) update.youtubeVideoId = this.videoId;
        await Room.findByIdAndUpdate(this.roomId, update);

        // Update Redis cache
        await this._cacheState();
    }

    /** Snapshot of current video state (sent to new joiners) */
    videoStateSnapshot() {
        return {
            videoId: this.videoId,
            currentTime: this.currentTime,
            playbackState: this.playbackState,
        };
    }

    // ── Host transfer ────────────────────────────────────────────────────────────

    /**
     * Transfer host role from current host to targetUserId.
     * Updates in-memory participant roles, DB memberships, and room.hostId.
     * @param {string} currentHostId
     * @param {string} targetUserId
     */
    async transferHost(currentHostId, targetUserId) {
        // Update in-memory roles
        const currentHost = this.participants.get(currentHostId);
        const newHost = this.participants.get(targetUserId);

        if (currentHost) currentHost.setRole("participant");
        if (newHost) newHost.setRole("host");

        // Persist to DB
        await RoomMember.findOneAndUpdate(
            { roomId: this.roomId, userId: currentHostId },
            { role: "participant" }
        );
        await RoomMember.findOneAndUpdate(
            { roomId: this.roomId, userId: targetUserId },
            { role: "host" }
        );
        await Room.findByIdAndUpdate(this.roomId, { hostId: targetUserId });

        this.hostId = targetUserId;
    }

    // ── Broadcast helpers ────────────────────────────────────────────────────────

    /** Emit an event to every socket in this room (including sender). */
    broadcast(event, payload) {
        this.io.to(this.roomId).emit(event, payload);
    }

    /** Emit to everyone in the room EXCEPT the given socket. */
    broadcastExcept(socketId, event, payload) {
        this.io.to(this.roomId).except(socketId).emit(event, payload);
    }

    // ── Redis cache ──────────────────────────────────────────────────────────────

    async _cacheState() {
        try {
            const redis = getRedisClient();
            const key = `room:${this.roomId}:state`;
            await redis.setex(
                key,
                ROOM_CACHE_TTL,
                JSON.stringify(this.videoStateSnapshot())
            );
        } catch (err) {
            // Non-fatal — DB is source of truth
            console.warn("[RoomManager] Redis cache write failed:", err.message);
        }
    }

    /**
     * Try to load state from Redis cache first, fall back to DB.
     * @param {string} roomId
     * @returns {Promise<{videoId,currentTime,playbackState}|null>}
     */
    static async loadState(roomId) {
        try {
            const redis = getRedisClient();
            const cached = await redis.get(`room:${roomId}:state`);
            if (cached) return JSON.parse(cached);
        } catch (_) { /* ignore */ }

        const room = await Room.findById(roomId);
        if (!room) return null;
        return {
            videoId: room.youtubeVideoId,
            currentTime: room.currentTime,
            playbackState: room.playbackState,
        };
    }
}
