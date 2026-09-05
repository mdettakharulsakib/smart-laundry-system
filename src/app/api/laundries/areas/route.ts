import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

/**
 * Distinct list of laundry locations, for the "Nearby" area dropdown in
 * CustomerDashboard. Purely text-based (no GPS): this just lists every
 * area/city string that at least one laundry has registered, so a
 * customer can filter by an area guaranteed to have a match instead of
 * free-typing and hoping their spelling lines up.
 */
export async function GET() {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const locations: string[] = await User.distinct("location", { role: "laundry" });

  const areas = locations
    .map((l) => l?.trim())
    .filter((l): l is string => !!l)
    .sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ areas });
}