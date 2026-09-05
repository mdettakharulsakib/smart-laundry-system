"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PhotoBackground from "@/components/PhotoBackground";

type Role = "customer" | "laundry" | "delivery";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("customer");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    location: "",
    laundryName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.email) {
      setError("Enter an email address to continue.");
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role, servicesOffered: ["Washing", "Ironing"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] || data.error || "Registration failed");
      router.push(`/dashboard/${role}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PhotoBackground>
      <header className="bg-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-script text-4xl font-bold text-white">
            Smart Laundry
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/" className="border border-white/80 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10">
              Home
            </Link>
            <Link href="/#jobs" className="border border-white/80 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10">
              JOBs
            </Link>
            <Link href="/login" className="border border-white/80 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10">
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-16">
        {step === 1 ? (
          <form onSubmit={goToStep2} className="w-full max-w-sm bg-overlay-card px-10 py-10 text-center backdrop-blur-sm">
            <h1 className="font-display text-xl font-bold leading-snug text-white">
              Welcome To Smart laundry
              <br />
              Here you can find
              <br />
              your every
              <br />
              Need
            </h1>

            <div className="mt-6 flex justify-center gap-2">
              {(["customer", "laundry", "delivery"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`border px-3 py-1 text-xs font-medium capitalize transition ${
                    role === r ? "border-white bg-white/20 text-white" : "border-white/50 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {r === "delivery" ? "Delivery-Man" : r}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-4 text-left">
              <input
                required
                placeholder="User Name"
                className="w-full bg-[#D9D9D9] px-4 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
              <input
                type="email"
                required
                placeholder="Email Address"
                className="w-full bg-[#D9D9D9] px-4 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
              {role === "laundry" && (
                <input
                  required
                  placeholder="Laundry Center Name"
                  className="w-full bg-[#D9D9D9] px-4 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none"
                  value={form.laundryName}
                  onChange={(e) => update("laundryName", e.target.value)}
                />
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

            <button type="submit" className="mt-7 bg-signupBtn px-10 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
              Sign up
            </button>

            <p className="mt-6 text-sm text-white/70">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-white underline underline-offset-2">
                Log in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-sm bg-overlay-card px-10 py-10 backdrop-blur-sm">
            <div className="space-y-4">
              <input
                required
                placeholder="Full Name"
                className="w-full bg-[#D9D9D9] px-4 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
              <input
                required
                placeholder="Phone No."
                className="w-full bg-[#D9D9D9] px-4 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
              <input
                required
                placeholder="Location"
                className="w-full bg-[#D9D9D9] px-4 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="PassWord"
                className="w-full bg-[#D9D9D9] px-4 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
              <input
                type="password"
                required
                placeholder="Re-Confirm"
                className="w-full bg-[#D9D9D9] px-4 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
              />
            </div>

            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

            <div className="mt-7 flex items-center justify-between">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-white/70 underline underline-offset-2">
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="border-2 border-signupBtn bg-signupBtn/20 px-8 py-2 text-sm font-semibold text-white transition hover:bg-signupBtn/40 disabled:opacity-50"
              >
                {loading ? "Creating…" : "Confirm"}
              </button>
            </div>
          </form>
        )}
      </div>
    </PhotoBackground>
  );
}
