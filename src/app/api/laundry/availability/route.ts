import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

/**
 * Module 1 — Availability:
 * A Laundry user switches Online/Offline. Customers can only start a
 * direct chat / booking flow with a laundry that is currently online.
 */
export async function PATCH(req: NextRequest) {
  const session = getCurrentUser();
  if (!session || session.role !== "laundry") {
    return NextResponse.json({ error: "Only laundry accounts can change availability" }, { status: 403 });
  }

  const { isOnline } = await req.json();
  if (typeof isOnline !== "boolean") {
    return NextResponse.json({ error: "isOnline must be a boolean" }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(
    session.userId,
    { isOnline },
    { new: true }
  ).select("-passwordHash");

  return NextResponse.json({ user });
}

export async function GET() {
  const session = getCurrentUser();
  if (!session || session.role !== "laundry") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  const user = await User.findById(session.userId).select("isOnline");
  return NextResponse.json({ isOnline: user?.isOnline ?? false });
}
