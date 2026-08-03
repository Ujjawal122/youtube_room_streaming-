import mongoose from "mongoose";

const messageSchema = mongoose.Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Room",
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
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

messageSchema.index({ roomId: 1, createdAt: -1 });

const RoomChat = mongoose.model("RoomChat", messageSchema);
export default RoomChat;
