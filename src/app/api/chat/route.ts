import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

/**
 * Module 2 — Chat-Box:
 * "Customers can chat with Laundry User or Delivery-man or make a
 * group discussion with them at a time."
 */

// List all conversations the current user is part of
export async function GET() {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const conversations = await Conversation.find({ participants: session.userId })
    .populate("participants", "name role laundryName")
    .sort({ lastMessageAt: -1 })
    .lean();

  return NextResponse.json({ conversations });
}

// Start (or reuse) a conversation — 1:1 or group
export async function POST(req: NextRequest) {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { participantIds, bookingId, title } = await req.json();
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    return NextResponse.json({ error: "participantIds is required" }, { status: 400 });
  }

  await dbConnect();

  const allParticipants = Array.from(new Set([session.userId, ...participantIds])).sort();
  const isGroup = allParticipants.length > 2;

  // Reuse an existing 1:1 conversation between the exact same two people
  if (!isGroup) {
    const existing = await Conversation.findOne({
      isGroup: false,
      participants: { $all: allParticipants, $size: allParticipants.length },
    });
    if (existing) return NextResponse.json({ conversation: existing });
  }

  // Module 1: "a customer needs the laundry to be online to start a
  // direct chat" — the Browse tab already disables the Chat button for
  // offline laundries, but that's only a UI nicety; enforce it here too
  // so the rule holds even if this endpoint is called directly. Only
  // gates brand-new customer -> laundry conversations (handled above),
  // not group chats or continuing an existing thread.
  if (session.role === "customer" && !isGroup) {
    const otherId = allParticipants.find((id) => id !== session.userId);
    const other = await User.findById(otherId).select("role isOnline");
    if (other?.role === "laundry" && !other.isOnline) {
      return NextResponse.json({ error: "This laundry is currently offline" }, { status: 403 });
    }
  }

  const conversation = await Conversation.create({
    participants: allParticipants,
    isGroup,
    bookingId: bookingId ?? null,
    title: title ?? (isGroup ? "Group discussion" : undefined),
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
