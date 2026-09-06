import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

/**
 * Module 1 — Job Feed:
 * "Only Laundry User can see the job feeds where he can choose the
 * best delivery boy for the delivery job."
 *
 * Returns: this laundry's accepted-but-unassigned bookings (the "jobs"
 * that need a delivery-man) plus the pool of verified, available
 * delivery-men to choose from.
 */
export async function GET() {
  const session = getCurrentUser();
  if (!session || session.role !== "laundry") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const openJobs = await Booking.find({
    laundryId: session.userId,
    status: "accepted",
    deliveryManId: null,
  })
    .populate("customerId", "name phone location")
    .sort({ createdAt: 1 })
    .lean();

  const availableDeliveryMen = await User.find({
    role: "delivery",
    verified: true,
  })
    .select("name phone location isOnline ratingAvg ratingCount assignedLaundryId")
    .lean();

  return NextResponse.json({ openJobs, availableDeliveryMen });
}
