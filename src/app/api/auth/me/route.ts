import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function GET() {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  await dbConnect();
  const user = await User.findById(session.userId).select("-passwordHash").lean();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({ user });
}
