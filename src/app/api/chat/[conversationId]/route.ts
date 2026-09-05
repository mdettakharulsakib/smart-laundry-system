import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { getCurrentUser } from "@/lib/auth";

async function assertParticipant(conversationId: string, userId: string) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) return null;
  const isParticipant = convo.participants.some((p) => p.toString() === userId);
  return isParticipant ? convo : null;
}

// Fetch messages (client can poll this endpoint, e.g. every 3s, for near-real-time chat)
export async function GET(_req: NextRequest, { params }: { params: { conversationId: string } }) {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const convo = await assertParticipant(params.conversationId, session.userId);
  if (!convo) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await Message.find({ conversationId: params.conversationId })
    .populate("senderId", "name role")
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({ messages });
}

// Send a message
export async function POST(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const session = getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }

  await dbConnect();
  const convo = await assertParticipant(params.conversationId, session.userId);
  if (!convo) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await Message.create({
    conversationId: params.conversationId,
    senderId: session.userId,
    text: text.trim(),
    readBy: [session.userId],
  });

  convo.lastMessageAt = new Date();
  await convo.save();

  return NextResponse.json({ message }, { status: 201 });
}
