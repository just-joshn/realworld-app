import type { NextFunction, Request, Response } from "express";
import { Mock, vi } from "vitest";

export function buildRequest(overrides: Record<string, unknown> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    cookies: {},
    isAuthenticated: () => true,
    ...overrides,
  } as unknown as Request;
}

export function buildResponse() {
  const res = {
    locals: {} as Record<string, unknown>,
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
    sendStatus: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
  res.sendStatus.mockReturnValue(res);
  return res;
}

export const asResponse = (res: ReturnType<typeof buildResponse>) => res as unknown as Response;

export const buildNext = () => vi.fn() as Mock<(error?: unknown) => void> & NextFunction;
