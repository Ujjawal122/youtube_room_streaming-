import RoomChat from "../models/roomChat.js";
import Room from "../models/roomModel.js";
import RoomMember from "../models/roomMember.js";

export const getChatHistory = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const before = req.query.before;

        const room = await Room.findOne({ roomCode: roomCode.toUpperCase(), isActive: true });
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

    
        const membership = await RoomMember.findOne({
            roomId: room._id,
            userId: req.user._id,
        });
        if (!membership) {
            return res.status(403).json({ message: "You are not a member of this room" });
        }

        const query = { roomId: room._id };
        if (before) {
            query._id = { $lt: before };
        }

        const messages = await RoomChat.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("senderId", "username");

        return res.status(200).json(
            messages.reverse().map((m) => ({
                _id: m._id,
                message: m.message,
                sender: {
                    userId: m.senderId._id,
                    username: m.senderId.username,
                },
                createdAt: m.createdAt,
            }))
        );
    } catch (error) {
        console.error("Get chat history error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};
