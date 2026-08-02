import Redis from "ioredis";

// ─── Two separate clients required by Socket.IO Redis Adapter ────────────────
// (pub and sub must be separate connections per ioredis docs)

let pubClient = null;
let subClient = null;

export const createRedisClients = () => {
    const url = process.env.REDIS_URL;

    if (!url) {
        throw new Error("REDIS_URL is not defined in .env");
    }

    pubClient = new Redis(url, {
        maxRetriesPerRequest: null, // required for blocking commands
        enableReadyCheck: false,
        lazyConnect: false,
    });

    subClient = pubClient.duplicate();

    pubClient.on("connect", () => console.log("[Redis] pub client connected"));
    pubClient.on("error", (err) => console.error("[Redis] pub error:", err.message));
    subClient.on("connect", () => console.log("[Redis] sub client connected"));
    subClient.on("error", (err) => console.error("[Redis] sub error:", err.message));

    return { pubClient, subClient };
};

/**
 * Get the pub client (general cache operations).
 * Call createRedisClients() in server.js before using this.
 */
export const getRedisClient = () => {
    if (!pubClient) throw new Error("Redis not initialised — call createRedisClients() first");
    return pubClient;
};
