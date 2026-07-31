import { Router } from "express";
import { getAllCoupons, createCouponManual } from "../controllers/coupon.controller.js";
import { protectAdmin } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createCouponSchema } from "../schemas/coupon.schemas.js";

const router = Router();
router.get("/admin/coupons", protectAdmin, getAllCoupons);
router.post("/admin/coupons", protectAdmin, validate(createCouponSchema), createCouponManual);
export default router;