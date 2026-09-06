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

type Laundry = {
  _id: string;
  laundryName?: string;
  location: string;
  isOnline: boolean;
  servicesOffered: string[];
  ratingAvg: number;
  ratingCount: number;
};

// The delivery-man's own actionable steps. "assigned" is handled with its
// own Accept/Decline buttons below, not this simple one-button map. "ready"
// is set by the laundry (once washing is done), so there's no button for
// it here — the delivery-man just waits during "in_progress" until the
// laundry marks the order ready, then picks up the "delivered" action
// from there.
const NEXT_STATUS: Record<string, string | null> = {
  picked_up: "in_progress",
  in_progress: null,
  ready: "delivered",
};

// Terminal states — an order that reaches any of these is done and moves
// out of "Job Feed" into "History".
const TERMINAL_STATUS = ["received", "cancelled", "rejected"];

const TABS = ["Available Laundry Shops", "Job Feed", "History"] as const;

/**
 * Delivery-man dashboard.
 * - Lands on "Available Laundry Shops" (same nearby/area text-search as
 *   the customer's Browse tab), so a delivery-man can see who's operating.
 * - "Job Feed" is their own assigned deliveries — no VIP anywhere here,
 *   VIP membership is a customer↔laundry feature only.
 */
export default function DeliveryDashboard() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Available Laundry Shops");
  const [isOnline, setIsOnline] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [laundries, setLaundries] = useState<Laundry[]>([]);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [hasAutoJumped, setHasAutoJumped] = useState(false);

  const pendingAssignments = bookings.filter((b) => b.status === "assigned");

  async function loadAvailability() {
    const res = await fetch("/api/delivery/availability");
    const data = await res.json();
    setIsOnline(data.isOnline ?? false);
  }
  async function toggleAvailability() {
    const next = !isOnline;
    setIsOnline(next);
    await fetch("/api/delivery/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOnline: next }),
    });
  }

  async function loadBookings() {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    const list: Booking[] = data.bookings ?? [];
    setBookings(list);
    // First load only: if there's already a job waiting for a decision,
    // jump straight to Job Feed instead of leaving the delivery-man to
    // stumble onto it — this is the whole reason "accept" felt hidden.
    setHasAutoJumped((already) => {
      if (!already && list.some((b) => b.status === "assigned")) {
        setTab("Job Feed");
      }
      return true;
    });
  }
  async function advance(bookingId: string, status: string) {
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadBookings();
  }

  async function loadLaundries(q = query, a = area) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (a) params.set("area", a);
    const res = await fetch(`/api/laundries${params.toString() ? `?${params.toString()}` : ""}`);
    const data = await res.json();
    setLaundries(data.laundries ?? []);
  }
  async function loadAreas() {
    const res = await fetch("/api/laundries/areas");
    const data = await res.json();
    setAreas(data.areas ?? []);
  }

  useEffect(() => {
    loadAvailability();
    loadBookings();
    loadLaundries();
    loadAreas();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Delivery dashboard</h1>
          <p className="mt-1 text-ink/60">See laundry shops nearby, and manage jobs assigned to you.</p>
        </div>

        <button
          onClick={toggleAvailability}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            isOnline ? "border-teal-600 bg-teal-600 text-white" : "border-line bg-white text-ink/60"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-white" : "bg-ink/30"}`} />
          {isOnline ? "Online — visible to laundries" : "Offline"}
        </button>
      </div>

      <div className="mt-6 flex gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t ? "border-teal-600 text-teal-700" : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {t}
            {t === "Job Feed" && pendingAssignments.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                {pendingAssignments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {pendingAssignments.length > 0 && tab !== "Job Feed" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-600/30 bg-teal-50 px-4 py-3">
          <p className="text-sm font-semibold text-teal-800">
            You have {pendingAssignments.length} new job{pendingAssignments.length === 1 ? "" : "s"} waiting for your
            response.
          </p>
          <button className="btn-primary !px-4 !py-1.5 text-xs" onClick={() => setTab("Job Feed")}>
            Review now
          </button>
        </div>
      )}

      {tab === "Available Laundry Shops" && (
        <section className="mt-6">
          <div className="flex flex-wrap gap-2">
            <input
              className="input max-w-sm"
              placeholder="Search by laundry name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadLaundries(query, area)}
            />
            <select
              className="input !w-auto max-w-[220px]"
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                loadLaundries(query, e.target.value);
              }}
            >
              <option value="">Nearby: all areas</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <button className="btn-secondary !px-5 !py-2.5" onClick={() => loadLaundries(query, area)}>
              Search
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {laundries.map((l) => (
              <div key={l._id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-bold text-ink">{l.laundryName}</p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      l.isOnline ? "bg-teal-100 text-teal-700" : "bg-ink/5 text-ink/50"
                    }`}
                  >
                    {l.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink/60">{l.location}</p>
                <p className="mt-1 text-xs text-ink/45">
                  {l.servicesOffered?.join(", ") || "No services listed"}
                </p>
                <p className="mt-2 text-xs text-ink/50">
                  ★ {l.ratingAvg?.toFixed(1) ?? "0.0"} ({l.ratingCount ?? 0} reviews)
                </p>
              </div>
            ))}
            {laundries.length === 0 && <p className="text-sm text-ink/50">No laundries found.</p>}
          </div>
        </section>
      )}

      {tab === "Job Feed" && (
        <section className="mt-6 space-y-3">
          {bookings
            .filter((b) => !TERMINAL_STATUS.includes(b.status))
            .map((b) => {
              const next = NEXT_STATUS[b.status];
              const isPending = b.status === "assigned";
              return (
                <div
                  key={b._id}
                  className={`card flex flex-wrap items-center justify-between gap-3 ${
                    isPending ? "border-2 border-teal-500 bg-teal-50/50" : ""
                  }`}
                >
                  <div>
                    {isPending && (
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-teal-700">
                        New job offer — action needed
                      </p>
                    )}
                    <p className="font-display font-bold text-ink">#{b.orderSerial}</p>
                    <p className="text-sm text-ink/60">
                      Pickup: {b.pickupAddress} · From: {b.laundryId?.laundryName || b.laundryId?.name}
                    </p>
                    <p className="text-xs text-ink/45">
                      Customer: {b.customerId?.name} · {b.customerId?.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isPending && (
                      <span className="rounded-full bg-suds px-2.5 py-1 text-[11px] font-semibold capitalize text-ink/70">
                        {b.status.replace("_", " ")}
                      </span>
                    )}
                    {b.status === "assigned" && (
                      <>
                        <button
                          className="btn-primary !px-3 !py-1.5 text-xs"
                          onClick={() => advance(b._id, "picked_up")}
                        >
                          Accept job
                        </button>
                        <button
                          className="btn-secondary !px-3 !py-1.5 text-xs"
                          onClick={() => advance(b._id, "accepted")}
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {next && (
                      <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => advance(b._id, next)}>
                        Mark {next.replace("_", " ")}
                      </button>
                    )}
                    {b.status === "in_progress" && (
                      <span className="text-xs text-ink/45">Waiting for laundry to finish washing</span>
                    )}
                    {b.status === "delivered" && (
                      <span className="text-xs text-ink/45">Delivered — waiting for customer to confirm</span>
                    )}
                  </div>
                </div>
              );
            })}
          {bookings.filter((b) => !TERMINAL_STATUS.includes(b.status)).length === 0 && (
            <p className="text-sm text-ink/50">No deliveries assigned yet.</p>
          )}
        </section>
      )}

      {tab === "History" && (
        <section className="mt-6 space-y-3">
          {bookings
            .filter((b) => TERMINAL_STATUS.includes(b.status))
            .map((b) => (
              <div key={b._id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display font-bold text-ink">#{b.orderSerial}</p>
                  <p className="text-sm text-ink/60">
                    Pickup: {b.pickupAddress} · From: {b.laundryId?.laundryName || b.laundryId?.name}
                  </p>
                  <p className="text-xs text-ink/45">
                    Customer: {b.customerId?.name} · {b.customerId?.phone}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    b.status === "received" ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {b.status}
                </span>
              </div>
            ))}
          {bookings.filter((b) => TERMINAL_STATUS.includes(b.status)).length === 0 && (
            <p className="text-sm text-ink/50">No completed or cancelled deliveries yet.</p>
          )}
        </section>
      )}
    </main>
  );
}
