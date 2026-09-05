import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import PhotoBackground from "@/components/PhotoBackground";

export default function Home() {
  const user = getCurrentUser();

  return (
    <div>
      <PhotoBackground className="min-h-[720px]">
        <Navbar user={user} />

        <div className="flex flex-col items-center justify-center px-6 py-28 text-center">
          <h1 className="font-display text-3xl font-bold leading-snug text-white sm:text-4xl">
            Welcome Buddy We are Ready to&nbsp;Search for your Cloths
          </h1>
          <p className="mt-6 max-w-xl font-display text-xl font-semibold text-white/95">
            You have exclusive Laundry Shops and Fastest Delivery Boy
          </p>
          <p className="mt-6 max-w-xl font-display text-lg font-semibold text-white/90">
            Lets Assume your Likes and lets go find out what need to Iron or Wash
          </p>

          <Link
            href={user ? `/dashboard/${user.role}` : "/register"}
            id="jobs"
            className="mt-10 border border-ink/70 bg-white px-8 py-3 text-base font-semibold text-ink shadow-soft transition hover:bg-white/90"
          >
            Available Laundry Shops
          </Link>
        </div>
      </PhotoBackground>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-2xl font-bold text-ink">Built for three kinds of users</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <RoleCard
              title="Customers"
              copy="Register, save your clothes' profiles, find local laundries, and book washing or ironing in a few taps."
            />
            <RoleCard
              title="Laundry centers"
              copy="Go online, manage incoming bookings, appoint delivery-men from the job feed, and run a VIP program."
            />
            <RoleCard
              title="Delivery-men"
              copy="Get appointed to laundry centers, pick up assigned jobs, and update order status as you go."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function RoleCard({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="card">
      <h3 className="font-display text-lg font-bold text-teal-700">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink/65">{copy}</p>
    </div>
  );
}
