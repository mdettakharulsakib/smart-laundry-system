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
  isOnline: boolean;
};

const TABS = ["Incoming Bookings", "Job Feed", "History", "Settings"] as const;

// Terminal states — an order that reaches any of these is done and moves
// out of "Incoming Bookings" into "History".
const TERMINAL_STATUS = ["received", "cancelled", "rejected"];

export default function LaundryDashboard() {
  const router = useRouter();
  // Laundry accounts land directly on the Job Feed — the delivery-person
  // roster with contact info and live status — per the required flow.
  const [tab, setTab] = useState<(typeof TABS)[number]>("Job Feed");
  const [isOnline, setIsOnline] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [openJobs, setOpenJobs] = useState<Booking[]>([]);
  const [deliveryMen, setDeliveryMen] = useState<DeliveryMan[]>([]);
  const [vipEnabled, setVipEnabled] = useState(false);
  const [vipFee, setVipFee] = useState(199);
  const [vipCustomerCount, setVipCustomerCount] = useState(0);
  const [vipSaving, setVipSaving] = useState(false);
  const [vipSaved, setVipSaved] = useState(false);

  async function loadAvailability() {
    const res = await fetch("/api/laundry/availability");
    const data = await res.json();
    setIsOnline(data.isOnline ?? false);
  }
  async function loadVipSettings() {
    const res = await fetch("/api/laundry/vip");
    const data = await res.json();
    setVipEnabled(data.vipEnabled ?? false);
    setVipFee(data.vipFee ?? 199);
    setVipCustomerCount(data.vipCustomerCount ?? 0);
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
    loadVipSettings();
  }, []);

  async function saveVipSettings(next: { vipEnabled?: boolean; vipFee?: number }) {
    setVipSaving(true);
    setVipSaved(false);
    try {
      const res = await fetch("/api/laundry/vip", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      setVipEnabled(data.vipEnabled ?? false);
      setVipFee(data.vipFee ?? 199);
      setVipCustomerCount(data.vipCustomerCount ?? 0);
      setVipSaved(true);
    } finally {
      setVipSaving(false);
    }
  }

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
          {bookings
            .filter((b) => !TERMINAL_STATUS.includes(b.status))
            .map((b) => (
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
                    <>
                      <button
                        className="btn-secondary !px-3 !py-1.5 text-xs"
                        onClick={() => updateStatus(b._id, "cancelled")}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary !px-3 !py-1.5 text-xs"
                        onClick={() => updateStatus(b._id, "ready")}
                      >
                        Mark ready
                      </button>
                    </>
                  )}
                  {b.status === "ready" && (
                    <span className="text-xs text-ink/45">Ready — waiting for delivery-man to deliver</span>
                  )}
                  {b.status === "delivered" && (
                    <span className="text-xs text-ink/45">Delivered — waiting for customer to confirm receipt</span>
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
          {bookings.filter((b) => !TERMINAL_STATUS.includes(b.status)).length === 0 && (
            <p className="text-sm text-ink/50">No active bookings right now.</p>
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
                    #{b.orderSerial} · {b.customerId.name}
                  </p>
                  <p className="text-sm text-ink/60">
                    {b.services.join(", ")} → {b.pickupAddress}
                  </p>
                  {b.deliveryManId && <p className="text-xs text-ink/45">Delivery-man: {b.deliveryManId.name}</p>}
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
            <p className="text-sm text-ink/50">No completed or cancelled orders yet.</p>
          )}
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
            <p className="mt-1 text-sm text-ink/50">Roster of verified delivery-men, with contact and live status.</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-suds text-xs uppercase tracking-wide text-ink/50">
                  <tr>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Phone</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Rating</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {deliveryMen.map((d) => (
                    <tr key={d._id} className="border-t border-line">
                      <td className="px-4 py-2.5 font-semibold text-ink">{d.name}</td>
                      <td className="px-4 py-2.5 text-ink/70">{d.phone}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            d.isOnline ? "bg-teal-100 text-teal-700" : "bg-ink/5 text-ink/50"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${d.isOnline ? "bg-teal-600" : "bg-ink/30"}`} />
                          {d.isOnline ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-ink/60">★ {d.ratingAvg?.toFixed(1) ?? "0.0"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          className="btn-secondary !px-3 !py-1.5 text-xs"
                          onClick={() => appointDeliveryMan(d._id, "")}
                        >
                          Appoint
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {deliveryMen.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-ink/50">No verified delivery-men available yet.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === "Settings" && (
        <section className="mt-6 max-w-md">
          <div className="card">
            <h2 className="font-display text-lg font-bold text-ink">VIP membership</h2>
            <p className="mt-1 text-sm text-ink/60">
              Customers can pay a one-time fee through the payment screen to become a VIP member and get priority
              service on their orders.
            </p>
            <label className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                checked={vipEnabled}
                onChange={(e) => saveVipSettings({ vipEnabled: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm text-ink/70">Enable VIP membership program</span>
            </label>

            <div className="mt-4">
              <label className="label">Membership fee (BDT)</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={vipFee}
                  onChange={(e) => setVipFee(Number(e.target.value))}
                  onBlur={() => saveVipSettings({ vipFee })}
                  disabled={!vipEnabled}
                />
                <button
                  className="btn-secondary !px-4 text-xs disabled:opacity-40"
                  disabled={!vipEnabled || vipSaving}
                  onClick={() => saveVipSettings({ vipFee })}
                >
                  {vipSaving ? "Saving…" : "Save"}
                </button>
              </div>
              {vipSaved && !vipSaving && <p className="mt-1 text-xs text-teal-700">Saved.</p>}
            </div>

            <p className="mt-4 text-xs text-ink/50">
              {vipCustomerCount} customer{vipCustomerCount === 1 ? "" : "s"} currently VIP at your center.
            </p>
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
