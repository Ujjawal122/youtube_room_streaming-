import Redis from "ioredis";


let pubClient = null;
let subClient = null;

export const createRedisClients = () => {
    const url = process.env.REDIS_URL;

    if (!url) {
        throw new Error("REDIS_URL is not defined in .env");
    }

    pubClient = new Redis(url, {
        maxRetriesPerRequest: null, 
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


export const getRedisClient = () => {
    if (!pubClient) throw new Error("Redis not initialised — call createRedisClients() first");
    return pubClient;
};
