// Discovered 2026-08-19 by inspecting the live app's localStorage after a
// real login via the UI (Object.keys(localStorage) included this key holding
// the JWT issued by POST /api/auth/login).
export const AUTH_TOKEN_STORAGE_KEY = 'token';
