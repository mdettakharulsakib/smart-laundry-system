import { NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/authConstants";

/**
 * THE LOGIN/LOGOUT "STUCK ON LOGIN PAGE" BUG — ROOT CAUSE
 * -------------------------------------------------------
 * middleware.ts always runs on Next.js's Edge Runtime, which does NOT
 * support Node's `crypto` module. `jsonwebtoken` (used everywhere else
 * in this app — API routes, Server Components — via lib/auth.ts) relies
 * on that Node `crypto` module internally.
 *
 * So the old middleware, which imported `jsonwebtoken` through
 * lib/auth.ts, silently failed to verify the login cookie on every
 * single request. `verifyToken` caught the error and returned `null`,
 * so middleware always believed nobody was logged in — even right
 * after a successful login — and kept bouncing every `/dashboard/*`
 * request back to `/login`. That's the loop you were seeing.
 *
 * The fix: verify the same HS256 token using only the Web Crypto API
 * (`crypto.subtle`), which Edge Runtime DOES support. No new npm
 * package needed. `lib/auth.ts` (Node runtime) is untouched and still
 * uses `jsonwebtoken` for everything outside middleware.
 */

const encoder = new TextEncoder();

function base64UrlDecode(input: string): Uint8Array {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeToString(input: string): string {
  return new TextDecoder().decode(base64UrlDecode(input));
}

export interface EdgeTokenPayload {
  userId: string;
  role: "customer" | "laundry" | "delivery";
  email: string;
  name: string;
  exp?: number;
}

export async function verifyTokenEdge(token: string, secret: string): Promise<EdgeTokenPayload | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signature = base64UrlDecode(signatureB64);
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify("HMAC", key, signature as BufferSource, data as BufferSource);
    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecodeToString(payloadB64)) as EdgeTokenPayload;
    if (payload.exp && Date.now() >= payload.exp * 1000) return null; // expired

    return payload;
  } catch {
    return null;
  }
}

/** Read + verify the current user from a NextRequest, for use inside middleware only. */
export async function getUserFromRequestEdge(req: NextRequest): Promise<EdgeTokenPayload | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.JWT_SECRET as string;
  if (!secret) return null;
  return verifyTokenEdge(token, secret);
}
