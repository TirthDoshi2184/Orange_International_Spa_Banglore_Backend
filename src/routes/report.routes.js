import { Router } from "express";
import { getRevenueTrend, getPopularServicesReport, getPeakHoursReport, getMembershipReport } from "../controllers/report.controller.js";
import { protectAdmin } from "../middlewares/auth.js";

const router = Router();
router.get("/admin/reports/revenue-trend", protectAdmin, getRevenueTrend);
router.get("/admin/reports/popular-services", protectAdmin, getPopularServicesReport);
router.get("/admin/reports/peak-hours", protectAdmin, getPeakHoursReport);
router.get("/admin/reports/membership-overview", protectAdmin, getMembershipReport);
export default router;