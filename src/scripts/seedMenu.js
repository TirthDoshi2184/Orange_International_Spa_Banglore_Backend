import "dotenv/config";
import mongoose from "mongoose";
import Mocktail from "../models/Mocktail.js";

// Full confirmed F&B menu — doubled prices (final, as approved by the client).
// image left blank for every item — photos are being sourced separately and
// can be filled in later via the admin Menu manager without re-running this script.
const MENU_ITEMS = [
  // Fresh Juice
  { category: "Fresh Juice", name: "Fresh Lime", price: 60 },
  { category: "Fresh Juice", name: "Jaljeera", price: 80 },
  { category: "Fresh Juice", name: "Lime Soda", price: 80 },
  { category: "Fresh Juice", name: "Water Melon", price: 100 },
  { category: "Fresh Juice", name: "Mosambi", price: 80 },
  { category: "Fresh Juice", name: "Pineapple", price: 100 },
  { category: "Fresh Juice", name: "Orange / Grape", price: 100 },
  { category: "Fresh Juice", name: "Pomegranate", price: 140 },
  { category: "Fresh Juice", name: "Mint Lime", price: 100 },

  // Boba Mojitos
  { category: "Boba Mojitos", name: "Mango Boba", price: 180 },
  { category: "Boba Mojitos", name: "Strawberry Boba", price: 180 },
  { category: "Boba Mojitos", name: "Blue Berry Boba", price: 180 },
  { category: "Boba Mojitos", name: "Passion Fruit Boba", price: 180 },

  // Crushed Ice Lemonade
  { category: "Crushed Ice Lemonade", name: "Blue Lime", price: 120 },
  { category: "Crushed Ice Lemonade", name: "Strawberry Lime", price: 140 },
  { category: "Crushed Ice Lemonade", name: "Blue Berry Lime", price: 140 },

  // Thick Shakes
  { category: "Thick Shakes", name: "Chikoo", price: 100 },
  { category: "Thick Shakes", name: "Banana", price: 100 },
  { category: "Thick Shakes", name: "Musk Melon", price: 100 },
  { category: "Thick Shakes", name: "Apple", price: 120 },
  { category: "Thick Shakes", name: "Pista Banana", price: 120 },
  { category: "Thick Shakes", name: "Strawberry Banana", price: 120 },
  { category: "Thick Shakes", name: "Mango Shake", price: 140 },
  { category: "Thick Shakes", name: "Berry Strawberry", price: 120 },
  { category: "Thick Shakes", name: "Kesar Pista", price: 120 },
  { category: "Thick Shakes", name: "Tender Coconut", price: 140 },
  { category: "Thick Shakes", name: "Mango Strawberry", price: 140 },
  { category: "Thick Shakes", name: "Blue Berry", price: 160 },
  { category: "Thick Shakes", name: "Butter Fruit", price: 160 },
  { category: "Thick Shakes", name: "Anjeer Shake", price: 160 },
  { category: "Thick Shakes", name: "Mix Dry Fruit", price: 180 },
  { category: "Thick Shakes", name: "Lychee & Mango", price: 200 },

  // Elite Special Juices
  { category: "Elite Special Juices", name: "Ginger Punch", price: 100 },
  { category: "Elite Special Juices", name: "Tropical Burst", price: 100 },
  { category: "Elite Special Juices", name: "Pineapple Delight", price: 100 },
  { category: "Elite Special Juices", name: "Melon Madness", price: 100 },

  // Fries
  { category: "Fries", name: "Salted Fries", price: 160 },
  { category: "Fries", name: "Peri Peri Fries", price: 160 },
  { category: "Fries", name: "Cheese Fries", price: 180 },
  { category: "Fries", name: "Veg Nuggets", price: 200 },
  { category: "Fries", name: "Chicken Nuggets", price: 180 },

  // Burger
  { category: "Burger", name: "Classic Cheese Burger", price: 140 },
  { category: "Burger", name: "Paneer Cheese Burger", price: 180 },
  { category: "Burger", name: "Chicken Burger", price: 200 },

  // Sandwich
  { category: "Sandwich", name: "Veg Cheese Sandwich", price: 140 },
  { category: "Sandwich", name: "Paneer Cheese Sandwich", price: 180 },
  { category: "Sandwich", name: "Nutella Sandwich", price: 200 },

  // Gym Freaks
  { category: "Gym Freaks", name: "Peanut Banana", price: 140 },
  { category: "Gym Freaks", name: "Banana Caramel", price: 140 },
  { category: "Gym Freaks", name: "Banana Coffee", price: 160 },
  { category: "Gym Freaks", name: "Natural", price: 180 },
  { category: "Gym Freaks", name: "Whey Protein", price: 200 },

  // Lassi
  { category: "Lassi", name: "Sweet Lassi", price: 100 },
  { category: "Lassi", name: "Mango Lassi", price: 120 },
  { category: "Lassi", name: "Fruit Lassi", price: 120 },
  { category: "Lassi", name: "Strawberry Lassi", price: 140 },
  { category: "Lassi", name: "Blueberry Lassi", price: 160 },
  { category: "Lassi", name: "Dry Fruit Lassi", price: 160 },
  { category: "Lassi", name: "Special Lassi", price: 160 },

  // Falooda
  { category: "Falooda", name: "Rose Milk / Body Cooler", price: 120 },
  { category: "Falooda", name: "Classic Falooda", price: 160 },
  { category: "Falooda", name: "Kesar Falooda", price: 200 },
  { category: "Falooda", name: "Kulfi Falooda", price: 200 },
  { category: "Falooda", name: "Royal Falooda", price: 240 },
  { category: "Falooda", name: "Rabdi Falooda", price: 240 },

  // Kulfi
  { category: "Kulfi", name: "Pista / Badam", price: 80 },
  { category: "Kulfi", name: "Mango / Black Current", price: 80 },
  { category: "Kulfi", name: "Chocolate / Malai", price: 80 },
  { category: "Kulfi", name: "Lychee", price: 80 },

  // Ice Cream Sundaes
  { category: "Ice Cream Sundaes", name: "Fruit Salad Ice Cream", price: 140 },
  { category: "Ice Cream Sundaes", name: "Chocolate Fudge", price: 160 },
  { category: "Ice Cream Sundaes", name: "Brownie Fudge", price: 180 },
  { category: "Ice Cream Sundaes", name: "Gud-Bud", price: 200 },
  { category: "Ice Cream Sundaes", name: "Banana Split", price: 240 },
  { category: "Ice Cream Sundaes", name: "Caramel Mocha Fudge", price: 240 },
  { category: "Ice Cream Sundaes", name: "Peanut Brownie", price: 240 },
  { category: "Ice Cream Sundaes", name: "Cookies & Cream", price: 240 },
  { category: "Ice Cream Sundaes", name: "Mango Fudge", price: 240 },
  { category: "Ice Cream Sundaes", name: "Death By Chocolate (DBC)", price: 260 },
  { category: "Ice Cream Sundaes", name: "Dry Fruit Sundae", price: 280 },
  { category: "Ice Cream Sundaes", name: "Lychee Ice-Cream", price: 260 },
  { category: "Ice Cream Sundaes", name: "Mini Sizzler", price: 200 },
  { category: "Ice Cream Sundaes", name: "Double Ice", price: 240 },
  { category: "Ice Cream Sundaes", name: "Triple Ice", price: 280 },

  // Nutella & Hazelnut
  { category: "Nutella & Hazelnut", name: "Nutella Fudge", price: 260 },
  { category: "Nutella & Hazelnut", name: "Nutella Brownie", price: 280 },
  { category: "Nutella & Hazelnut", name: "Nutella Banana", price: 280 },
  { category: "Nutella & Hazelnut", name: "Nutella Lychee", price: 280 },

  // Chocolate Based Shakes
  { category: "Chocolate Based Shakes", name: "Banana Bonkers", price: 100 },
  { category: "Chocolate Based Shakes", name: "Belgian Chocolate", price: 140 },
  { category: "Chocolate Based Shakes", name: "Ferrero Automatic", price: 140 },
  { category: "Chocolate Based Shakes", name: "Oreo Shake", price: 140 },
  { category: "Chocolate Based Shakes", name: "Dark Chocolate", price: 140 },
  { category: "Chocolate Based Shakes", name: "Caramel Chocolate", price: 160 },
  { category: "Chocolate Based Shakes", name: "Peanut Chocolate", price: 140 },
  { category: "Chocolate Based Shakes", name: "Kit-Kat Shake", price: 160 },
  { category: "Chocolate Based Shakes", name: "Brownie Shake", price: 180 },
  { category: "Chocolate Based Shakes", name: "Nutella Shake", price: 200 },
  { category: "Chocolate Based Shakes", name: "Belgian Chips", price: 220 },
  { category: "Chocolate Based Shakes", name: "Mississippi Mud", price: 240 },
  { category: "Chocolate Based Shakes", name: "Nutella Mud", price: 240 },

  // Cold Coffee
  { category: "Cold Coffee", name: "Hard Rock", price: 140 },
  { category: "Cold Coffee", name: "Chocolate Coffee", price: 160 },
  { category: "Cold Coffee", name: "Caramel Coffee", price: 160 },
  { category: "Cold Coffee", name: "Ferrero Coffee", price: 160 },
  { category: "Cold Coffee", name: "Nutella Coffee", price: 180 },
  { category: "Cold Coffee", name: "Mud Coffee", price: 220 },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  let created = 0;
  let skipped = 0;

  for (const item of MENU_ITEMS) {
    // Match on name+category so re-running the script is safe (no duplicates)
    const existing = await Mocktail.findOne({ name: item.name, category: item.category });
    if (existing) {
      skipped++;
      continue;
    }
    await Mocktail.create({ ...item, isAvailable: true });
    created++;
  }

  console.log(`Menu seed complete — ${created} items created, ${skipped} already existed (skipped).`);
  console.log(`Total items defined: ${MENU_ITEMS.length}`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
