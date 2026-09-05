import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

/**
 * Module 2 — "If necessary they can add the Laundry Center and
 * delivery-man in their favourite lists."
 */
export async function POST(req: NextRequest) {
  const session = getCurrentUser();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Only customers have favorites" }, { status: 403 });
  }

  const { targetUserId, targetRole, action } = await req.json();
  if (!["laundry", "delivery"].includes(targetRole) || !["add", "remove"].includes(action)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();
  const field = targetRole === "laundry" ? "favorites.laundries" : "favorites.deliveryMen";
  const update =
    action === "add" ? { $addToSet: { [field]: targetUserId } } : { $pull: { [field]: targetUserId } };

  const user = await User.findByIdAndUpdate(session.userId, update, { new: true }).select("favorites");
  return NextResponse.json({ favorites: user?.favorites });
}

export async function GET() {
  const session = getCurrentUser();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const user = await User.findById(session.userId)
    .populate("favorites.laundries", "name laundryName location ratingAvg isOnline")
    .populate("favorites.deliveryMen", "name phone ratingAvg")
    .select("favorites");

  return NextResponse.json({ favorites: user?.favorites });
}
