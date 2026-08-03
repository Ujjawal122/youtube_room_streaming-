import Room from "../../models/roomModel.js";
import RoomMember from "../../models/roomMember.js";
import RoomChat from "../../models/roomChat.js";
import { RoomManager } from "./RoomManager.js";
import { Participant } from "./Participant.js";


const VALID_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];


export class MessageHandler {
  
    constructor(socket, io, rooms) {
        this.socket = socket;
        this.io = io;
        this.rooms = rooms;
        this.user = socket.user; 
    }

   
    register() {
        const s = this.socket;

        s.on("join_room", (data) => this._onJoinRoom(data));
        s.on("leave_room", (data) => this._onLeaveRoom(data));
        s.on("play", (data) => this._onPlay(data));
        s.on("pause", (data) => this._onPause(data));
        s.on("seek", (data) => this._onSeek(data));
        s.on("change_video", (data) => this._onChangeVideo(data));
        s.on("assign_role", (data) => this._onAssignRole(data));
        s.on("remove_participant", (data) => this._onRemoveParticipant(data));
        s.on("transfer_host", (data) => this._onTransferHost(data));
        s.on("send_chat", (data) => this._onSendChat(data));
        s.on("send_reaction", (data) => this._onSendReaction(data));
        s.on("request_control", (data) => this._onRequestControl(data));
        s.on("disconnect", () => this._onDisconnect());
    }


    _emit(event, payload) {
        this.socket.emit(event, payload);
    }

    _error(message) {
        this.socket.emit("error", { message });
    }

    _userId() { return this.user._id.toString(); }
    _username() { return this.user.username; }

   
    _getRoom(roomId) {
        return this.rooms.get(roomId) || null;
    }

   
    _getSelfParticipant(room) {
        const p = room.getParticipant(this._userId());
        if (!p) { this._error("You are not in this room"); return null; }
        return p;
    }

   

    async _onJoinRoom({ roomCode }) {
        try {
            if (!roomCode) return this._error("roomCode is required");

            const room = await Room.findOne({
                roomCode: roomCode.toUpperCase(),
                isActive: true,
            });
            if (!room) return this._error("Room not found");

            const roomId = room._id.toString();

            let membership = await RoomMember.findOne({
                roomId: room._id,
                userId: this.user._id,
            });
            if (!membership) {
                membership = await RoomMember.create({
                    roomId: room._id,
                    userId: this.user._id,
                    role: "participant",
                });
            }

       
            let mgr = this.rooms.get(roomId);
            if (!mgr) {
              
                const state = await RoomManager.loadState(roomId);
                mgr = new RoomManager({
                    roomId,
                    roomCode: room.roomCode,
                    name: room.name,
                    hostId: room.hostId.toString(),
                    videoId: state?.videoId || room.youtubeVideoId,
                    currentTime: state?.currentTime ?? room.currentTime,
                    playbackState: state?.playbackState || room.playbackState,
                    io: this.io,
                });
                this.rooms.set(roomId, mgr);
            }

           
            const participant = new Participant({
                userId: this._userId(),
                username: this._username(),
                role: membership.role,
                socketId: this.socket.id,
            });
            mgr.addParticipant(participant);

      
            this.socket.join(roomId);
            this.socket.currentRoomId = roomId;

            const participants = await mgr.buildParticipantList();

         
            this._emit("room_state", {
                roomId,
                roomCode: room.roomCode,
                name: room.name,
                hostId: mgr.hostId,
                myRole: membership.role,
                participants,
                ...mgr.videoStateSnapshot(),
            });

            mgr.broadcastExcept(this.socket.id, "user_joined", {
                userId: this._userId(),
                username: this._username(),
                role: membership.role,
                participants,
            });

            console.log(`[Socket] ${this._username()} joined room ${roomCode} as ${membership.role}`);
        } catch (err) {
            console.error("[join_room]", err.message);
            this._error("Failed to join room");
        }
    }

   
    async _onLeaveRoom({ roomId }) {
        await this._leaveRoom(roomId);
    }

    async _leaveRoom(roomId) {
        try {
            const mgr = this._getRoom(roomId);
            if (!mgr) return;

            this.socket.leave(roomId);
            mgr.removeParticipant(this._userId());

            const participants = await mgr.buildParticipantList();
            mgr.broadcast("user_left", {
                userId: this._userId(),
                username: this._username(),
                participants,
            });

       
            if (mgr.isEmpty()) this.rooms.delete(roomId);
        } catch (err) {
            console.error("[leaveRoom]", err.message);
        }
    }

   

    async _onPlay({ roomId }) {
        try {
            const mgr = this._getRoom(roomId); if (!mgr) return this._error("Room not found");
            const self = this._getSelfParticipant(mgr); if (!self) return;
            if (!self.canControl()) return this._error("Only host/moderator can control playback");

            await mgr.applyVideoState({ playbackState: "playing" });
         
            mgr.broadcast("sync_state", mgr.videoStateSnapshot());
        } catch (err) {
            this._error("Failed to broadcast play");
        }
    }

  

    async _onPause({ roomId }) {
        try {
            const mgr = this._getRoom(roomId); if (!mgr) return this._error("Room not found");
            const self = this._getSelfParticipant(mgr); if (!self) return;
            if (!self.canControl()) return this._error("Only host/moderator can control playback");

            await mgr.applyVideoState({ playbackState: "paused" });
            mgr.broadcast("sync_state", mgr.videoStateSnapshot());
        } catch (err) {
            this._error("Failed to broadcast pause");
        }
    }

 

    async _onSeek({ roomId, time }) {
        try {
            if (typeof time !== "number" || time < 0) return this._error("Invalid seek time");

            const mgr = this._getRoom(roomId); if (!mgr) return this._error("Room not found");
            const self = this._getSelfParticipant(mgr); if (!self) return;
            if (!self.canControl()) return this._error("Only host/moderator can seek");

            await mgr.applyVideoState({ currentTime: time });
            mgr.broadcast("sync_state", mgr.videoStateSnapshot());
        } catch (err) {
            this._error("Failed to broadcast seek");
        }
    }

   

    async _onChangeVideo({ roomId, videoId }) {
        try {
            if (!videoId) return this._error("videoId is required");

            const mgr = this._getRoom(roomId); if (!mgr) return this._error("Room not found");
            const self = this._getSelfParticipant(mgr); if (!self) return;
            if (!self.canControl()) return this._error("Only host/moderator can change video");

            await mgr.applyVideoState({ videoId, currentTime: 0, playbackState: "paused" });
            mgr.broadcast("sync_state", mgr.videoStateSnapshot());
        } catch (err) {
            this._error("Failed to change video");
        }
    }

   

    async _onAssignRole({ roomId, targetUserId, role }) {
        try {
            const ASSIGNABLE = ["moderator", "participant", "viewer"];
            if (!ASSIGNABLE.includes(role))
                return this._error(`Invalid role. Must be one of: ${ASSIGNABLE.join(", ")}`);

            const mgr = this._getRoom(roomId); if (!mgr) return this._error("Room not found");
            const self = this._getSelfParticipant(mgr); if (!self) return;
            if (!self.isHost()) return this._error("Only the host can assign roles");
            if (mgr.hostId === targetUserId) return this._error("Cannot change the host's role");

       
            const target = mgr.getParticipant(targetUserId);
            if (target) target.setRole(role);

            // Persist to DB
            const updated = await RoomMember.findOneAndUpdate(
                { roomId, userId: targetUserId },
                { role },
                { new: true }
            ).populate("userId", "username");

            if (!updated) return this._error("Target user is not in this room");

            const participants = await mgr.buildParticipantList();
            mgr.broadcast("role_assigned", {
                userId: targetUserId,
                username: updated.userId.username,
                role,
                participants,
            });
        } catch (err) {
            console.error("[assign_role]", err.message);
            this._error("Failed to assign role");
        }
    }


    async _onRemoveParticipant({ roomId, targetUserId }) {
        try {
            const mgr = this._getRoom(roomId); if (!mgr) return this._error("Room not found");
            const self = this._getSelfParticipant(mgr); if (!self) return;
            if (!self.isHost()) return this._error("Only the host can remove participants");
            if (mgr.hostId === targetUserId) return this._error("Cannot remove the host");

       
            const deleted = await RoomMember.findOneAndDelete({
                roomId,
                userId: targetUserId,
            }).populate("userId", "username");
            if (!deleted) return this._error("User is not in this room");

      
            const targetParticipant = mgr.getParticipant(targetUserId);
            if (targetParticipant) {
                const targetSocket = this.io.sockets.sockets.get(targetParticipant.socketId);
                if (targetSocket) {
                    targetSocket.emit("removed_from_room", {
                        message: "You have been removed by the host",
                    });
                    targetSocket.leave(roomId);
                }
                mgr.removeParticipant(targetUserId);
            }

            const participants = await mgr.buildParticipantList();
            mgr.broadcast("participant_removed", {
                userId: targetUserId,
                username: deleted.userId.username,
                participants,
            });
        } catch (err) {
            console.error("[remove_participant]", err.message);
            this._error("Failed to remove participant");
        }
    }

  
    async _onTransferHost({ roomId, targetUserId }) {
        try {
            const mgr = this._getRoom(roomId); if (!mgr) return this._error("Room not found");
            const self = this._getSelfParticipant(mgr); if (!self) return;
            if (!self.isHost()) return this._error("Only the current host can transfer host");

            const targetInDb = await RoomMember.findOne({ roomId, userId: targetUserId });
            if (!targetInDb) return this._error("Target user is not in this room");

            await mgr.transferHost(this._userId(), targetUserId);

            const updated = await RoomMember.findOne({ roomId, userId: targetUserId })
                .populate("userId", "username");

            const participants = await mgr.buildParticipantList();
            mgr.broadcast("host_transferred", {
                newHostId: targetUserId,
                newHostUsername: updated.userId.username,
                participants,
            });
        } catch (err) {
            console.error("[transfer_host]", err.message);
            this._error("Failed to transfer host");
        }
    }

    async _onSendChat({ roomId, message }) {
        try {
            if (!message || message.trim().length === 0)
                return this._error("Message cannot be empty");
            if (message.length > 500)
                return this._error("Message too long (max 500 chars)");

            const membership = await RoomMember.findOne({
                roomId,
                userId: this.user._id,
            });
            if (!membership) return this._error("You are not in this room");

            const saved = await RoomChat.create({
                roomId,
                senderId: this.user._id,
                message: message.trim(),
            });

            const mgr = this._getRoom(roomId);
            if (mgr) {
                mgr.broadcast("new_chat_message", {
                    _id: saved._id,
                    userId: this._userId(),
                    username: this._username(),
                    message: saved.message,
                    createdAt: saved.createdAt,
                });
            }
        } catch (err) {
            this._error("Failed to send message");
        }
    }

   

    async _onSendReaction({ roomId, emoji }) {
        try {
            if (!VALID_REACTIONS.includes(emoji))
                return this._error(`Invalid reaction. Allowed: ${VALID_REACTIONS.join(" ")}`);

            const mgr = this._getRoom(roomId);
            if (!mgr) return this._error("Room not found");

            const self = this._getSelfParticipant(mgr);
            if (!self) return;

            mgr.broadcast("new_reaction", {
                userId: this._userId(),
                username: this._username(),
                emoji,
                at: new Date().toISOString(),
            });
        } catch (err) {
            this._error("Failed to send reaction");
        }
    }

   

    async _onRequestControl({ roomId }) {
        try {
            const mgr = this._getRoom(roomId); if (!mgr) return this._error("Room not found");
            const self = this._getSelfParticipant(mgr); if (!self) return;

            if (self.canControl()) return; 
           
            mgr.broadcast("control_requested", {
                userId: this._userId(),
                username: this._username(),
            });
        } catch (err) {
            this._error("Failed to request control");
        }
    }

   
    async _onDisconnect() {
        console.log(`[Socket] Disconnected: ${this._username()} (${this.socket.id})`);
        if (this.socket.currentRoomId) {
            await this._leaveRoom(this.socket.currentRoomId);
        }
    }
}
