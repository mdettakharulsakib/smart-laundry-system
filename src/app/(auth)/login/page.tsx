"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PhotoBackground from "@/components/PhotoBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(`/dashboard/${data.user.role}`);
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
            <Link href="/register" className="border border-white/80 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-16">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-overlay-card px-10 py-10 text-center backdrop-blur-sm"
        >
          <h1 className="font-display text-2xl font-bold text-white">Hello Sir</h1>
          <p className="mt-1 text-lg text-white/85">Welcome back</p>

          <div className="mt-8 space-y-4 text-left">
            <input
              type="email"
              required
              placeholder="User Name / Email"
              className="w-full bg-[#D9D9D9] px-4 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              placeholder="Password"
              className="w-full bg-[#D9D9D9] px-4 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-7 bg-loginBtn px-10 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>

          <p className="mt-6 text-sm text-white/70">
            New here?{" "}
            <Link href="/register" className="font-semibold text-white underline underline-offset-2">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </PhotoBackground>
  );
}
