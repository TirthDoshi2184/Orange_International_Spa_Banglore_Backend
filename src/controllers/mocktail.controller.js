import Mocktail, { MENU_CATEGORIES } from "../models/Mocktail.js";

export const getMocktails = async (req, res) => {
  const filter = { isAvailable: true };
  if (req.query.category) filter.category = req.query.category;
  const mocktails = await Mocktail.find(filter).sort({ category: 1, name: 1 });
  res.json({ success: true, data: mocktails });
};

// GET /api/mocktails/categories — ordered category list, used to build
// tabs/accordions on the customer catalogue, cart, add-on, and reception pages
export const getMenuCategories = async (req, res) => {
  res.json({ success: true, data: MENU_CATEGORIES });
};

export const createMocktail = async (req, res) => {
  const mocktail = await Mocktail.create(req.body);
  res.status(201).json({ success: true, data: mocktail });
};

export const createMocktailsBulk = async (req, res, next) => {
  try {
    const mocktails = await Mocktail.insertMany(req.body, { ordered: false });
    res.status(201).json({ success: true, count: mocktails.length, data: mocktails });
  } catch (err) {
    if (err.name === "MongoBulkWriteError") {
      return res.status(207).json({
        success: false,
        message: "Some items failed to insert",
        inserted: err.result?.insertedCount ?? 0,
        writeErrors: err.writeErrors?.map(e => ({ index: e.index, error: e.errmsg })),
      });
    }
    next(err);
  }
};

export const updateMocktail = async (req, res) => {
  const mocktail = await Mocktail.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!mocktail) return res.status(404).json({ success: false, message: "Mocktail not found" });
  res.json({ success: true, data: mocktail });
};

export const deleteMocktail = async (req, res) => {
  await Mocktail.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Mocktail deleted" });
};

export const getAllMocktailsAdmin = async (req, res, next) => {
  try {
    const filter = {}; // no isAvailable filter — admin sees everything
    if (req.query.category) filter.category = req.query.category;
    const mocktails = await Mocktail.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, data: mocktails });
  } catch (err) { next(err); }
};

