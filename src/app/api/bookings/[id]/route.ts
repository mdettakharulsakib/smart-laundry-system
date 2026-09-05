import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import { getCurrentUser } from "@/lib/auth";
import { sendMail, templates } from "@/lib/mailer";

const ALLOWED_STATUS = [
  "accepted",
  "rejected",
  "picked_up",
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
];

/**
 * Laundry manages incoming booked services: approve, cancel, reschedule.
 * (Common Workflow, "Laundry ... manage incoming booked service from Customer")
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await dbConnect();

  const booking = await Booking.findById(params.id).populate("customerId", "name email");
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const isOwningLaundry = session.role === "laundry" && booking.laundryId.toString() === session.userId;
  const isAssignedDelivery =
    session.role === "delivery" && booking.deliveryManId?.toString() === session.userId;
  const isOwningCustomer = session.role === "customer" && booking.customerId._id.toString() === session.userId;

  if (!isOwningLaundry && !isAssignedDelivery && !isOwningCustomer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.status) {
    if (!ALLOWED_STATUS.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    booking.status = body.status;
  }
  if (body.expectedReturnDate) {
    booking.expectedReturnDate = new Date(body.expectedReturnDate); // reschedule
  }

  await booking.save();

  const customer = booking.customerId as any;
  const t = templates.bookingStatus(customer.name, booking.orderSerial, booking.status);
  void sendMail(customer.email, t.subject, t.html);

  return NextResponse.json({ booking });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const booking = await Booking.findById(params.id)
    .populate("customerId", "name phone location")
    .populate("laundryId", "name laundryName location")
    .populate("deliveryManId", "name phone")
    .lean();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ booking });
}
