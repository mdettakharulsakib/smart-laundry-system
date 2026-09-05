/**
 * Quick demo-data seeder.
 * Run with: npm run seed   (requires MONGODB_URI in .env.local)
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI in .env.local first");
  await mongoose.connect(uri);

  await User.deleteMany({ email: { $in: ["customer@demo.com", "laundry@demo.com", "delivery@demo.com"] } });

  const passwordHash = await bcrypt.hash("password123", 10);

  await User.create([
    {
      name: "Demo Customer",
      email: "customer@demo.com",
      phone: "0170000001",
      location: "Gulshan, Dhaka",
      role: "customer",
      passwordHash,
    },
    {
      name: "Demo Laundry Owner",
      laundryName: "CleanWave Laundry",
      email: "laundry@demo.com",
      phone: "0170000002",
      location: "Banani, Dhaka",
      role: "laundry",
      isOnline: true,
      servicesOffered: ["Washing", "Ironing"],
      passwordHash,
    },
    {
      name: "Demo Delivery Man",
      email: "delivery@demo.com",
      phone: "0170000003",
      location: "Mohakhali, Dhaka",
      role: "delivery",
      verified: true,
      passwordHash,
    },
  ]);

  console.log("Seeded demo accounts (password: password123):");
  console.log(" - customer@demo.com");
  console.log(" - laundry@demo.com");
  console.log(" - delivery@demo.com");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
