import "dotenv/config";
import { connectDB } from "../config/db.js";
import MembershipPackage from "../models/MembershipPackage.js";

const packages = [
  { name: "Silver", price: 20000, creditAmount: 25000, sortOrder: 1 },
  { name: "Gold", price: 30000, creditAmount: 40000, sortOrder: 2 },
  { name: "Platinum", price: 50000, creditAmount: 75000, sortOrder: 3 },
];

const run = async () => {
  await connectDB();
  for (const pkg of packages) {
    await MembershipPackage.findOneAndUpdate({ name: pkg.name }, pkg, {
      upsert: true,
    });
  }
  console.log("Membership packages seeded.");
  process.exit(0);
};

run();
