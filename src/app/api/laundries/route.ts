import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

/**
 * Common Workflow — "search for Local Laundry".
 *
 * Two independent filters, both text-based (no GPS/geolocation):
 *  - `q`    matches the laundry's NAME only.
 *  - `area` matches the laundry's LOCATION text only, and is meant to be
 *           driven by the dropdown from GET /api/laundries/areas so
 *           customers pick from areas that actually exist in the data
 *           instead of hoping their typed spelling matches.
 * Both can be combined (AND). Results whose area matches exactly are
 * ranked above partial matches, then by online status and rating —
 * this is the "nearby" experience without needing device location.
 */
export async function GET(req: NextRequest) {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const area = req.nextUrl.searchParams.get("area")?.trim();
  const onlineOnly = req.nextUrl.searchParams.get("onlineOnly") === "true";

  await dbConnect();
  const filter: any = { role: "laundry" };
  if (onlineOnly) filter.isOnline = true;
  if (q) filter.laundryName = { $regex: q, $options: "i" };
  if (area) filter.location = { $regex: area, $options: "i" };

  const laundries = await User.find(filter)
    .select("name laundryName location isOnline servicesOffered ratingAvg ratingCount vipEnabled vipFee vipCustomerIds")
    .lean();

  const areaLower = area?.toLowerCase();
  const withRank = laundries.map((l) => {
    const isVipCustomer =
      session.role === "customer" &&
      !!l.vipCustomerIds?.some((id: any) => id.toString() === session.userId);
    const exactAreaMatch = areaLower ? l.location?.toLowerCase().trim() === areaLower : false;
    const { vipCustomerIds, ...rest } = l as any;
    return { ...rest, isVipCustomer, _exactAreaMatch: exactAreaMatch };
  });

  withRank.sort((a, b) => {
    if (a._exactAreaMatch !== b._exactAreaMatch) return a._exactAreaMatch ? -1 : 1;
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
  });

  const results = withRank.map(({ _exactAreaMatch, ...rest }) => rest);

  return NextResponse.json({ laundries: results });
}