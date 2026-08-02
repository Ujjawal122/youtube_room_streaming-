import mongoose from "mongoose";

const messageSchema = mongoose.Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId, // fixed: was String
            ref: "Room",
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId, // fixed: was String
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
    },
    { timestamps: true }
);

// Index for efficient chat history fetching per room
messageSchema.index({ roomId: 1, createdAt: -1 });

const RoomChat = mongoose.model("RoomChat", messageSchema);
export default RoomChat;
