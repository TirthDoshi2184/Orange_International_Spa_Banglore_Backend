import { Router } from "express";
import { getAvailableToday,updateTimeSlot,createTimeSlot, getAllTimeSlotsAdmin } from "../controllers/timeslot.controller.js";
import { protectAdmin } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createTimeSlotSchema, updateTimeSlotSchema } from "../schemas/timeslot.schemas.js";

const router = Router();

router.get("/timeslots/available", getAvailableToday);
router.post("/admin/timeslots", protectAdmin, validate(createTimeSlotSchema), createTimeSlot);
router.put("/admin/timeslots/:id", protectAdmin, validate(updateTimeSlotSchema), updateTimeSlot);

router.get("/admin/timeslots", protectAdmin, getAllTimeSlotsAdmin); // new route for admin to get all time slots
export default router;
