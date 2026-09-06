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

  // 2. Optional: assign to a specific job from the job feed.
  // Moves the booking to "assigned" — offered to the delivery-man but not
  // yet accepted by them. The delivery-man must explicitly accept (or
  // decline, which unassigns and drops it back to "accepted" for the
  // laundry to re-offer) before it can move on to "picked_up".
  let booking = null;
  if (bookingId) {
    booking = await Booking.findOneAndUpdate(
      { _id: bookingId, laundryId: session.userId, status: "accepted", deliveryManId: null },
      { deliveryManId, status: "assigned" },
      { new: true }
    ).populate("customerId", "name email");

    if (!booking) {
      return NextResponse.json(
        { error: "This job is no longer open (it may already be assigned)." },
        { status: 409 }
      );
    }

    const customer = booking.customerId as any;
    const t = templates.bookingStatus(customer.name, booking.orderSerial, "Delivery-man assigned — awaiting their acceptance");
    void sendMail(customer.email, t.subject, t.html);

    // The delivery-man is the one who actually needs to act here — tell
    // them directly, since nothing else in the UI pings them in real time.
    const jobOfferMail = templates.deliveryJobOffered(deliveryMan.name, booking.orderSerial);
    void sendMail(deliveryMan.email, jobOfferMail.subject, jobOfferMail.html);
  }

  return NextResponse.json({ deliveryMan, booking });
}
