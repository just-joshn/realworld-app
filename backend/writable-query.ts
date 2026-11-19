import type { Request, RequestHandler } from "express";

// Express 5 reparses req.query from the URL on every read, so a sanitizer's
// write disappears. Copy the parsed query onto a writable property once.
export function writableQuery(req: Request): void {
  Object.defineProperty(req, "query", {
    value: { ...req.query },
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

export const materializeQuery: RequestHandler = (req, _res, next) => {
  writableQuery(req);
  next();
};
