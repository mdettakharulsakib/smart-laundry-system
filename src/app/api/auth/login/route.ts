import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { signToken, AUTH_COOKIE } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: parsed.data.email });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const res = NextResponse.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
