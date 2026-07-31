import { z } from "zod";

// mocktail.schema.js
// Kept in sync with MENU_CATEGORIES in models/Mocktail.js — update both together.
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

export const createMocktailSchema = z.object({
  name: z.string().min(1),
  name_kn: z.string().optional(),
  category: z.enum(MENU_CATEGORIES),
  description: z.string().optional(),
  description_kn: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  ingredients_kn: z.array(z.string()).optional(),
  image: z.string().optional(),
  price: z.number().nonnegative(),
  isAvailable: z.boolean().optional(),
});
export const updateMocktailSchema = createMocktailSchema.partial();

export const bulkCreateMocktailSchema = z.array(createMocktailSchema).min(1).max(200);