import { Router } from "express";
import { getAllCustomers, getCustomerProfile } from "../controllers/customer.controller.js";
import { protectAdmin } from "../middlewares/auth.js";

const router = Router();
router.get("/admin/customers", protectAdmin, getAllCustomers);
router.get("/admin/customers/:id", protectAdmin, getCustomerProfile);
export default router;