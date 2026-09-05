import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { sendMail, templates } from "@/lib/mailer";

/**
 * Module 1 — Job Feed and Appointment:
 * "Laundry User can appoint a delivery-man for his laundry center growth."
 *
 * Two things happen here:
 * 1. General appointment: assign a delivery-man to this laundry center
 *    (assignedLaundryId), independent of any single order.
 * 2. Per-job appointment: assign that delivery-man to a specific open
 *    booking picked from the job feed.
 */
export async function POST(req: NextRequest) {
  const session = getCurrentUser();
  if (!session || session.role !== "laundry") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { deliveryManId, bookingId } = await req.json();
  if (!deliveryManId) {
    return NextResponse.json({ error: "deliveryManId is required" }, { status: 400 });
  }

  await dbConnect();

  const deliveryMan = await User.findOne({ _id: deliveryManId, role: "delivery" });
  if (!deliveryMan) {
    return NextResponse.json({ error: "Delivery-man not found" }, { status: 404 });
  }

  // 1. General appointment to this laundry center
  deliveryMan.assignedLaundryId = session.userId as any;
  await deliveryMan.save();

  // 2. Optional: assign to a specific job from the job feed
  let booking = null;
  if (bookingId) {
    booking = await Booking.findOneAndUpdate(
      { _id: bookingId, laundryId: session.userId },
      { deliveryManId },
      { new: true }
    ).populate("customerId", "name email");

    if (booking) {
      const customer = booking.customerId as any;
      const t = templates.bookingStatus(customer.name, booking.orderSerial, "Delivery-man assigned");
      void sendMail(customer.email, t.subject, t.html);
    }
  }

  return NextResponse.json({ deliveryMan, booking });
}
