import express from "express";
import type { RequestHandler, Router } from "express";
import passport from "passport";
import type { User } from "../src/models";
import { buildUser } from "./factories";
import { buildExchange } from "./express";
import { vi } from "vitest";

type DispatchOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  user?: Partial<User>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  pageSize?: number;
  request?: Record<string, unknown>;
};

export type DispatchResult = { status: number; body?: unknown; redirect?: string };

export function dispatch(
  router: Router,
  { method, url, user, body = {}, query = {}, pageSize = 10, request = {} }: DispatchOptions
): Promise<DispatchResult> {
  return new Promise((resolve, reject) => {
    const app = express();
    const typedPassport: passport.Authenticator<RequestHandler, RequestHandler> = passport;
    app.use(typedPassport.initialize());
    app.use((req, res, next) => {
      if (user !== undefined) req.user = buildUser(user);
      Object.assign(req, request);
      const page = Number(query["page"] ?? 1);
      res.locals = {
        paginate: {
          page,
          limit: pageSize,
          hasNextPages: (totalPages: number) => page < totalPages,
        },
      };
      next();
    });
    app.use(router);

    const { req, res } = buildExchange();
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.body = body;
    Object.assign(req.query, query);
    req.cookies = {};
    res.json = (payload: unknown) => {
      resolve({ status: res.statusCode, body: payload });
      return res;
    };
    res.send = (payload: unknown) => {
      resolve({ status: res.statusCode, body: payload });
      return res;
    };
    res.sendStatus = (code: number) => {
      resolve({ status: code });
      return res;
    };
    vi.spyOn(res, "end").mockImplementation((payload?: unknown) => {
      resolve({ status: res.statusCode, body: payload });
      return res;
    });
    vi.spyOn(res, "redirect").mockImplementation((location: string | number) => {
      resolve({ status: 302, redirect: String(location) });
    });
    app(req, res, (error?: unknown) => {
      reject(
        error instanceof Error
          ? error
          : new Error(`No route handled ${method} ${url}`, { cause: error })
      );
    });
  });
}
