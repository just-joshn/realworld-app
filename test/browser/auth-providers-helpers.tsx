import { http, HttpResponse } from "msw";
import { onTestFinished } from "vitest";
import { authService } from "../../src/machines/authMachine";
import { signOutAuthService } from "../auth-session";
import { buildBankAccount } from "../factories";
import { apiUrl, worker } from "./msw";

export function startProviderSession() {
  worker.use(
    http.get(apiUrl("/notifications"), () => HttpResponse.json({ results: [] })),
    http.post(apiUrl("/graphql"), () =>
      HttpResponse.json({ data: { listBankAccount: [buildBankAccount()] } })
    ),
    http.post(apiUrl("/logout"), () => HttpResponse.json({}))
  );
  // An xstate 5 actor cannot restart, so each test signs the shared service back out instead.
  onTestFinished(async () => {
    worker.use(http.post(apiUrl("/logout"), () => HttpResponse.json({})));
    await signOutAuthService(authService);
  });
}
