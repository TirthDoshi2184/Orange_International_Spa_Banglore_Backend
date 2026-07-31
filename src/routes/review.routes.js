import { Router } from "express";
import { markReviewDone, verifyReview } from "../controllers/review.controller.js";
import { protectAdmin } from "../middlewares/auth.js";

const router = Router();

router.post("/reviews/mark-done", markReviewDone);
router.patch("/admin/reviews/:id/verify", protectAdmin, verifyReview);

export default router;
