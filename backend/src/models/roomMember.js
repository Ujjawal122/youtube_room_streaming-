import mongoose from "mongoose";

const roomMemberSchema = mongoose.Schema( 
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User",
            required: true,
        },
        role: {
            type: String,
            enum: ["host", "moderator", "participant", "viewer"],
            default: "participant", 
        },
    },
    { timestamps: true } 
);

roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

const RoomMember = mongoose.model("RoomMember", roomMemberSchema);
export default RoomMember;
