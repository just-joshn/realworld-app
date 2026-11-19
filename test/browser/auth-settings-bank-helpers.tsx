import { http, HttpResponse } from "msw";
import { onTestFinished } from "vitest";
import { createActor } from "xstate";
import { authMachine } from "../../src/machines/authMachine";
import { bankAccountsMachine } from "../../src/machines/bankAccountsMachine";
import { buildUser } from "../factories";
import { apiUrl, worker } from "./msw";

export function startAuth() {
  const service = createActor(authMachine).start();
  onTestFinished(() => {
    service.stop();
  });
  return service;
}

export async function login() {
  worker.use(
    http.post(apiUrl("/login"), () =>
      HttpResponse.json({ user: buildUser({ phoneNumber: "5551234567" }) })
    )
  );
  const service = startAuth();
  await new Promise<void>((resolve) => {
    const subscription = service.subscribe((state) => {
      if (state.matches("authorized")) {
        subscription.unsubscribe();
        resolve();
      }
    });
    service.send({ type: "LOGIN" });
  });
  return service;
}

export function startBankAccounts() {
  const service = createActor(bankAccountsMachine).start();
  onTestFinished(() => {
    service.stop();
  });
  return service;
}
