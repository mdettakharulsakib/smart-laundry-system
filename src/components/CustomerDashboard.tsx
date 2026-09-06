"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Laundry = {
  _id: string;
  laundryName?: string;
  location: string;
  isOnline: boolean;
  servicesOffered: string[];
  ratingAvg: number;
  ratingCount: number;
  vipEnabled: boolean;
  vipFee?: number;
  isVipCustomer?: boolean;
};

type Booking = {
  _id: string;
  orderSerial: string;
  status: string;
  services: string[];
  pickupAddress: string;
  laundryId: { _id: string; laundryName?: string; name: string };
  deliveryManId?: { _id: string; name: string };
  createdAt: string;
};

const TABS = ["Browse", "My Bookings", "Favorites", "History"] as const;

// Terminal states — an order that reaches any of these moves out of
// "My Bookings" into "History".
const TERMINAL_STATUS = ["received", "cancelled", "rejected"];

export default function CustomerDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Browse");
  const [laundries, setLaundries] = useState<Laundry[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<{ laundries: Laundry[]; deliveryMen: any[] }>({
    laundries: [],
    deliveryMen: [],
  });
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [bookingTarget, setBookingTarget] = useState<Laundry | null>(null);
  const [rateBooking, setRateBooking] = useState<Booking | null>(null);
  const [vipTarget, setVipTarget] = useState<Laundry | null>(null);
  const [loading, setLoading] = useState(false);

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
  async function loadBookings() {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    setBookings(data.bookings ?? []);
  }
  async function loadFavorites() {
    const res = await fetch("/api/favorites");
    const data = await res.json();
    setFavorites(data.favorites ?? { laundries: [], deliveryMen: [] });
  }

  useEffect(() => {
    loadLaundries();
    loadBookings();
    loadFavorites();
    loadAreas();
  }, []);

  async function confirmReceived(bookingId: string) {
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "received" }),
    });
    loadBookings();
  }

  async function toggleFavorite(laundryId: string, isFav: boolean) {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: laundryId, targetRole: "laundry", action: isFav ? "remove" : "add" }),
    });
    loadFavorites();
  }

  async function startChat(laundryId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [laundryId] }),
      });
      const data = await res.json();
      router.push(`/chat?conversationId=${data.conversation._id}`);
    } finally {
      setLoading(false);
    }
  }

  const favLaundryIds = new Set(favorites.laundries.map((l) => l._id));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-ink">Your laundry, sorted.</h1>
      <p className="mt-1 text-ink/60">Find a local laundry, book a service, and track it here.</p>

      <div className="mt-6 flex gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t ? "border-teal-600 text-teal-700" : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Browse" && (
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
            {(query || area) && (
              <button
                className="text-xs font-semibold text-ink/50 hover:text-ink"
                onClick={() => {
                  setQuery("");
                  setArea("");
                  loadLaundries("", "");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
          {area && <p className="mt-2 text-xs text-ink/50">Showing laundries near “{area}”, closest matches first.</p>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {laundries.map((l) => (
              <div key={l._id} className="card flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">{l.laundryName}</h3>
                    <p className="text-sm text-ink/60">{l.location}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      l.isOnline ? "bg-teal-100 text-teal-700" : "bg-ink/5 text-ink/40"
                    }`}
                  >
                    {l.isOnline ? "Online" : "Offline"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.servicesOffered?.map((s) => (
                    <span key={s} className="rounded-full bg-suds px-2.5 py-1 text-xs text-ink/70">
                      {s}
                    </span>
                  ))}
                  {l.vipEnabled && (
                    <span className="rounded-full bg-citrus-500/15 px-2.5 py-1 text-xs font-semibold text-citrus-600">
                      {l.isVipCustomer ? "★ VIP member" : "VIP"}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-ink/50">
                  ★ {l.ratingAvg?.toFixed(1) ?? "0.0"} ({l.ratingCount ?? 0} reviews)
                </p>

                <div className="mt-4 flex gap-2">
                  <button className="btn-primary flex-1 !py-2 text-xs" onClick={() => setBookingTarget(l)}>
                    Book
                  </button>
                  <button
                    disabled={!l.isOnline || loading}
                    onClick={() => startChat(l._id)}
                    className="btn-secondary !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                    title={l.isOnline ? "Chat now" : "Laundry is offline"}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => toggleFavorite(l._id, favLaundryIds.has(l._id))}
                    className="btn-secondary !px-3 !py-2 text-xs"
                  >
                    {favLaundryIds.has(l._id) ? "★" : "☆"}
                  </button>
                </div>

                {l.vipEnabled && !l.isVipCustomer && (
                  <button
                    className="mt-2 w-full rounded-lg border border-citrus-500/40 bg-citrus-500/10 py-2 text-xs font-semibold text-citrus-700 hover:bg-citrus-500/20"
                    onClick={() => setVipTarget(l)}
                  >
                    Become a VIP member — ৳{l.vipFee ?? 199}
                  </button>
                )}
              </div>
            ))}
            {laundries.length === 0 && <p className="text-sm text-ink/50">No laundries found yet.</p>}
          </div>
        </section>
      )}

      {tab === "My Bookings" && (
        <section className="mt-6 space-y-3">
          {bookings
            .filter((b) => !TERMINAL_STATUS.includes(b.status))
            .map((b) => (
              <div key={b._id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display font-bold text-ink">
                    #{b.orderSerial} · {b.laundryId?.laundryName || b.laundryId?.name}
                  </p>
                  <p className="text-sm text-ink/60">
                    {b.services.join(", ")} → {b.pickupAddress}
                  </p>
                  {b.deliveryManId && (
                    <p className="text-xs text-ink/45">Delivery-man: {b.deliveryManId.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  {b.status === "delivered" && (
                    <button
                      className="btn-primary !px-3 !py-1.5 text-xs"
                      onClick={() => confirmReceived(b._id)}
                    >
                      Received
                    </button>
                  )}
                </div>
              </div>
            ))}
          {bookings.filter((b) => !TERMINAL_STATUS.includes(b.status)).length === 0 && (
            <p className="text-sm text-ink/50">No active bookings — browse a laundry to get started.</p>
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
                  <p className="font-display font-bold text-ink">
                    #{b.orderSerial} · {b.laundryId?.laundryName || b.laundryId?.name}
                  </p>
                  <p className="text-sm text-ink/60">
                    {b.services.join(", ")} → {b.pickupAddress}
                  </p>
                  {b.deliveryManId && (
                    <p className="text-xs text-ink/45">Delivery-man: {b.deliveryManId.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  {b.status === "received" && (
                    <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setRateBooking(b)}>
                      Rate order
                    </button>
                  )}
                </div>
              </div>
            ))}
          {bookings.filter((b) => TERMINAL_STATUS.includes(b.status)).length === 0 && (
            <p className="text-sm text-ink/50">No completed or cancelled orders yet.</p>
          )}
        </section>
      )}

      {tab === "Favorites" && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.laundries.map((l) => (
            <div key={l._id} className="card">
              <h3 className="font-display text-lg font-bold text-ink">{l.laundryName}</h3>
              <p className="text-sm text-ink/60">{l.location}</p>
              <button
                className="btn-secondary mt-3 !py-2 text-xs"
                onClick={() => toggleFavorite(l._id, true)}
              >
                Remove from favorites
              </button>
            </div>
          ))}
          {favorites.laundries.length === 0 && (
            <p className="text-sm text-ink/50">No favorites yet — star a laundry from Browse.</p>
          )}
        </section>
      )}

      {bookingTarget && (
        <BookServiceModal
          laundry={bookingTarget}
          onClose={() => setBookingTarget(null)}
          onBooked={() => {
            setBookingTarget(null);
            loadBookings();
            setTab("My Bookings");
          }}
        />
      )}

      {rateBooking && (
        <RateModal
          booking={rateBooking}
          onClose={() => setRateBooking(null)}
          onSubmitted={() => setRateBooking(null)}
        />
      )}

      {vipTarget && (
        <VipPaymentModal
          laundry={vipTarget}
          onClose={() => setVipTarget(null)}
          onSuccess={() => {
            setVipTarget(null);
            loadLaundries(query, area);
          }}
        />
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    accepted: "bg-teal-100 text-teal-700",
    assigned: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-700",
    picked_up: "bg-blue-100 text-blue-700",
    in_progress: "bg-blue-100 text-blue-700",
    ready: "bg-citrus-500/15 text-citrus-600",
    delivered: "bg-citrus-500/15 text-citrus-600",
    received: "bg-teal-100 text-teal-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${styles[status] ?? ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function BookServiceModal({
  laundry,
  onClose,
  onBooked,
}: {
  laundry: Laundry;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [services, setServices] = useState<string[]>([]);
  const [pickupAddress, setPickupAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleService(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function submit() {
    if (services.length === 0 || !pickupAddress) {
      setError("Pick at least one service and enter a pickup address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laundryId: laundry._id, services, pickupAddress, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      onBooked();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title={`Book ${laundry.laundryName}`}>
      <div className="space-y-4">
        <div>
          <label className="label">Services</label>
          <div className="flex flex-wrap gap-2">
            {(laundry.servicesOffered ?? ["Washing", "Ironing"]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleService(s)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  services.includes(s)
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-line text-ink/70 hover:border-teal-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Pickup address</label>
          <input className="input" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} onClick={submit} className="btn-primary w-full">
          {loading ? "Booking…" : "Confirm booking"}
        </button>
      </div>
    </Modal>
  );
}

function RateModal({
  booking,
  onClose,
  onSubmitted,
}: {
  booking: Booking;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [target, setTarget] = useState<"laundry" | "delivery">("laundry");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const targetUserId = target === "laundry" ? booking.laundryId._id : booking.deliveryManId?._id;
      if (!targetUserId) throw new Error("No delivery-man to rate on this order");
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking._id, targetUserId, targetRole: target, stars, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit rating");
      onSubmitted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title={`Rate order #${booking.orderSerial}`}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              target === "laundry" ? "border-teal-600 bg-teal-600 text-white" : "border-line text-ink/70"
            }`}
            onClick={() => setTarget("laundry")}
          >
            Laundry
          </button>
          {booking.deliveryManId && (
            <button
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                target === "delivery" ? "border-teal-600 bg-teal-600 text-white" : "border-line text-ink/70"
              }`}
              onClick={() => setTarget("delivery")}
            >
              Delivery-man
            </button>
          )}
        </div>

        <div>
          <label className="label">Stars</label>
          <div className="flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setStars(n)} className={n <= stars ? "text-citrus-500" : "text-ink/20"}>
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Comment (optional)</label>
          <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} onClick={submit} className="btn-primary w-full">
          {loading ? "Submitting…" : "Submit rating"}
        </button>
      </div>
    </Modal>
  );
}

function formatCardNumber(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/**
 * Mock VIP payment gateway.
 *
 * No real merchant account is wired in — that needs its own signup with
 * a provider (Stripe/SSLCommerz/bKash, etc.) outside what can be set up
 * automatically. This screen mimics a real card-payment form and talks
 * to a mock backend endpoint (api/laundry/vip/subscribe) that validates
 * card shape (Luhn + expiry), "charges" it, and unlocks VIP — good
 * enough to demo the full flow end-to-end.
 *
 * Try CVV "000" to see the decline path.
 */
function VipPaymentModal({
  laundry,
  onClose,
  onSuccess,
}: {
  laundry: Laundry;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<{ transactionId: string; amount: number; cardBrand: string; cardLast4: string } | null>(
    null
  );

  async function pay() {
    setError(null);
    if (!cardName.trim()) return setError("Enter the name on the card.");
    if (cardNumber.replace(/\s/g, "").length < 12) return setError("Enter a valid card number.");
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return setError("Enter expiry as MM/YY.");
    if (!/^\d{3,4}$/.test(cvv)) return setError("Enter a valid CVV.");

    setLoading(true);
    try {
      const res = await fetch("/api/laundry/vip/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          laundryId: laundry._id,
          cardNumber: cardNumber.replace(/\s/g, ""),
          cardName,
          expiry,
          cvv,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      setReceipt(data.payment);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (receipt) {
    return (
      <Modal title="Payment successful" onClose={onSuccess}>
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-2xl text-teal-700">
            ✓
          </div>
          <p className="text-sm text-ink/70">
            You're now a VIP member at <b>{laundry.laundryName}</b>.
          </p>
          <div className="rounded-lg bg-suds p-3 text-left text-xs text-ink/60">
            <p>Transaction: {receipt.transactionId}</p>
            <p>
              Paid: ৳{receipt.amount} · {receipt.cardBrand} •••• {receipt.cardLast4}
            </p>
          </div>
          <button className="btn-primary w-full" onClick={onSuccess}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`VIP membership — ${laundry.laundryName}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-suds p-3 text-sm text-ink/70">
          One-time payment of <b>৳{laundry.vipFee ?? 199}</b> unlocks priority service at this laundry.
        </div>

        <p className="text-[11px] text-ink/40">
          Demo payment screen — no real card is charged. Any Luhn-valid card number works; use CVV “000” to test a
          decline.
        </p>

        <div>
          <label className="label">Card number</label>
          <input
            className="input"
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="label">Name on card</label>
          <input className="input" value={cardName} onChange={(e) => setCardName(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Expiry</label>
            <input
              className="input"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              inputMode="numeric"
            />
          </div>
          <div className="flex-1">
            <label className="label">CVV</label>
            <input
              className="input"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} onClick={pay} className="btn-primary w-full">
          {loading ? "Processing payment…" : `Pay ৳${laundry.vipFee ?? 199}`}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl2 bg-white p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
