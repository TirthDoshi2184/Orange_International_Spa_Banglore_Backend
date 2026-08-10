import { Router } from "express";
import { z } from "zod";
import { getAddonOrders, updateAddonOrderStatus } from "../controllers/addon.controller.js";
import { protectAdmin } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";

const router = Router();
const statusSchema = z.object({ status: z.enum(["pending", "preparing", "delivered"]) });

router.get("/admin/addon-orders", protectAdmin, getAddonOrders);
router.patch("/admin/addon-orders/:id/status", protectAdmin, validate(statusSchema), updateAddonOrderStatus);

export default router;