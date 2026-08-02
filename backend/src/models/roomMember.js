import mongoose from "mongoose";

const roomMemberSchema = mongoose.Schema(  // fixed: was "rommMemberSchema"
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId, // fixed: was String
            ref: "Room",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId, // fixed: was String
            ref: "User",
            required: true,
        },
        role: {
            type: String,
            enum: ["host", "moderator", "participant", "viewer"],
            default: "participant", // fixed: was "viewer" — joiners should default to participant
        },
    },
    { timestamps: true } // createdAt serves as joinedAt; removed redundant joinedAt field
);

// Prevent duplicate memberships (one user per room)
roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

const RoomMember = mongoose.model("RoomMember", roomMemberSchema);
export default RoomMember;
