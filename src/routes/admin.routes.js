import { Router } from "express";
import { getDashboardStats, triggerDayEndCleanup } from "../controllers/admin.controller.js";
import { protectAdmin } from "../middlewares/auth.js";

const router = Router();
router.get("/admin/dashboard/stats", protectAdmin, getDashboardStats);
router.post("/admin/day-end-cleanup", protectAdmin, triggerDayEndCleanup);
export default router;