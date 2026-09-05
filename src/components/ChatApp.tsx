"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Conversation = {
  _id: string;
  isGroup: boolean;
  title?: string;
  participants: { _id: string; name: string; role: string }[];
  lastMessageAt: string;
};

type Message = {
  _id: string;
  text: string;
  senderId: { _id: string; name: string; role: string };
  createdAt: string;
};

/**
 * Module 2 — Chat-Box.
 * Polls the active conversation every 3s for new messages, which is a
 * simple, dependency-free way to get near-real-time chat without adding
 * a websocket server (see README for swapping in Pusher/Ably later).
 */
export default function ChatApp({ currentUserId }: { currentUserId?: string }) {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(searchParams.get("conversationId"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    const res = await fetch("/api/chat");
    const data = await res.json();
    setConversations(data.conversations ?? []);
    if (!activeId && data.conversations?.[0]) setActiveId(data.conversations[0]._id);
  }

  async function loadMessages(conversationId: string) {
    const res = await fetch(`/api/chat/${conversationId}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    const interval = setInterval(() => loadMessages(activeId), 3000);
    return () => clearInterval(interval);
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || !activeId) return;
    const draft = text;
    setText("");
    await fetch(`/api/chat/${activeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft }),
    });
    loadMessages(activeId);
  }

  return (
    <main className="mx-auto grid h-[calc(100vh-73px)] max-w-6xl grid-cols-[280px_1fr] px-6 py-6">
      <aside className="border-r border-line pr-4">
        <h2 className="font-display text-lg font-bold text-ink">Conversations</h2>
        <div className="mt-3 space-y-1.5">
          {conversations.map((c) => {
            const others = c.participants.filter((p) => p._id !== currentUserId);
            const label = c.isGroup ? c.title || "Group discussion" : others[0]?.name ?? "Conversation";
            return (
              <button
                key={c._id}
                onClick={() => setActiveId(c._id)}
                className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  activeId === c._id ? "bg-teal-600 text-white" : "text-ink/70 hover:bg-white"
                }`}
              >
                {label}
                {c.isGroup && <span className="ml-1.5 text-xs opacity-70">(group)</span>}
              </button>
            );
          })}
          {conversations.length === 0 && <p className="px-3 text-sm text-ink/45">No conversations yet.</p>}
        </div>
      </aside>

      <section className="flex flex-col pl-6">
        {activeId ? (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {messages.map((m) => {
                const mine = m.senderId?._id === currentUserId;
                return (
                  <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                        mine ? "bg-teal-600 text-white" : "bg-white text-ink border border-line"
                      }`}
                    >
                      {!mine && <p className="mb-0.5 text-[11px] font-semibold opacity-60">{m.senderId?.name}</p>}
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="flex gap-2 border-t border-line pt-4">
              <input
                className="input"
                placeholder="Type a message…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="btn-primary !px-5" onClick={send}>
                Send
              </button>
            </div>
          </>
        ) : (
          <p className="mt-10 text-center text-sm text-ink/50">
            Select a conversation, or start one from a laundry's profile.
          </p>
        )}
      </section>
    </main>
  );
}
