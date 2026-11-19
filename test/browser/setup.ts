import type {} from "vitest/browser";
import { HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { worker } from "./msw";

// WebKit serves a repeated GET from its HTTP cache, so without this a test can receive
// the JSON an earlier test mocked for the same URL.
const mockJson = HttpResponse.json.bind(HttpResponse);
const jsonWithoutCaching: typeof HttpResponse.json = (body, init) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return mockJson(body, { ...init, headers });
};
vi.spyOn(HttpResponse, "json").mockImplementation(jsonWithoutCaching);

// authMachine restores its state from localStorage when it is first imported.
localStorage.clear();

const initialUrl = window.location.pathname + window.location.search;

beforeAll(async () => {
  await worker.start({ onUnhandledFrame: "error", quiet: true });
});

afterEach(() => {
  worker.resetHandlers();
  localStorage.clear();
  window.history.replaceState(null, "", initialUrl);
});

afterAll(() => worker.stop());
