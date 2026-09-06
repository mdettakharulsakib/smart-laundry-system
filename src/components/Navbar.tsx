"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar({
  user,
}: {
  user: { name: string; role: string } | null;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const homeHref = user ? `/dashboard/${user.role}` : "/";
  const jobsHref =
    user?.role === "laundry" ? "/dashboard/laundry" : user?.role === "delivery" ? "/dashboard/delivery" : "/#jobs";

  return (
    <header className="bg-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={homeHref} className="font-script text-4xl font-bold text-white">
          Smart Laundry
        </Link>

        <nav className="flex items-center gap-3">
          <NavButton href={homeHref}>Home</NavButton>
          <NavButton href={jobsHref}>JOBs</NavButton>

          {user ? (
            <>
              {user.role === "customer" && <NavButton href="/chat">Chat</NavButton>}
              <button
                onClick={handleLogout}
                className="border border-white/80 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavButton href="/login">Log in</NavButton>
              <NavButton href="/register">Sign Up</NavButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="border border-white/80 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
    >
      {children}
    </Link>
  );
}
