import { Router } from "express";
import { loginAdmin, createAdmin, getMe, getAllAdmins } from "../controllers/user.controller.js";
import { protectAdmin } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createAdminSchema, loginSchema } from "../schemas/auth.schemas.js";

const router = Router();
router.post("/auth/admin/login", validate(loginSchema), loginAdmin);
router.post("/admin/users", protectAdmin, validate(createAdminSchema), createAdmin);

router.get("/admin/users/me", protectAdmin, getMe);
router.get("/admin/users", protectAdmin, getAllAdmins);

export default router;