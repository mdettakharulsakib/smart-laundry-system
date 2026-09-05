import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { getCurrentUser } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";

/**
 * VIP membership — MOCK payment gateway.
 *
 * There is no real merchant account wired in here on purpose: a live
 * gateway (Stripe / SSLCommerz / bKash, etc.) needs its own signup and
 * API keys outside this project. This route simulates the same
 * request/response shape a real one would have — validate card-shaped
 * input, "charge" it, write a Payment record, then unlock VIP — so the
 * front-end and data model don't need to change when a real gateway is
 * dropped in later.
 *
 * Card numbers are validated for shape only (Luhn check) and are NEVER
 * persisted — only a card brand guess + last 4 digits are kept, purely
 * for the on-screen receipt.
 */
const subscribeSchema = z.object({
  laundryId: z.string(),
  cardNumber: z.string().min(12).max(19),
  cardName: z.string().min(2),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry must be MM/YY"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3-4 digits"),
});

function luhnCheck(num: string) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = parseInt(num[i], 10);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function guessBrand(num: string) {
  if (/^4/.test(num)) return "Visa";
  if (/^5[1-5]/.test(num)) return "Mastercard";
  if (/^3[47]/.test(num)) return "Amex";
  return "Card";
}

function isExpired(expiry: string) {
  const [mm, yy] = expiry.split("/").map(Number);
  const expiryDate = new Date(2000 + yy, mm); // first day of the month AFTER expiry
  return expiryDate <= new Date();
}

export async function POST(req: NextRequest) {
  const session = getCurrentUser();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Only customers can subscribe to VIP" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { laundryId, cardNumber, expiry, cvv } = parsed.data;
  const digitsOnly = cardNumber.replace(/\s+/g, "");

  await dbConnect();

  const laundry = await User.findOne({ _id: laundryId, role: "laundry" });
  if (!laundry) return NextResponse.json({ error: "Laundry not found" }, { status: 404 });
  if (!laundry.vipEnabled) {
    return NextResponse.json({ error: "This laundry does not offer VIP membership" }, { status: 400 });
  }
  const alreadyVip = laundry.vipCustomerIds?.some((id: any) => id.toString() === session.userId);
  if (alreadyVip) {
    return NextResponse.json({ error: "You're already a VIP member here" }, { status: 400 });
  }

  // --- Mock gateway "processing" ---
  // Card-shape validation only. No card data is stored beyond brand + last 4.
  if (!/^\d{12,19}$/.test(digitsOnly) || !luhnCheck(digitsOnly)) {
    return NextResponse.json({ error: "Card declined — invalid card number" }, { status: 402 });
  }
  if (isExpired(expiry)) {
    return NextResponse.json({ error: "Card declined — card has expired" }, { status: 402 });
  }
  if (cvv === "000") {
    // Convenience "always decline" test value for demoing the failure path.
    return NextResponse.json({ error: "Card declined by issuing bank" }, { status: 402 });
  }

  const amount = laundry.vipFee ?? 199;
  const transactionId = `MOCKPAY-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const payment = await Payment.create({
    transactionId,
    customerId: session.userId,
    laundryId: laundry._id,
    purpose: "vip_membership",
    amount,
    currency: "BDT",
    status: "succeeded",
    method: "mock_card",
    cardBrand: guessBrand(digitsOnly),
    cardLast4: digitsOnly.slice(-4),
  });

  laundry.vipCustomerIds = laundry.vipCustomerIds || [];
  laundry.vipCustomerIds.push(session.userId as any);
  await laundry.save();

  const t = {
    subject: `VIP membership activated — ${laundry.laundryName || laundry.name}`,
    html: `<p>Hi ${session.name},</p><p>Your payment of ${amount} BDT (txn ${transactionId}) was successful. You're now a VIP member at <b>${
      laundry.laundryName || laundry.name
    }</b> — enjoy priority service on your next bookings there.</p>`,
  };
  void sendMail(session.email, t.subject, t.html);

  return NextResponse.json({
    payment: {
      transactionId: payment.transactionId,
      amount: payment.amount,
      currency: payment.currency,
      cardBrand: payment.cardBrand,
      cardLast4: payment.cardLast4,
      createdAt: payment.createdAt,
    },
  });
}

/** Payment history for the logged-in customer (their VIP membership receipts). */
export async function GET() {
  const session = getCurrentUser();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  const payments = await Payment.find({ customerId: session.userId })
    .populate("laundryId", "name laundryName")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ payments });
}