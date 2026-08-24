import { Router } from "express";
import {
  getServices, getServiceById, createService, updateService, deleteService,
  addDuration, updateDuration, deleteDuration,
  getAllServicesAdmin,
  bulkCreateServices,
} from "../controllers/service.controller.js";
import { protectAdmin } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createServiceSchema, updateServiceSchema } from "../schemas/service.schemas.js";

const router = Router();

router.get("/services", getServices);
router.get("/services/:id", getServiceById);
router.post("/admin/services", protectAdmin, validate(createServiceSchema), createService);
router.put("/admin/services/:id", protectAdmin, validate(updateServiceSchema), updateService);
// service.routes.js — add this line near the other admin routes
router.post("/admin/services/bulk", protectAdmin, bulkCreateServices);
router.delete("/admin/services/:id", protectAdmin, deleteService);

router.post("/admin/services/:serviceId/durations", protectAdmin, addDuration);
router.put("/admin/durations/:id", protectAdmin, updateDuration);
router.delete("/admin/durations/:id", protectAdmin, deleteDuration);
router.get("/admin/services", protectAdmin, getAllServicesAdmin); // new route for admin to get all services with durations

export default router;