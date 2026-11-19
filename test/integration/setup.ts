import { signOutAuthService } from "../auth-session";
import { afterEach, beforeEach, inject } from "vitest";

localStorage.clear();

const initialUrl = window.location.pathname + window.location.search;

beforeEach(async () => {
  const response = await fetch(`${inject("apiUrl")}/testData/seed`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`Seeding the API database failed: ${String(response.status)}`);
});

afterEach(async () => {
  const { authService } = await import("../../src/machines/authMachine");
  await signOutAuthService(authService);
  localStorage.clear();
  window.history.replaceState(null, "", initialUrl);
});
