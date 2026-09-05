"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Booking = {
  _id: string;
  orderSerial: string;
  status: string;
  services: string[];
  pickupAddress: string;
  customerId: { _id: string; name: string; phone: string };
  deliveryManId?: { _id: string; name: string };
};

type DeliveryMan = {
  _id: string;
  name: string;
  phone: string;
  location: string;
  ratingAvg: number;
};

const TABS = ["Incoming Bookings", "Job Feed", "Settings"] as const;

export default function LaundryDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Incoming Bookings");
  const [isOnline, setIsOnline] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [openJobs, setOpenJobs] = useState<Booking[]>([]);
  const [deliveryMen, setDeliveryMen] = useState<DeliveryMan[]>([]);
  const [vipEnabled, setVipEnabled] = useState(false);

  async function loadAvailability() {
    const res = await fetch("/api/laundry/availability");
    const data = await res.json();
    setIsOnline(data.isOnline ?? false);
  }
  async function loadBookings() {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    setBookings(data.bookings ?? []);
  }
  async function loadJobFeed() {
    const res = await fetch("/api/laundry/jobfeed");
    const data = await res.json();
    setOpenJobs(data.openJobs ?? []);
    setDeliveryMen(data.availableDeliveryMen ?? []);
  }

  useEffect(() => {
    loadAvailability();
    loadBookings();
    loadJobFeed();
  }, []);

  async function toggleAvailability() {
    const next = !isOnline;
    setIsOnline(next);
    await fetch("/api/laundry/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOnline: next }),
    });
  }

  async function updateStatus(bookingId: string, status: string) {
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadBookings();
    loadJobFeed();
  }

  async function appointDeliveryMan(deliveryManId: string, bookingId: string) {
    await fetch("/api/laundry/appoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryManId, bookingId }),
    });
    loadJobFeed();
    loadBookings();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Laundry dashboard</h1>
          <p className="mt-1 text-ink/60">Manage bookings, and appoint delivery-men from your job feed.</p>
        </div>

        <button
          onClick={toggleAvailability}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            isOnline ? "border-teal-600 bg-teal-600 text-white" : "border-line bg-white text-ink/60"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-white" : "bg-ink/30"}`} />
          {isOnline ? "Online — visible to customers" : "Offline"}
        </button>
      </div>

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

      {tab === "Incoming Bookings" && (
        <section className="mt-6 space-y-3">
          {bookings.map((b) => (
            <div key={b._id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display font-bold text-ink">
                  #{b.orderSerial} · {b.customerId.name}
                </p>
                <p className="text-sm text-ink/60">
                  {b.services.join(", ")} → {b.pickupAddress}
                </p>
                {b.deliveryManId && <p className="text-xs text-ink/45">Delivery-man: {b.deliveryManId.name}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-suds px-2.5 py-1 text-[11px] font-semibold capitalize text-ink/70">
                  {b.status.replace("_", " ")}
                </span>
                {b.status === "pending" && (
                  <>
                    <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => updateStatus(b._id, "accepted")}>
                      Approve
                    </button>
                    <button
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                      onClick={() => updateStatus(b._id, "rejected")}
                    >
                      Reject
                    </button>
                  </>
                )}
                {["accepted", "picked_up", "in_progress"].includes(b.status) && (
                  <button
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                    onClick={() => updateStatus(b._id, "cancelled")}
                  >
                    Cancel
                  </button>
                )}
                {b.status === "accepted" && (
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => updateStatus(b._id, "ready")}>
                    Mark ready
                  </button>
                )}
                {b.status === "ready" && (
                  <button
                    className="btn-primary !px-3 !py-1.5 text-xs"
                    onClick={() => updateStatus(b._id, "delivered")}
                  >
                    Mark delivered
                  </button>
                )}
                <button
                  className="text-xs font-semibold text-teal-700"
                  onClick={() => router.push(`/chat?withUser=${b.customerId._id}`)}
                >
                  Chat
                </button>
              </div>
            </div>
          ))}
          {bookings.length === 0 && <p className="text-sm text-ink/50">No bookings yet.</p>}
        </section>
      )}

      {tab === "Job Feed" && (
        <section className="mt-6 space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Open jobs needing a delivery-man</h2>
            <div className="mt-3 space-y-3">
              {openJobs.map((job) => (
                <div key={job._id} className="card flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      #{job.orderSerial} · {job.customerId.name}
                    </p>
                    <p className="text-sm text-ink/60">{job.pickupAddress}</p>
                  </div>
                  <AppointPicker deliveryMen={deliveryMen} onAppoint={(id) => appointDeliveryMan(id, job._id)} />
                </div>
              ))}
              {openJobs.length === 0 && <p className="text-sm text-ink/50">No open jobs right now.</p>}
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-ink">Available delivery-men</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deliveryMen.map((d) => (
                <div key={d._id} className="card">
                  <p className="font-semibold text-ink">{d.name}</p>
                  <p className="text-sm text-ink/60">{d.location}</p>
                  <p className="mt-1 text-xs text-ink/45">★ {d.ratingAvg?.toFixed(1) ?? "0.0"}</p>
                  <button
                    className="btn-secondary mt-3 w-full !py-2 text-xs"
                    onClick={() => appointDeliveryMan(d._id, "")}
                  >
                    Appoint to my center
                  </button>
                </div>
              ))}
              {deliveryMen.length === 0 && <p className="text-sm text-ink/50">No verified delivery-men available yet.</p>}
            </div>
          </div>
        </section>
      )}

      {tab === "Settings" && (
        <section className="mt-6 max-w-md">
          <div className="card">
            <h2 className="font-display text-lg font-bold text-ink">VIP membership</h2>
            <p className="mt-1 text-sm text-ink/60">
              Activate VIP status to offer a limited set of customers faster service.
            </p>
            <label className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                checked={vipEnabled}
                onChange={(e) => setVipEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-ink/70">Enable VIP membership program</span>
            </label>
          </div>
        </section>
      )}
    </main>
  );
}

function AppointPicker({
  deliveryMen,
  onAppoint,
}: {
  deliveryMen: DeliveryMan[];
  onAppoint: (id: string) => void;
}) {
  const [selected, setSelected] = useState("");
  return (
    <div className="flex gap-2">
      <select className="input !w-auto" value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">Choose delivery-man…</option>
        {deliveryMen.map((d) => (
          <option key={d._id} value={d._id}>
            {d.name} (★ {d.ratingAvg?.toFixed(1) ?? "0.0"})
          </option>
        ))}
      </select>
      <button
        disabled={!selected}
        className="btn-primary !px-3 !py-2 text-xs disabled:opacity-40"
        onClick={() => selected && onAppoint(selected)}
      >
        Appoint
      </button>
    </div>
  );
}
