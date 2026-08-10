
import "dotenv/config";
import Mocktail from "../models/Mocktail.js";
import { connectDB } from "../config/db.js";
import mongoose from "mongoose";

const categoryMap = {
  "Fresh Juice": "ತಾಜಾ ಜ್ಯೂಸ್",
  "Boba Mojitos": "ಬೋಬಾ ಮೊಜಿಟೊ",
  "Crushed Ice Lemonade": "ಕ್ರಶ್ಡ್ ಐಸ್ ಲೆಮನೇಡ್",
  "Thick Shakes": "ಥಿಕ್ ಶೇಕ್",
  "Elite Special Juices": "ಎಲೈಟ್ ಸ್ಪೆಷಲ್ ಜ್ಯೂಸ್",
  "Fries": "ಫ್ರೈಸ್",
  "Burger": "ಬರ್ಗರ್",
  "Sandwich": "ಸ್ಯಾಂಡ್‌ವಿಚ್",
  "Gym Freaks": "ಜಿಮ್ ಫ್ರೀಕ್ಸ್",
  "Lassi": "ಲಸ್ಸಿ",
  "Falooda": "ಫಲೂದಾ",
  "Kulfi": "ಕುಲ್ಫಿ",
  "Ice Cream Sundaes": "ಐಸ್ ಕ್ರೀಂ ಸಂಡೇ",
  "Nutella & Hazelnut": "ನುಟೆಲ್ಲಾ & ಹೇಜಲ್‌ನಟ್",
  "Chocolate Based Shakes": "ಚಾಕಲೇಟ್ ಶೇಕ್",
  "Cold Coffee": "ಕೋಲ್ಡ್ ಕಾಫಿ",
};

async function backfill() {
  try {
    // Connect using your existing database configuration
    await connectDB();
    console.log("Database:", mongoose.connection.name);

    console.log("Starting category_kn migration...\n");

    for (const [en, kn] of Object.entries(categoryMap)) {
  const result = await Mocktail.updateMany(
    { category: en },
    { $set: { category_kn: kn } }
  );

  console.log({
    category: en,
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
}
    console.log("\n✅ Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:");
    console.error(error);
    process.exit(1);
  }
}

backfill();