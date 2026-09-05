import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

/**
 * Module — VIP membership (Laundry side).
 * A Laundry turns the VIP program on/off and sets the one-time
 * membership fee that customers pay through the mock payment gateway
 * (see api/laundry/vip/subscribe).
 */
export async function GET() {
  const session = getCurrentUser();
  if (!session || session.role !== "laundry") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  const user = await User.findById(session.userId).select("vipEnabled vipFee vipCustomerIds");
  return NextResponse.json({
    vipEnabled: user?.vipEnabled ?? false,
    vipFee: user?.vipFee ?? 199,
    vipCustomerCount: user?.vipCustomerIds?.length ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const session = getCurrentUser();
  if (!session || session.role !== "laundry") {
    return NextResponse.json({ error: "Only laundry accounts can manage VIP settings" }, { status: 403 });
  }

  const { vipEnabled, vipFee } = await req.json();

  const update: Record<string, unknown> = {};
  if (typeof vipEnabled === "boolean") update.vipEnabled = vipEnabled;
  if (typeof vipFee === "number") {
    if (vipFee < 0) return NextResponse.json({ error: "vipFee cannot be negative" }, { status: 400 });
    update.vipFee = vipFee;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(session.userId, update, { new: true }).select(
    "vipEnabled vipFee vipCustomerIds"
  );

  return NextResponse.json({
    vipEnabled: user?.vipEnabled ?? false,
    vipFee: user?.vipFee ?? 199,
    vipCustomerCount: user?.vipCustomerIds?.length ?? 0,
  });
}