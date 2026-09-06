import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import { getCurrentUser } from "@/lib/auth";
import { sendMail, templates } from "@/lib/mailer";

const ALLOWED_STATUS = [
  "accepted",
  "assigned",
  "rejected",
  "picked_up",
  "in_progress",
  "ready",
  "delivered",
  "received",
  "cancelled",
];

// Which statuses each role is allowed to set. Prevents e.g. a customer
// marking their own booking "delivered", or a delivery-man "accepting"
// a booking that isn't theirs to approve.
//
// Full lifecycle: pending -> accepted (laundry approves) -> assigned
// (laundry appoints a delivery-man from the job feed, via /api/laundry/appoint)
// -> picked_up (delivery-man ACCEPTS the assignment and collects the dirty
// laundry — "accepted" is expressed as the jump straight to picked_up,
// since accepting and starting the job is one action) -> in_progress
// (dropped at the laundry / wash underway) -> ready (laundry finishes
// washing) -> delivered (delivery-man drops the order back at the
// customer) -> received (customer confirms they actually got it — this
// is what unlocks rating, and what moves the order into everyone's
// History tab).
//
// A delivery-man can also DECLINE an "assigned" job — that's expressed as
// setting status back to "accepted" (see the decline handling below,
// which also clears deliveryManId so the laundry can re-offer it).
const ROLE_ALLOWED_STATUS: Record<"laundry" | "delivery" | "customer", string[]> = {
  laundry: ["accepted", "rejected", "cancelled", "ready"],
  delivery: ["picked_up", "in_progress", "delivered", "accepted"],
  customer: ["cancelled", "received"],
};

// Which CURRENT status a booking must be in before it can move to a given
// next status — independent of who's asking. ROLE_ALLOWED_STATUS above
// only checks "is this role even allowed to set this status ever"; this
// map additionally stops nonsensical jumps like pending -> ready, or
// cancelling an order that's already been delivered.
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["cancelled"], // moving to "assigned" happens via /api/laundry/appoint, not here
  assigned: ["picked_up", "accepted", "cancelled"], // accept / decline / laundry cancels
  picked_up: ["in_progress", "cancelled"],
  in_progress: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: ["received"],
  received: [],
  rejected: [],
  cancelled: [],
};

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
    const allowedForRole = ROLE_ALLOWED_STATUS[session.role];
    if (!allowedForRole.includes(body.status)) {
      return NextResponse.json(
        { error: `${session.role} accounts cannot set status to "${body.status}"` },
        { status: 403 }
      );
    }
    // Customer can only confirm receipt once the delivery-man has actually
    // marked the order delivered — and more generally, every status change
    // must be a valid next step from wherever the booking currently is
    // (e.g. you can't cancel something already delivered, or mark "ready"
    // on an order that hasn't even been picked up yet).
    const allowedNext = VALID_TRANSITIONS[booking.status] ?? [];
    if (!allowedNext.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot change status from "${booking.status}" to "${body.status}"` },
        { status: 400 }
      );
    }
    // A delivery-man declining an offered job is expressed as sending an
    // "assigned" booking back to "accepted" — unassign them so the laundry
    // sees it as an open job again instead of silently keeping the
    // delivery-man attached to a job they turned down.
    if (session.role === "delivery" && body.status === "accepted") {
      booking.deliveryManId = null;
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
