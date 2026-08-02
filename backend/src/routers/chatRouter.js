import { Router } from "express";
import { getChatHistory } from "../controllers/chatController.js";
import protect from "../middleware/auth.js";

const router = Router();

router.get("/:roomCode", protect, getChatHistory);

export default router;
