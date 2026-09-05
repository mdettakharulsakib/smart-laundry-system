import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
export const AUTH_COOKIE = "sls_token";

export type UserRole = "customer" | "laundry" | "delivery";

export interface TokenPayload {
  userId: string;
  role: UserRole;
  email: string;
  name: string;
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/** Read + verify the current user from the httpOnly cookie (Server Components / Route Handlers). */
export function getCurrentUser(): TokenPayload | null {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Same, but reading from a NextRequest (useful inside middleware). */
export function getUserFromRequest(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
