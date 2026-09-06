/**
 * Shared between lib/auth.ts (Node runtime — API routes, Server
 * Components) and lib/auth-edge.ts (Edge runtime — middleware.ts).
 * Kept in its own file with zero other imports so neither runtime
 * accidentally pulls in code the other can't run.
 */
export const AUTH_COOKIE = "sls_token";
