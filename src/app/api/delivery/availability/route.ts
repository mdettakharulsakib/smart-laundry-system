import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

/**
 * A delivery-man switches Online/Offline, mirroring the laundry
 * availability toggle. Laundry centers use this status in their Job
 * Feed to know who's actually reachable right now before appointing them.
 */
export async function PATCH(req: NextRequest) {
  const session = getCurrentUser();
  if (!session || session.role !== "delivery") {
    return NextResponse.json({ error: "Only delivery accounts can change availability" }, { status: 403 });
  }

  const { isOnline } = await req.json();
  if (typeof isOnline !== "boolean") {
    return NextResponse.json({ error: "isOnline must be a boolean" }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(session.userId, { isOnline }, { new: true }).select("-passwordHash");

  return NextResponse.json({ user });
}

export async function GET() {
  const session = getCurrentUser();
  if (!session || session.role !== "delivery") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  const user = await User.findById(session.userId).select("isOnline");
  return NextResponse.json({ isOnline: user?.isOnline ?? false });
}
