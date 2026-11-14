import type {} from "vitest/browser";
import { afterAll, afterEach, beforeAll } from "vitest";
import { worker } from "./msw";

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
