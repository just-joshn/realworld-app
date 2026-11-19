import { graphql } from "msw/graphql";
import { http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";
import { server } from "../../test/msw";
import { startService } from "../../test/machines";
import { apiUrl } from "../utils/apiConfig";
import {
  buildBankAccount,
  buildUser,
  buildTransactionResponseItem,
  buildPaymentNotification,
} from "../../test/factories";
import { bankAccountsMachine } from "./bankAccountsMachine";
import { contactsTransactionsMachine } from "./contactsTransactionsMachine";
import { notificationsMachine } from "./notificationsMachine";
import { personalTransactionsMachine } from "./personalTransactionsMachine";
import { publicTransactionsMachine } from "./publicTransactionsMachine";
import { usersMachine } from "./usersMachine";

const api = apiUrl("");

// Records each request's path and query string, and answers with one result.
function respondWithResults(method: "get" | "patch", path: string) {
  const received = vi.fn<(request: { path: string; params: Record<string, string> }) => void>();
  server.use(
    http[method](`${api}${path}`, ({ request }) => {
      const url = new URL(request.url);
      received({ path: url.pathname, params: Object.fromEntries(url.searchParams) });
      const results = path.startsWith("/users")
        ? [buildUser({ id: "result1" })]
        : path.startsWith("/notifications")
          ? [{ ...buildPaymentNotification({ id: "result1" }), userFullName: "Ada Lovelace" }]
          : [buildTransactionResponseItem({ id: "result1" })];
      return HttpResponse.json({
        results,
        pageData: { page: 1, limit: 10, hasNextPages: false, totalPages: 1 },
      });
    })
  );
  return received;
}

describe.for([
  {
    name: "publicTransactionsMachine",
    machine: publicTransactionsMachine,
    path: "/transactions/public",
  },
  {
    name: "personalTransactionsMachine",
    machine: personalTransactionsMachine,
    path: "/transactions",
  },
  {
    name: "contactsTransactionsMachine",
    machine: contactsTransactionsMachine,
    path: "/transactions/contacts",
  },
])("$name", ({ machine, path }) => {
  test("FETCH without filters requests every transaction", async () => {
    const received = respondWithResults("get", path);
    const service = startService(machine);

    service.send({ type: "FETCH" });

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
    expect(received).toHaveBeenCalledExactlyOnceWith({ path, params: {} });
  });

  test("FETCH with filters sends them as query parameters", async () => {
    const received = respondWithResults("get", path);
    const service = startService(machine);

    service.send({ type: "FETCH", page: 2, limit: 10 });

    await expect.poll(() => received.mock.calls.length).toBe(1);
    expect(received).toHaveBeenCalledWith({ path, params: { page: "2", limit: "10" } });
  });
});

describe("usersMachine", () => {
  test("FETCH without a query lists users", async () => {
    const received = respondWithResults("get", "/users");
    const service = startService(usersMachine);

    service.send({ type: "FETCH" });

    await expect
      .poll(() => service.getSnapshot().context.results)
      .toEqual([expect.objectContaining({ id: "result1" })]);
    expect(received).toHaveBeenCalledWith({ path: "/users", params: {} });
  });

  test("FETCH with a query searches users", async () => {
    const received = respondWithResults("get", "/users/search");
    const service = startService(usersMachine);

    service.send({ type: "FETCH", q: "ada" });

    await expect.poll(() => received.mock.calls.length).toBe(1);
    expect(received).toHaveBeenCalledWith({ path: "/users/search", params: { q: "ada" } });
  });
});

describe("notificationsMachine", () => {
  test("FETCH lists notifications", async () => {
    const received = respondWithResults("get", "/notifications");
    const service = startService(notificationsMachine);

    service.send({ type: "FETCH" });

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
    expect(received).toHaveBeenCalledWith({ path: "/notifications", params: {} });
  });

  test("FETCH with parameters passes them through", async () => {
    const received = respondWithResults("get", "/notifications");
    const service = startService(notificationsMachine);

    service.send({ type: "FETCH", page: 1 });

    await expect.poll(() => received.mock.calls.length).toBe(1);
    expect(received).toHaveBeenCalledWith({ path: "/notifications", params: { page: "1" } });
  });

  test("UPDATE marks a notification and reloads without the update fields", async () => {
    const updated = vi.fn();
    server.use(
      http.patch(`${api}/notifications/:id`, async ({ request, params }) => {
        updated({ id: params["id"], body: await request.json() });
        return new HttpResponse(null, { status: 204 });
      })
    );
    const reloaded = respondWithResults("get", "/notifications");
    const service = startService(notificationsMachine);

    service.send({ type: "UPDATE", id: "notif1", isRead: true });

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
    expect(updated).toHaveBeenCalledExactlyOnceWith({
      id: "notif1",
      body: { id: "notif1", isRead: true },
    });
    expect(reloaded).toHaveBeenCalledWith({ path: "/notifications", params: {} });
  });
});

const bankApi = graphql.link(`${api}/graphql`);

function serveAccounts() {
  const accounts = [buildBankAccount()];
  server.use(
    bankApi.query("ListBankAccount", () =>
      HttpResponse.json({ data: { listBankAccount: accounts } })
    )
  );
  return accounts;
}

describe("bankAccountsMachine", () => {
  test("FETCH lists bank accounts over GraphQL", async () => {
    serveAccounts();
    const service = startService(bankAccountsMachine);

    service.send({ type: "FETCH" });

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
    expect(service.getSnapshot().context.results).toEqual([
      expect.objectContaining({ id: "bank1", bankName: "First Bank" }),
    ]);
  });

  test("CREATE sends the account details as mutation variables", async () => {
    serveAccounts();
    const variables = vi.fn();
    server.use(
      bankApi.mutation("CreateBankAccount", ({ variables: received }) => {
        variables(received);
        return HttpResponse.json({ data: { createBankAccount: buildBankAccount() } });
      })
    );
    const service = startService(bankAccountsMachine);

    service.send({
      type: "CREATE",
      bankName: "First Bank",
      accountNumber: "123456789",
      routingNumber: "987654321",
    });

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
    expect(variables).toHaveBeenCalledExactlyOnceWith({
      bankName: "First Bank",
      accountNumber: "123456789",
      routingNumber: "987654321",
    });
  });
});

describe("bankAccountsMachine: DELETE", () => {
  test("DELETE sends the account id as a mutation variable", async () => {
    serveAccounts();
    const variables = vi.fn();
    server.use(
      bankApi.mutation("DeleteBankAccount", ({ variables: received }) => {
        variables(received);
        return HttpResponse.json({ data: { deleteBankAccount: true } });
      })
    );
    const service = startService(bankAccountsMachine);

    service.send({ type: "DELETE", id: "bank1" });

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
    expect(variables).toHaveBeenCalledExactlyOnceWith({ id: "bank1" });
  });
});
