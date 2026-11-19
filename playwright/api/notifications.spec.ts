import { test, expect } from "../fixtures/base";
import { commentSchema, likeSchema, readBody, readJson } from "../helpers/schemas";
import * as yup from "yup";
import { createTransaction, getUnreadNotifications } from "../helpers/api";
import { fullName } from "../helpers/data";
import { required } from "../../backend/required";

test.describe("GET /notifications", { tag: ["@api", "@notifications"] }, () => {
  test("lists unread notifications, newest first", async ({ createUser, apiAs }) => {
    const me = await createUser();
    const friend = await createUser({ balance: 1_000 });
    const friendApi = await apiAs(friend);
    const payment = await createTransaction(friendApi, {
      transactionType: "payment",
      receiverId: me.id,
      amount: 1,
      description: "Paid",
    });
    const request = await createTransaction(friendApi, {
      transactionType: "request",
      receiverId: me.id,
      amount: 2,
      description: "Owed",
    });

    const response = await (await apiAs(me)).get("/notifications");

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      results: [
        expect.objectContaining({
          userId: me.id,
          transactionId: request.id,
          status: "requested",
          isRead: false,
          userFullName: fullName(friend),
        }),
        expect.objectContaining({
          userId: me.id,
          transactionId: payment.id,
          status: "received",
          isRead: false,
        }),
      ],
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/notifications");

    expect(response.status()).toBe(401);
  });
});

test.describe("PATCH /notifications/:notificationId", { tag: ["@api", "@notifications"] }, () => {
  test("marks the notification as read", async ({ createUser, apiAs }) => {
    const me = await createUser();
    const myApi = await apiAs(me);
    await createTransaction(await apiAs(await createUser({ balance: 1_000 })), {
      transactionType: "payment",
      receiverId: me.id,
      amount: 1,
      description: "Paid",
    });
    const notification = required((await getUnreadNotifications(myApi)).at(0), "notification");

    const response = await myApi.patch(`/notifications/${notification.id}`, {
      data: { isRead: true },
    });

    expect(response.status()).toBe(204);
    expect(await getUnreadNotifications(myApi)).toEqual([]);
  });

  test("422 — isRead is not a boolean", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.patch("/notifications/abc123", { data: { isRead: "yes" } });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: [expect.objectContaining({ path: "isRead" })],
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.patch("/notifications/abc123", { data: { isRead: true } });

    expect(response.status()).toBe(401);
  });
});

test.describe("POST /notifications/bulk", { tag: ["@api", "@notifications"] }, () => {
  test("creates payment, like, and comment notifications for the user", async ({
    createUser,
    apiAs,
  }) => {
    const me = await createUser({ balance: 1_000 });
    const myApi = await apiAs(me);
    const transaction = await createTransaction(myApi, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 1,
      description: "Bulk",
    });
    await myApi.post(`/likes/${transaction.id}`);
    await myApi.post(`/comments/${transaction.id}`, { data: { content: "Hi" } });
    const { likes } = await readBody(
      await myApi.get(`/likes/${transaction.id}`),
      yup.object({ likes: yup.array(likeSchema).defined() })
    );
    const { comments } = await readBody(
      await myApi.get(`/comments/${transaction.id}`),
      yup.object({ comments: yup.array(commentSchema).defined() })
    );
    const likeId = required(likes.at(0), "like").id;
    const commentId = required(comments.at(0), "comment").id;
    const items = [
      { type: "payment", transactionId: transaction.id, status: "incomplete" },
      { type: "like", transactionId: transaction.id, likeId },
      { type: "comment", transactionId: transaction.id, commentId },
    ];

    const response = await myApi.post("/notifications/bulk", { data: { items } });

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      results: [
        expect.objectContaining({ userId: me.id, status: "incomplete", isRead: false }),
        expect.objectContaining({ userId: me.id, likeId, isRead: false }),
        expect.objectContaining({ userId: me.id, commentId, isRead: false }),
      ],
    });
  });
});

test.describe("POST /notifications/bulk", { tag: ["@api", "@notifications"] }, () => {
  test("422 — unknown notification type", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.post("/notifications/bulk", {
      data: { items: [{ type: "poke", transactionId: "abc123" }] },
    });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: [expect.objectContaining({ path: "items[0].type" })],
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.post("/notifications/bulk", { data: { items: [] } });

    expect(response.status()).toBe(401);
  });
});
