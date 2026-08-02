/**
 * Participant
 * Represents a single connected user inside a room.
 * Holds identity, role, and socket reference — no DB logic here.
 */
export class Participant {
    /**
     * @param {object} opts
     * @param {string} opts.userId
     * @param {string} opts.username
     * @param {string} opts.role        - host | moderator | participant | viewer
     * @param {string} opts.socketId
     */
    constructor({ userId, username, role, socketId }) {
        this.userId = userId;
        this.username = username;
        this.role = role;
        this.socketId = socketId;
        this.joinedAt = new Date();
    }

    // ── Role checks ─────────────────────────────────────────────────────────────

    isHost() { return this.role === "host"; }
    isModerator() { return this.role === "moderator"; }

    /** True for host or moderator — can control playback */
    canControl() { return this.isHost() || this.isModerator(); }

    // ── Mutations ────────────────────────────────────────────────────────────────

    /** @param {string} newRole */
    setRole(newRole) {
        const VALID = ["host", "moderator", "participant", "viewer"];
        if (!VALID.includes(newRole)) throw new Error(`Invalid role: ${newRole}`);
        this.role = newRole;
    }

    // ── Serialisation ────────────────────────────────────────────────────────────

    /** Safe public shape sent to clients */
    toJSON() {
        return {
            userId: this.userId,
            username: this.username,
            role: this.role,
            online: true,           // if a Participant object exists the user is online
        };
    }
}
