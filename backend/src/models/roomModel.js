import mongoose from "mongoose";

const roomSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        roomCode: {
            type: String,
            required: true,
            unique: true,
        },
        hostId: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User",
            required: true,
        },
        youtubeVideoId: {
            type: String,
            default: "",                           
        },
        currentTime: {
            type: Number,
            default: 0,
        },
        playbackState: {
            type: String,
            enum: ["playing", "paused"],
            default: "paused",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);
export default Room;
