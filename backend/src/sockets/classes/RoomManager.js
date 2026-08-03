import Room from "../../models/roomModel.js";
import RoomMember from "../../models/roomMember.js";
import { getRedisClient } from "../../config/redis.js";
import { Participant } from "./Participant.js";


const ROOM_CACHE_TTL = 300;


export class RoomManager {

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

  
    addParticipant(participant) {
        this.participants.set(participant.userId, participant);
    }

    removeParticipant(userId) {
        this.participants.delete(userId);
    }

    getParticipant(userId) {
        return this.participants.get(userId);
    }

    isEmpty() {
        return this.participants.size === 0;
    }

    
    async buildParticipantList() {
        
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
                role: online ? online.role : m.role,  
                online: !!online,
            };
        });
    }

  
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

  
        await this._cacheState();
    }

  
    videoStateSnapshot() {
        return {
            videoId: this.videoId,
            currentTime: this.currentTime,
            playbackState: this.playbackState,
        };
    }

   
    async transferHost(currentHostId, targetUserId) {
      
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


    broadcast(event, payload) {
        this.io.to(this.roomId).emit(event, payload);
    }

    broadcastExcept(socketId, event, payload) {
        this.io.to(this.roomId).except(socketId).emit(event, payload);
    }



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
          
            console.warn("[RoomManager] Redis cache write failed:", err.message);
        }
    }

  
    static async loadState(roomId) {
        try {
            const redis = getRedisClient();
            const cached = await redis.get(`room:${roomId}:state`);
            if (cached) return JSON.parse(cached);
        } catch (_) {  }

        const room = await Room.findById(roomId);
        if (!room) return null;
        return {
            videoId: room.youtubeVideoId,
            currentTime: room.currentTime,
            playbackState: room.playbackState,
        };
    }
}
