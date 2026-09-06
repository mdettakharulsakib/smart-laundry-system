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

// orderSerial has a unique index, but countDocuments()-based numbering has
// a race: two bookings created at nearly the same instant can both read
// the same count and collide on the same serial. Rather than let that
// surface as a raw 500, retry a few times with the next number along —
// collisions are rare and this keeps the human-readable SLS-00001 format.
async function createBookingWithSerial(payload: Record<string, unknown>, attempt = 0): Promise<any> {
  const count = await Booking.countDocuments();
  const orderSerial = `SLS-${String(count + 1 + attempt).padStart(5, "0")}`;
  try {
    return await Booking.create({ ...payload, orderSerial });
  } catch (err: any) {
    if (err.code === 11000 && attempt < 5) {
      return createBookingWithSerial(payload, attempt + 1);
    }
    throw err;
  }
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

  const booking = await createBookingWithSerial({
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
