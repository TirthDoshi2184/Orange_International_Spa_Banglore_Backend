import { Router } from "express";
import {
  getPackages, createPackage, updatePackage,
  createMembership, rechargeMembershipHandler,
  searchMembership, getMembershipDetail, getMembershipByCustomer,
} from "../controllers/membership.controller.js";
import { protectAdmin } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createPackageSchema, updatePackageSchema,
  enrollMembershipSchema, rechargeSchema, adjustSchema,
} from "../schemas/membership.schemas.js";

const router = Router();

router.get("/admin/membership-packages", protectAdmin, getPackages);
router.post("/admin/membership-packages", protectAdmin, validate(createPackageSchema), createPackage);
router.put("/admin/membership-packages/:id", protectAdmin, validate(updatePackageSchema), updatePackage);

router.post("/admin/memberships", protectAdmin, validate(enrollMembershipSchema), createMembership);
router.get("/admin/memberships/search", protectAdmin, searchMembership);
router.get("/admin/memberships/:id", protectAdmin, getMembershipDetail);
router.post("/admin/memberships/:id/recharge", protectAdmin, validate(rechargeSchema), rechargeMembershipHandler);

router.get("/admin/customers/:customerId/membership", protectAdmin, getMembershipByCustomer);

export default router;