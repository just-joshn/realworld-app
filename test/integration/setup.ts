import { afterEach, beforeEach, inject } from "vitest";

localStorage.clear();

const initialUrl = window.location.pathname + window.location.search;

beforeEach(async () => {
  const response = await fetch(`${inject("apiUrl")}/testData/seed`, { method: "POST" });
  if (!response.ok) throw new Error(`Seeding the API database failed: ${String(response.status)}`);
});

afterEach(async () => {
  const { authService } = await import("../../src/machines/authMachine");
  if (!authService.getSnapshot().matches("unauthorized")) {
    await new Promise<void>((resolve) => {
      const subscription = authService.subscribe((state) => {
        if (state.matches("unauthorized")) {
          subscription.unsubscribe();
          resolve();
        }
      });
      authService.send({ type: "LOGOUT" });
    });
  }
  localStorage.clear();
  window.history.replaceState(null, "", initialUrl);
});
