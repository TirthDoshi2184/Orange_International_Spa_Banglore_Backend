import { Router } from "express";
import { getRevenueTrend, getPopularServicesReport, getPeakHoursReport } from "../controllers/report.controller.js";
import { protectAdmin } from "../middlewares/auth.js";

const router = Router();
router.get("/admin/reports/revenue-trend", protectAdmin, getRevenueTrend);
router.get("/admin/reports/popular-services", protectAdmin, getPopularServicesReport);
router.get("/admin/reports/peak-hours", protectAdmin, getPeakHoursReport);
export default router;