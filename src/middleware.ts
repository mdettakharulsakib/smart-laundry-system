import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequestEdge } from "@/lib/auth-edge";

const roleHome: Record<string, string> = {
  customer: "/dashboard/customer",
  laundry: "/dashboard/laundry",
  delivery: "/dashboard/delivery",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const user = await getUserFromRequestEdge(req);

  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    const requiredRole = pathname.split("/")[2]; // dashboard/<role>/...
    if (requiredRole && requiredRole !== user.role) {
      return NextResponse.redirect(new URL(roleHome[user.role] ?? "/", req.url));
    }
  }

  if ((pathname === "/login" || pathname === "/register") && user) {
    return NextResponse.redirect(new URL(roleHome[user.role] ?? "/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
