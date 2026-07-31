import { Router } from "express";
import { getRooms, createRoom, updateRoom, getRoomAvailability, deleteRoom } from "../controllers/room.controller.js";
import { protectAdmin } from "../middlewares/auth.js";

const router = Router();
router.get("/admin/rooms", protectAdmin, getRooms);
router.post("/admin/rooms", protectAdmin, createRoom);
router.put("/admin/rooms/:id", protectAdmin, updateRoom);
router.delete("/admin/rooms/:id", protectAdmin, deleteRoom); // Soft delete by setting isActive to false
// room.routes.js
router.get("/admin/rooms/availability", protectAdmin, getRoomAvailability);
export default router;