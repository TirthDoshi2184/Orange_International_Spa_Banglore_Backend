import { Router } from "express";
import { getDashboardStats } from "../controllers/admin.controller.js";
import { protectAdmin } from "../middlewares/auth.js";

const router = Router();
router.get("/admin/dashboard/stats", protectAdmin, getDashboardStats);
export default router;