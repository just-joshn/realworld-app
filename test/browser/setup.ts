import type {} from "vitest/browser";
import { HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll } from "vitest";
import { worker } from "./msw";

// WebKit serves a repeated GET from its HTTP cache, so without this a test can receive
// the JSON an earlier test mocked for the same URL.
const mockJson = HttpResponse.json.bind(HttpResponse);
HttpResponse.json = ((body, init) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return mockJson(body, { ...init, headers });
}) as typeof HttpResponse.json;

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
