import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { sendMail, templates } from "@/lib/mailer";

const createSchema = z.object({
  laundryId: z.string(),
  services: z.array(z.string()).min(1),
  pickupAddress: z.string().min(3),
  notes: z.string().optional(),
});

async function nextOrderSerial() {
  const count = await Booking.countDocuments();
  return `SLS-${String(count + 1).padStart(5, "0")}`;
}

// Customer creates a booking (Common Workflow: Service booking)
export async function POST(req: NextRequest) {
  const session = getCurrentUser();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Only customers can book a service" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();

  const laundry = await User.findOne({ _id: parsed.data.laundryId, role: "laundry" });
  if (!laundry) {
    return NextResponse.json({ error: "Laundry not found" }, { status: 404 });
  }

  const isVipOrder = laundry.vipEnabled && laundry.vipCustomerIds?.some((id: any) => id.toString() === session.userId);

  const booking = await Booking.create({
    orderSerial: await nextOrderSerial(),
    customerId: session.userId,
    laundryId: laundry._id,
    services: parsed.data.services,
    pickupAddress: parsed.data.pickupAddress,
    notes: parsed.data.notes,
    isVipOrder,
  });

  const t = templates.bookingCreated(session.name, booking.orderSerial);
  void sendMail(session.email, t.subject, t.html);

  return NextResponse.json({ booking }, { status: 201 });
}

// List bookings relevant to the logged-in user (any role)
export async function GET() {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  const filter =
    session.role === "customer"
      ? { customerId: session.userId }
      : session.role === "laundry"
      ? { laundryId: session.userId }
      : { deliveryManId: session.userId };

  const bookings = await Booking.find(filter)
    .populate("customerId", "name phone location")
    .populate("laundryId", "name laundryName location")
    .populate("deliveryManId", "name phone")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ bookings });
}
