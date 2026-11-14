import { http, HttpResponse } from "msw";
import { onTestFinished } from "vitest";
import { authService } from "../../src/machines/authMachine";
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
  authService.stop();
  authService.start();
  onTestFinished(() => {
    authService.stop();
  });
}
