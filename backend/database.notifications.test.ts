import { objectContaining, anyString } from "./test-matchers";
import { describe, expect, test, vi } from "vitest";
import {
  buildComment,
  buildCommentNotification,
  buildLike,
  buildLikeNotification,
  buildPaymentNotification,
  buildTransaction,
} from "../test/factories";
import { paymentFromAdaToGrace, seedPeople } from "../test/database";
import {
  NotificationsType,
  PaymentNotificationStatus,
  TransactionRequestStatus,
} from "../src/models";
import {
  createComments,
  createLikes,
  createNotifications,
  formatNotificationForApiResponse,
  getCommentsByTransactionId,
  getLikesByTransactionId,
  getNotificationById,
  getNotificationsByUserId,
  getUnreadNotificationsByUserId,
  updateNotificationById,
} from "./database";

vi.mock(import("lowdb/adapters/FileSync"), async () => ({
  default: (await import("lowdb/adapters/Memory")).default,
}));

const notifiedUsers = (userIds: string[]) =>
  userIds.flatMap((userId) => getNotificationsByUserId(userId).map(() => userId));

describe("createLikes", () => {
  test("a third party's like notifies both sender and receiver", () => {
    seedPeople({ transactions: [paymentFromAdaToGrace()] });

    createLikes("user3", "txn1");

    expect(getLikesByTransactionId("txn1")).toEqual([objectContaining({ userId: "user3" })]);
    expect(notifiedUsers(["user1", "user2", "user3"])).toEqual(["user1", "user2"]);
  });

  test("liking one's own transaction to oneself notifies once", () => {
    seedPeople({
      transactions: [buildTransaction({ id: "txn1", senderId: "user1", receiverId: "user1" })],
    });

    createLikes("user1", "txn1");

    expect(getNotificationsByUserId("user1")).toEqual([objectContaining({ likeId: anyString })]);
  });
});

describe("createComments", () => {
  test("a third party's comment notifies both sender and receiver", () => {
    seedPeople({ transactions: [paymentFromAdaToGrace()] });

    createComments("user3", "txn1", "Nice!");

    expect(getCommentsByTransactionId("txn1")).toEqual([
      objectContaining({ userId: "user3", content: "Nice!" }),
    ]);
    expect(notifiedUsers(["user1", "user2", "user3"])).toEqual(["user1", "user2"]);
  });

  test("commenting on one's own transaction to oneself notifies once", () => {
    seedPeople({
      transactions: [buildTransaction({ id: "txn1", senderId: "user1", receiverId: "user1" })],
    });

    createComments("user1", "txn1", "Note to self");

    expect(getNotificationsByUserId("user1")).toEqual([objectContaining({ commentId: anyString })]);
  });
});

describe("createNotifications", () => {
  test("creates one notification per payload item, by type", () => {
    seedPeople();

    const created = createNotifications("user1", [
      {
        type: NotificationsType.payment,
        transactionId: "txn1",
        status: PaymentNotificationStatus.received,
      },
      { type: NotificationsType.like, transactionId: "txn1", likeId: "like1" },
      { type: NotificationsType.comment, transactionId: "txn1", commentId: "comment1" },
    ]);

    expect(created).toEqual([
      objectContaining({ status: PaymentNotificationStatus.received }),
      objectContaining({ likeId: "like1" }),
      objectContaining({ commentId: "comment1" }),
    ]);
    expect(getNotificationsByUserId("user1")).toHaveLength(3);
  });

  test("skips an item that matches no notification type", () => {
    seedPeople();

    const created = createNotifications("user1", [
      {
        type: NotificationsType.like,
        transactionId: "txn1",
        status: PaymentNotificationStatus.received,
      },
    ]);

    expect(created).toEqual([undefined]);
    expect(getNotificationsByUserId("user1")).toEqual([]);
  });
});

test("updateNotificationById applies the edits", () => {
  seedPeople({ notifications: [buildPaymentNotification({ id: "notif1" })] });

  updateNotificationById("user2", "notif1", { isRead: true });

  expect(getNotificationById("notif1")).toMatchObject({ isRead: true });
});

describe("formatNotificationForApiResponse", () => {
  test("names the notified user for a payment notification", () => {
    seedPeople({ transactions: [paymentFromAdaToGrace()] });

    const formatted = formatNotificationForApiResponse(
      buildPaymentNotification({ userId: "user2" })
    );

    expect(formatted).toMatchObject({ id: "notif1", userFullName: "Grace Hopper" });
  });

  test("names the requester for a request notification", () => {
    seedPeople({
      transactions: [
        buildTransaction({
          id: "txn1",
          senderId: "user3",
          receiverId: "user1",
          requestStatus: TransactionRequestStatus.pending,
        }),
      ],
    });

    const formatted = formatNotificationForApiResponse(
      buildPaymentNotification({ userId: "user1", status: PaymentNotificationStatus.requested })
    );

    expect(formatted.userFullName).toBe("Alan Turing");
  });

  test("names the liker for a like notification", () => {
    seedPeople({
      transactions: [paymentFromAdaToGrace()],
      likes: [buildLike({ id: "like1", userId: "user3" })],
    });

    expect(formatNotificationForApiResponse(buildLikeNotification()).userFullName).toBe(
      "Alan Turing"
    );
  });

  test("names the commenter for a comment notification", () => {
    seedPeople({
      transactions: [paymentFromAdaToGrace()],
      comments: [buildComment({ id: "comment1", userId: "user2" })],
    });

    expect(formatNotificationForApiResponse(buildCommentNotification()).userFullName).toBe(
      "Grace Hopper"
    );
  });
});

test("getUnreadNotificationsByUserId returns unread notifications, newest first", () => {
  seedPeople({
    transactions: [paymentFromAdaToGrace()],
    notifications: [
      buildPaymentNotification({ id: "old", userId: "user2", modifiedAt: new Date("2026-01-01") }),
      buildPaymentNotification({ id: "new", userId: "user2", modifiedAt: new Date("2026-02-01") }),
      buildPaymentNotification({ id: "read", userId: "user2", isRead: true }),
    ],
  });

  expect(getUnreadNotificationsByUserId("user2").map((item: { id: string }) => item.id)).toEqual([
    "new",
    "old",
  ]);
});
