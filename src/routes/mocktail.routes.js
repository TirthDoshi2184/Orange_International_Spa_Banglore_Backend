import { Router } from "express";
import { getMocktails, createMocktail, updateMocktail , deleteMocktail, getAllMocktailsAdmin, getMenuCategories, createMocktailsBulk} from "../controllers/mocktail.controller.js";
import { protectAdmin } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { bulkCreateMocktailSchema, createMocktailSchema, updateMocktailSchema } from "../schemas/mocktails.schema.js";

const router = Router();

router.get("/mocktails/categories", getMenuCategories);
router.get("/mocktails", getMocktails);
router.post("/admin/mocktails", protectAdmin, validate(createMocktailSchema), createMocktail);
router.post(
  "/admin/mocktails/bulk",
  protectAdmin,
  validate(bulkCreateMocktailSchema),
  createMocktailsBulk
);
router.put("/admin/mocktails/:id", protectAdmin, validate(updateMocktailSchema), updateMocktail);
router.delete("/admin/mocktails/:id", protectAdmin, deleteMocktail);
router.get("/admin/mocktails", protectAdmin, getAllMocktailsAdmin);
export default router;
