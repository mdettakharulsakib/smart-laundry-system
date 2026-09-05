"use client";

import { useEffect, useState } from "react";

type Booking = {
  _id: string;
  orderSerial: string;
  status: string;
  pickupAddress: string;
  services: string[];
  customerId: { name: string; phone: string; location: string };
  laundryId: { name: string; laundryName?: string; location: string };
};

const NEXT_STATUS: Record<string, string | null> = {
  accepted: "picked_up",
  picked_up: "in_progress",
  in_progress: "ready",
  ready: "delivered",
};

export default function DeliveryDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  async function load() {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    setBookings(data.bookings ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function advance(bookingId: string, status: string) {
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-ink">Your deliveries</h1>
      <p className="mt-1 text-ink/60">Jobs assigned to you by laundry centers.</p>

      <section className="mt-6 space-y-3">
        {bookings.map((b) => {
          const next = NEXT_STATUS[b.status];
          return (
            <div key={b._id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display font-bold text-ink">#{b.orderSerial}</p>
                <p className="text-sm text-ink/60">
                  Pickup: {b.pickupAddress} · From: {b.laundryId?.laundryName || b.laundryId?.name}
                </p>
                <p className="text-xs text-ink/45">Customer: {b.customerId?.name} · {b.customerId?.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-suds px-2.5 py-1 text-[11px] font-semibold capitalize text-ink/70">
                  {b.status.replace("_", " ")}
                </span>
                {next && (
                  <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => advance(b._id, next)}>
                    Mark {next.replace("_", " ")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {bookings.length === 0 && <p className="text-sm text-ink/50">No deliveries assigned yet.</p>}
      </section>
    </main>
  );
}
