import type { Request } from "express";

export const REMEMBER_ME_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The one express-session boundary write. express-session only exposes per-request cookie
 * lifetime through the live `cookie.maxAge` setter, so it is called here and nowhere else.
 * `undefined` makes the cookie a browser-session cookie.
 */
export function setSessionCookieMaxAge(req: Request, maxAge: number | undefined): void {
  Reflect.set(req.session.cookie, "maxAge", maxAge);
}
