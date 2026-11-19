import express from "express";
import type { RequestHandler, Router } from "express";
import passport from "passport";
import type { User } from "../src/models";
import { buildUser } from "./factories";
import { buildExchange, withQuery } from "./express";
import { materializeQuery } from "../backend/writable-query";
import { vi } from "vitest";
import type { ServerResponse } from "node:http";

type DispatchOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  user?: Partial<User>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  pageSize?: number;
  request?: Record<string, unknown>;
};

export type DispatchResult = {
  status: number;
  body?: unknown;
  redirect?: string;
};

type Settle = (result: DispatchResult) => void;

function buildApp(router: Router) {
  const app = express();
  app.use(materializeQuery);
  const typedPassport: passport.Authenticator<RequestHandler, RequestHandler> = passport;
  app.use(typedPassport.initialize());
  app.use(router);
  return app;
}

function paginationLocals(query: Record<string, unknown>, pageSize: number) {
  const page = Number(query["page"] ?? 1);
  return {
    paginate: {
      page,
      limit: pageSize,
      hasNextPages: (totalPages: number) => page < totalPages,
    },
  };
}

// passport.initialize() copies logIn/logOut over login/logout, so a test double must provide both names.
const PASSPORT_ALIASES = { login: "logIn", logout: "logOut" } as const;

const withPassportAliases = (request: Record<string, unknown>) => ({
  ...request,
  ...Object.fromEntries(
    Object.entries(PASSPORT_ALIASES)
      .filter(([name]) => name in request)
      .map(([name, alias]) => [alias, request[name]])
  ),
});

function responseHooks(settle: Settle) {
  return {
    json(this: ServerResponse, payload: unknown) {
      settle({ status: this.statusCode, body: payload });
      return this;
    },
    send(this: ServerResponse, payload: unknown) {
      settle({ status: this.statusCode, body: payload });
      return this;
    },
    sendStatus(this: ServerResponse, code: number) {
      settle({ status: code });
      return this;
    },
  };
}

function exchangeFor(
  options: Required<Omit<DispatchOptions, "user">>,
  user: User | undefined,
  settle: Settle
) {
  const { method, url, body, query, pageSize, request } = options;
  const fullUrl = withQuery(url, query);
  const { req, res } = buildExchange(
    {
      method,
      url: fullUrl,
      originalUrl: fullUrl,
      body,
      cookies: {},
      ...(user === undefined ? {} : { user }),
      ...withPassportAliases(request),
    },
    { locals: paginationLocals(query, pageSize), ...responseHooks(settle) }
  );
  vi.spyOn(res, "end").mockImplementation((payload?: unknown) => {
    settle({ status: res.statusCode, body: payload });
    return res;
  });
  vi.spyOn(res, "redirect").mockImplementation((location: string | number) => {
    settle({ status: 302, redirect: String(location) });
  });
  return { req, res };
}

export function dispatch(
  router: Router,
  { method, url, user, body = {}, query = {}, pageSize = 10, request = {} }: DispatchOptions
): Promise<DispatchResult> {
  return new Promise((resolve, reject) => {
    const { req, res } = exchangeFor(
      { method, url, body, query, pageSize, request },
      user === undefined ? undefined : buildUser(user),
      resolve
    );
    buildApp(router)(req, res, (error?: unknown) => {
      reject(
        error instanceof Error
          ? error
          : new Error(`No route handled ${method} ${url}`, { cause: error })
      );
    });
  });
}
