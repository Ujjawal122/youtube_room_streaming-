import { Router } from "express";
import {
    createRoom,
    getRoomByCode,
    getMyRooms,
    closeRoom,
} from "../controllers/roomController.js";
import protect from "../middleware/auth.js";

const router = Router();

router.post("/create", protect, createRoom);
router.get("/my-rooms", protect, getMyRooms);
router.get("/:roomCode", protect, getRoomByCode);
router.delete("/:roomCode", protect, closeRoom);

export default router;
