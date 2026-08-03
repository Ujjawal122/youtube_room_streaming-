import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getSocket } from "../lib/socket";
import { useAuth } from "./AuthContext";

const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
    const { user } = useAuth();

    const [room, setRoom] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [myRole, setMyRole] = useState(null);
    const [videoState, setVideoState] = useState({
        videoId: "",
        currentTime: 0,
        playbackState: "paused",
    });
    const [messages, setMessages] = useState([]);
    const [reactions, setReactions] = useState([]);

    // ── Sync guard ──────────────────────────────────────────────────────────────
    // Set to true while we're applying a remote sync_state so the player
    // doesn't echo it back.  Cleared after the player effects settle (500ms).
    const applyingRemote = useRef(false);

    const socket = getSocket();

    // ── Incoming socket events ──────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        // Full room state on join
        const onRoomState = (data) => {
            setRoom({
                roomId: data.roomId,
                roomCode: data.roomCode,
                name: data.name,
                hostId: data.hostId,
            });
            setMyRole(data.myRole);
            setParticipants(data.participants || []);
            // Treat initial state as remote-applied so we don't echo it
            applyingRemote.current = true;
            setVideoState({
                videoId: data.videoId || "",
                currentTime: data.currentTime ?? 0,
                playbackState: data.playbackState || "paused",
            });
            setTimeout(() => { applyingRemote.current = false; }, 600);
        };

        // Incremental sync from any host/mod action
        const onSyncState = (data) => {
            applyingRemote.current = true;
            setVideoState((prev) => ({
                // Always carry forward all three fields — never leave one undefined
                videoId: data.videoId !== undefined ? data.videoId : prev.videoId,
                currentTime: data.currentTime !== undefined ? data.currentTime : prev.currentTime,
                playbackState: data.playbackState !== undefined ? data.playbackState : prev.playbackState,
            }));
            // Give the player effects enough time to apply before clearing the guard
            setTimeout(() => { applyingRemote.current = false; }, 600);
        };

        const onUserJoined = ({ participants }) => setParticipants(participants);
        const onUserLeft = ({ participants }) => setParticipants(participants);
        const onParticipantRemoved = ({ participants }) => setParticipants(participants);

        const onRoleAssigned = ({ participants, userId, role }) => {
            setParticipants(participants);
            if (userId === user?._id) setMyRole(role);
        };

        const onHostTransferred = ({ participants, newHostId }) => {
            setParticipants(participants);
            setRoom((r) => r ? { ...r, hostId: newHostId } : r);
            if (newHostId === user?._id) setMyRole("host");
        };

        const onNewChatMessage = (msg) => setMessages((prev) => {
            if (prev.some(m => m._id === msg._id)) return prev;
            return [...prev, msg];
        });

        const onNewReaction = (reaction) => {
            const id = Date.now();
            setReactions((prev) => [...prev, { ...reaction, id }]);
            setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3000);
        };

        socket.on("room_state", onRoomState);
        socket.on("sync_state", onSyncState);
        socket.on("user_joined", onUserJoined);
        socket.on("user_left", onUserLeft);
        socket.on("role_assigned", onRoleAssigned);
        socket.on("host_transferred", onHostTransferred);
        socket.on("participant_removed", onParticipantRemoved);
        socket.on("new_chat_message", onNewChatMessage);
        socket.on("new_reaction", onNewReaction);

        return () => {
            socket.off("room_state", onRoomState);
            socket.off("sync_state", onSyncState);
            socket.off("user_joined", onUserJoined);
            socket.off("user_left", onUserLeft);
            socket.off("role_assigned", onRoleAssigned);
            socket.off("host_transferred", onHostTransferred);
            socket.off("participant_removed", onParticipantRemoved);
            socket.off("new_chat_message", onNewChatMessage);
            socket.off("new_reaction", onNewReaction);
        };
    }, [socket, user]);

    // ── Emitters ────────────────────────────────────────────────────────────────
    const joinRoom = useCallback((roomCode) =>
        socket.emit("join_room", { roomCode }), [socket]);

    const leaveRoom = useCallback(() => {
        if (room) {
            socket.emit("leave_room", { roomId: room.roomId });
            setRoom(null);
            setMessages([]);
            setParticipants([]);
        }
    }, [socket, room]);

    // Only emit if this is NOT a remote-triggered state change
    const emitPlay = useCallback(() => {
        if (applyingRemote.current) return;
        socket.emit("play", { roomId: room?.roomId });
    }, [socket, room]);

    const emitPause = useCallback(() => {
        if (applyingRemote.current) return;
        socket.emit("pause", { roomId: room?.roomId });
    }, [socket, room]);

    const emitSeek = useCallback((time) => {
        if (applyingRemote.current) return;
        socket.emit("seek", { roomId: room?.roomId, time });
    }, [socket, room]);

    const emitChangeVideo = useCallback((videoId) =>
        socket.emit("change_video", { roomId: room?.roomId, videoId }), [socket, room]);

    const emitAssignRole = useCallback((targetUserId, role) =>
        socket.emit("assign_role", { roomId: room?.roomId, targetUserId, role }), [socket, room]);

    const emitRemove = useCallback((targetUserId) =>
        socket.emit("remove_participant", { roomId: room?.roomId, targetUserId }), [socket, room]);

    const emitTransferHost = useCallback((targetUserId) =>
        socket.emit("transfer_host", { roomId: room?.roomId, targetUserId }), [socket, room]);

    const emitSendChat = useCallback((message) =>
        socket.emit("send_chat", { roomId: room?.roomId, message }), [socket, room]);

    const emitReaction = useCallback((emoji) =>
        socket.emit("send_reaction", { roomId: room?.roomId, emoji }), [socket, room]);

    const prependMessages = useCallback((msgs) => {
        setMessages((prev) => {
            const existingIds = new Set(prev.map(m => m._id));
            const newMsgs = msgs.filter(m => !existingIds.has(m._id));
            return [...newMsgs, ...prev];
        });
    }, []);

    return (
        <RoomContext.Provider value={{
            room, participants, myRole, videoState, messages, reactions,
            applyingRemote,
            joinRoom, leaveRoom,
            emitPlay, emitPause, emitSeek, emitChangeVideo,
            emitAssignRole, emitRemove, emitTransferHost,
            emitSendChat, emitReaction,
            prependMessages,
        }}>
            {children}
        </RoomContext.Provider>
    );
};

export const useRoom = () => useContext(RoomContext);
