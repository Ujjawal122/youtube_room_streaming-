import { nanoid } from "nanoid";
import Room from "../models/roomModel.js";
import RoomMember from "../models/roomMember.js";

// Generate a short unique room code
const generateRoomCode = () => nanoid(8).toUpperCase();

// POST /api/rooms/create
export const createRoom = async (req, res) => {
    try {
        const { name, youtubeVideoId } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Room name is required" });
        }

        // Ensure unique room code
        let roomCode;
        let exists = true;
        while (exists) {
            roomCode = generateRoomCode();
            exists = await Room.findOne({ roomCode });
        }

        const room = await Room.create({
            name,
            roomCode,
            hostId: req.user._id,
            youtubeVideoId: youtubeVideoId || "",
        });

        // Add host as a room member
        await RoomMember.create({
            roomId: room._id,
            userId: req.user._id,
            role: "host",
        });

        return res.status(201).json({
            _id: room._id,
            name: room.name,
            roomCode: room.roomCode,
            hostId: room.hostId,
            youtubeVideoId: room.youtubeVideoId,
            currentTime: room.currentTime,
            playbackState: room.playbackState,
        });
    } catch (error) {
        console.error("Create room error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/rooms/:roomCode
export const getRoomByCode = async (req, res) => {
    try {
        const { roomCode } = req.params;

        const room = await Room.findOne({ roomCode: roomCode.toUpperCase(), isActive: true });
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        // Get all members with their user info
        const members = await RoomMember.find({ roomId: room._id }).populate(
            "userId",
            "username email"
        );

        return res.status(200).json({
            _id: room._id,
            name: room.name,
            roomCode: room.roomCode,
            hostId: room.hostId,
            youtubeVideoId: room.youtubeVideoId,
            currentTime: room.currentTime,
            playbackState: room.playbackState,
            members: members.map((m) => ({
                userId: m.userId._id,
                username: m.userId.username,
                role: m.role,
                joinedAt: m.joinedAt,
            })),
        });
    } catch (error) {
        console.error("Get room error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/rooms/my-rooms
export const getMyRooms = async (req, res) => {
    try {
        const memberships = await RoomMember.find({ userId: req.user._id }).populate("roomId");

        const rooms = memberships
            .filter((m) => m.roomId && m.roomId.isActive)
            .map((m) => ({
                _id: m.roomId._id,
                name: m.roomId.name,
                roomCode: m.roomId.roomCode,
                role: m.role,
                hostId: m.roomId.hostId,
            }));

        return res.status(200).json(rooms);
    } catch (error) {
        console.error("Get my rooms error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};

// DELETE /api/rooms/:roomCode  (host only)
export const closeRoom = async (req, res) => {
    try {
        const { roomCode } = req.params;

        const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        if (room.hostId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the host can close the room" });
        }

        room.isActive = false;
        await room.save();

        return res.status(200).json({ message: "Room closed successfully" });
    } catch (error) {
        console.error("Close room error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};
