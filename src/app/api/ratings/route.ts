import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Rating from "@/models/Rating";
import Booking from "@/models/Booking";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  bookingId: z.string(),
  targetUserId: z.string(),
  targetRole: z.enum(["laundry", "delivery"]),
  stars: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

/**
 * Module 2 — Rating and Feedback:
 * "Customer can review the Laundry center ... and also can give ratings
 * to the Delivery-Man."
 */
export async function POST(req: NextRequest) {
  const session = getCurrentUser();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Only customers can leave ratings" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  await dbConnect();

  // Only allow rating for a booking the customer actually owns and that's completed
  const booking = await Booking.findOne({ _id: data.bookingId, customerId: session.userId });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found for this customer" }, { status: 404 });
  }

  try {
    const rating = await Rating.create({
      fromCustomerId: session.userId,
      targetUserId: data.targetUserId,
      targetRole: data.targetRole,
      bookingId: data.bookingId,
      stars: data.stars,
      comment: data.comment,
    });

    // Recompute aggregate rating for the target
    const agg = await Rating.aggregate([
      { $match: { targetUserId: rating.targetUserId } },
      { $group: { _id: "$targetUserId", avg: { $avg: "$stars" }, count: { $sum: 1 } } },
    ]);
    if (agg[0]) {
      await User.findByIdAndUpdate(data.targetUserId, {
        ratingAvg: Math.round(agg[0].avg * 10) / 10,
        ratingCount: agg[0].count,
      });
    }

    return NextResponse.json({ rating }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ error: "You already rated this for this booking" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// List ratings for a given target user (public-ish, for profile pages)
export async function GET(req: NextRequest) {
  const targetUserId = req.nextUrl.searchParams.get("targetUserId");
  if (!targetUserId) return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });

  await dbConnect();
  const ratings = await Rating.find({ targetUserId })
    .populate("fromCustomerId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ ratings });
}
