import express from "express";
import type { Request, Response } from "express";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { vi } from "vitest";
import { required } from "../backend/required";
import { writableQuery } from "../backend/writable-query";

export function buildExchange() {
  const app = express();
  const incoming = new IncomingMessage(new Socket());
  incoming.method = "GET";
  incoming.url = "/";
  const outgoing = new ServerResponse(incoming);
  let exchange: { req: Request; res: Response } | undefined;
  app.use((req, res) => {
    exchange = { req, res };
  });
  app(incoming, outgoing);
  return required(exchange, "Express test exchange");
}

function queryText(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function isQueryRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function withQuery(url: string, query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const text = queryText(item);
        if (text !== undefined) params.append(key, text);
      }
      continue;
    }
    const text = queryText(value);
    if (text !== undefined) params.append(key, text);
  }
  const search = params.toString();
  if (!search) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${search}`;
}

export function buildRequest(overrides: Record<string, unknown> = {}): Request {
  const { query, ...rest } = overrides;
  const { req } = buildExchange();
  Object.assign(
    req,
    {
      body: {},
      params: {},
      cookies: {},
      isAuthenticated: () => true,
    },
    rest
  );
  if (isQueryRecord(query)) {
    req.url = withQuery(req.url, query);
  }
  writableQuery(req);
  return req;
}

export function buildResponse() {
  const { res } = buildExchange();
  return {
    response: res,
    status: vi.spyOn(res, "status").mockImplementation(() => res),
    json: vi.spyOn(res, "json").mockImplementation(() => res),
    send: vi.spyOn(res, "send").mockImplementation(() => res),
    sendStatus: vi.spyOn(res, "sendStatus").mockImplementation(() => res),
  };
}

export const asResponse = (res: ReturnType<typeof buildResponse>): Response => res.response;
export const buildNext = () => vi.fn<(error?: unknown) => void>();
