import { test, expect } from "../fixtures/base";
import { addContact, createTransaction } from "../helpers/api";

test.describe("GET /transactions/contacts", { tag: ["@api", "@transactions"] }, () => {
  test("lists transactions that involve the user's contacts", async ({ createUser, apiAs }) => {
    const me = await createUser();
    const friend = await createUser({ balance: 10_000 });
    const stranger = await createUser({ balance: 10_000 });
    const myApi = await apiAs(me);
    await addContact(myApi, friend.id);
    const friendsPayment = await createTransaction(await apiAs(friend), {
      transactionType: "payment",
      receiverId: stranger.id,
      amount: 3,
      description: "Friend's payment",
    });
    await createTransaction(await apiAs(stranger), {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 4,
      description: "Stranger's payment",
    });

    const response = await myApi.get("/transactions/contacts");

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      pageData: { page: 1, limit: 10, hasNextPages: false, totalPages: 1 },
      results: [expect.objectContaining({ id: friendsPayment.id })],
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/transactions/contacts");

    expect(response.status()).toBe(401);
  });
});
