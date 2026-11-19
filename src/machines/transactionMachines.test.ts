import { http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";
import { server } from "../../test/msw";
import { startService } from "../../test/machines";
import { buildTransactionResponseItem, buildUser } from "../../test/factories";
import { createTransactionMachine } from "./createTransactionMachine";
import { transactionDetailMachine } from "./transactionDetailMachine";

// Both machines import authService, which reads localStorage while it is imported.
await vi.hoisted(async () => {
  const { createMemoryStorage } = await import("../../test/memoryStorage");
  vi.stubGlobal("localStorage", createMemoryStorage());
});

vi.mock(import("../utils/historyUtils"), async () => {
  const { UNSAFE_createMemoryHistory } = await import("react-router");
  return { history: UNSAFE_createMemoryHistory({ v5Compat: true }) };
});

const api = "http://localhost:3001";

function serveTransaction(id: string) {
  const fetched = vi.fn();
  server.use(
    http.get(`${api}/transactions/:id`, ({ params }) => {
      fetched(params["id"]);
      return HttpResponse.json({
        transaction: buildTransactionResponseItem({ id: String(params["id"]) }),
      });
    })
  );
  return { fetched, id };
}

describe("transactionDetailMachine", () => {
  test("FETCH loads the transaction named in the event", async () => {
    const { fetched } = serveTransaction("txn1");
    const service = startService(transactionDetailMachine);

    service.send({ type: "FETCH", transactionId: "txn1" });

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
    expect(service.getSnapshot().context.results).toEqual([
      expect.objectContaining({ id: "txn1" }),
    ]);
    expect(fetched).toHaveBeenCalledExactlyOnceWith("txn1");
  });

  test.for([
    { entity: "LIKE", route: "likes" },
    { entity: "COMMENT", route: "comments" },
  ])(
    "CREATE $entity posts to /$route and reloads the loaded transaction",
    async ({ entity, route }) => {
      const { fetched } = serveTransaction("txn1");
      const posted = vi.fn();
      server.use(
        http.post(`${api}/${route}/:id`, async ({ request, params }) => {
          posted({ id: params["id"], body: await request.json() });
          return new HttpResponse(null, { status: 200 });
        })
      );
      const service = startService(transactionDetailMachine);
      service.send({ type: "FETCH", transactionId: "txn1" });
      await expect.poll(() => service.getSnapshot().matches("success")).toBe(true);

      service.send({ type: "CREATE", entity, transactionId: "txn1", content: "Nice!" });

      await expect.poll(() => fetched.mock.calls.length).toBe(2);
      expect(fetched).toHaveBeenLastCalledWith("txn1");
      expect(posted).toHaveBeenCalledExactlyOnceWith({
        id: "txn1",
        body: { transactionId: "txn1", content: "Nice!" },
      });
    }
  );

  test("UPDATE patches the transaction named in the event when none is loaded", async () => {
    serveTransaction("txn1");
    const patched = vi.fn();
    server.use(
      http.patch(`${api}/transactions/:id`, async ({ request, params }) => {
        patched({ id: params["id"], body: await request.json() });
        return new HttpResponse(null, { status: 204 });
      })
    );
    const service = startService(transactionDetailMachine);

    service.send({ type: "UPDATE", id: "txn1", requestStatus: "accepted" });

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
    expect(patched).toHaveBeenCalledExactlyOnceWith({
      id: "txn1",
      body: { id: "txn1", requestStatus: "accepted" },
    });
  });
});

describe("createTransactionMachine", () => {
  const sender = buildUser({ id: "user1" });
  const receiver = buildUser({ id: "user2", firstName: "Grace" });
  const details = {
    amount: "25",
    description: "Lunch",
    receiverId: "user2",
    senderId: "user1",
    transactionType: "payment",
  };

  // Every test that sends CREATE waits for its POST, so no request outlives its test.
  function servePostTransaction() {
    const posted = vi.fn();
    server.use(
      http.post(`${api}/transactions`, async ({ request }) => {
        posted(await request.json());
        return HttpResponse.json({ transaction: { id: "txn1" } });
      })
    );
    return posted;
  }

  test("SET_USERS moves to step two", () => {
    const service = startService(createTransactionMachine);

    service.send({ type: "SET_USERS", sender, receiver });

    expect(service.getSnapshot().value).toBe("stepTwo");
  });

  test("CREATE moves to step three and posts the transaction", async () => {
    const posted = servePostTransaction();
    const service = startService(createTransactionMachine);
    service.send({ type: "SET_USERS", sender, receiver });

    service.send({ type: "CREATE", ...details });

    expect(service.getSnapshot().value).toBe("stepThree");
    await expect.poll(() => posted.mock.calls).toEqual([[details]]);
  });

  test("RESET returns to step one", async () => {
    const posted = servePostTransaction();
    const service = startService(createTransactionMachine);
    service.send({ type: "SET_USERS", sender, receiver });
    service.send({ type: "CREATE", ...details });
    await expect.poll(() => posted.mock.calls.length).toBe(1);

    service.send({ type: "RESET" });

    expect(service.getSnapshot().value).toBe("stepOne");
  });

  test("SET_USERS stores the sender and receiver", () => {
    const service = startService(createTransactionMachine);

    service.send({ type: "SET_USERS", sender, receiver });

    expect(service.getSnapshot().context).toMatchObject({ sender, receiver });
  });

  test("CREATE stores the transaction details", async () => {
    const posted = servePostTransaction();
    const service = startService(createTransactionMachine);
    service.send({ type: "SET_USERS", sender, receiver });

    service.send({ type: "CREATE", ...details });
    await expect.poll(() => posted.mock.calls.length).toBe(1);

    expect(service.getSnapshot().context.transactionDetails).toMatchObject(details);
  });
});
