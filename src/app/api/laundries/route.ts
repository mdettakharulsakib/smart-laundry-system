import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

/**
 * Common Workflow — "search for Local Laundry".
 * Any logged-in user can browse; results can be filtered by location text
 * and by online-only (Module 1: a customer needs the laundry to be online
 * to start a direct chat).
 */
export async function GET(req: NextRequest) {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const onlineOnly = req.nextUrl.searchParams.get("onlineOnly") === "true";

  await dbConnect();
  const filter: any = { role: "laundry" };
  if (onlineOnly) filter.isOnline = true;
  if (q) {
    filter.$or = [
      { laundryName: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } },
    ];
  }

  const laundries = await User.find(filter)
    .select("name laundryName location isOnline servicesOffered ratingAvg ratingCount vipEnabled")
    .sort({ isOnline: -1, ratingAvg: -1 })
    .lean();

  return NextResponse.json({ laundries });
}
