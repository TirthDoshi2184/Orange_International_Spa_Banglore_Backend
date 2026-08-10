import mongoose from "mongoose";

// Full F&B menu categories — "Mocktail" was originally drinks-only, now covers
// the whole menu (juices, shakes, food, desserts, etc). Kept the model/collection
// name "Mocktail" as-is to avoid a breaking rename across Booking refs, add-on
// flow, and existing data — category is what actually distinguishes items now.
export const MENU_CATEGORIES = [
  "Fresh Juice",
  "Boba Mojitos",
  "Crushed Ice Lemonade",
  "Thick Shakes",
  "Elite Special Juices",
  "Fries",
  "Burger",
  "Sandwich",
  "Gym Freaks",
  "Lassi",
  "Falooda",
  "Kulfi",
  "Ice Cream Sundaes",
  "Nutella & Hazelnut",
  "Chocolate Based Shakes",
  "Cold Coffee",
];

const mocktailSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    name_kn: { type: String, default: "" },
    category: { type: String, enum: MENU_CATEGORIES, required: true },
    category_kn: { type: String, default: "" }, // display label only — filtering/queries stay on `category`
    description: { type: String },
    description_kn: { type: String, default: "" },
    ingredients: [{ type: String }],
    ingredients_kn: [{ type: String }],
    image: { type: String },
    price: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

mocktailSchema.index({ category: 1 });

export default mongoose.model("Mocktail", mocktailSchema);