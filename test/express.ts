import express from "express";
import type { Request, Response } from "express";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { vi } from "vitest";
import { required } from "../backend/required";

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

export function buildRequest(overrides: Record<string, unknown> = {}): Request {
  const { req } = buildExchange();
  return Object.assign(
    req,
    {
      body: {},
      query: {},
      params: {},
      cookies: {},
      isAuthenticated: () => true,
    },
    overrides
  );
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
