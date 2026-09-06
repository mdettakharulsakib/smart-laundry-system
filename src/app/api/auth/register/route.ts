import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { signToken, AUTH_COOKIE } from "@/lib/auth";
import { sendMail, templates } from "@/lib/mailer";

const baseSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  password: z.string().min(6),
  location: z.string().min(2),
  role: z.enum(["customer", "laundry", "delivery"]),
  // Laundry-only, required when role === "laundry"
  laundryName: z.string().optional(),
  servicesOffered: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = baseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    if (data.role === "laundry" && !data.laundryName) {
      return NextResponse.json(
        { error: "laundryName is required for laundry accounts" },
        { status: 400 }
      );
    }

    await dbConnect();

    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      location: data.location,
      role: data.role,
      passwordHash,
      laundryName: data.laundryName,
      servicesOffered: data.servicesOffered ?? ["Washing", "Ironing"],
      // Auto-verify delivery-men on signup: there's no admin review screen
      // in this project yet, so leaving `verified: false` (the schema
      // default) would mean no delivery-man could ever be appointed to a
      // job. If an admin-verification flow is added later, remove this.
      verified: data.role === "delivery" ? true : undefined,
    });

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

    const t = templates.welcome(user.name);
    void sendMail(user.email, t.subject, t.html);

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
