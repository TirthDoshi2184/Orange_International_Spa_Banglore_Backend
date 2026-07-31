import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const email = process.env.SEED_ADMIN_EMAIL || "admin@orangespa.com";
  const plainPassword = process.env.SEED_ADMIN_PASSWORD || "changeme123";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);
  await User.create({ name: "Orange Spa Admin", email, passwordHash, role: "admin" });

  console.log("Admin created:", email, "— password:", plainPassword);
  process.exit(0);
};

run().catch((err) => { console.error(err); process.exit(1); });