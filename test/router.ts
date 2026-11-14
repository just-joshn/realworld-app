import type { Router } from "express";
import type { User } from "../src/models";

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

// Runs a request through an Express router in-process, without a server or network.
export function dispatch(
  router: Router,
  { method, url, user, body = {}, query = {}, pageSize = 10, request = {} }: DispatchOptions
): Promise<DispatchResult> {
  return new Promise((resolve, reject) => {
    const page = Number(query.page ?? 1);
    const res = {
      statusCode: 200,
      locals: {
        paginate: {
          page,
          limit: pageSize,
          hasNextPages: (totalPages: number) => page < totalPages,
        },
      },
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      json(payload: unknown) {
        resolve({ status: res.statusCode, body: payload });
        return res;
      },
      send(payload: unknown) {
        resolve({ status: res.statusCode, body: payload });
        return res;
      },
      sendStatus(code: number) {
        resolve({ status: code });
        return res;
      },
      setHeader() {},
      end(payload?: unknown) {
        resolve({ status: res.statusCode, body: payload });
      },
      redirect(location: string) {
        resolve({ status: 302, redirect: location });
      },
      clearCookie() {},
    };
    const req = {
      method,
      url,
      headers: {},
      cookies: {},
      params: {},
      body,
      query,
      user,
      isAuthenticated: () => user !== undefined,
      ...request,
    };

    router(req as never, res as never, (error?: unknown) =>
      reject(error ?? new Error(`No route handled ${method} ${url}`))
    );
  });
}
