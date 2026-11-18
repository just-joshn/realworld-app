import { test, expect } from "../fixtures/auth";
import { createTransaction, getUnreadNotifications } from "../helpers/api";
import { required } from "../../backend/required";

test.describe("notifications on a phone", { tag: ["@e2e", "@notifications"] }, () => {
  test("a user marks a notification as read", async ({
    notificationsPage,
    user,
    userApi,
    createUser,
    apiAs,
  }) => {
    const payment = await createTransaction(await apiAs(await createUser({ balance: 1_000 })), {
      transactionType: "payment",
      receiverId: user.id,
      amount: 1,
      description: "Gift",
    });
    const notification = required(
      (await getUnreadNotifications(userApi)).find(
        ({ transactionId }) => transactionId === payment.id
      ),
      "payment notification"
    );
    await notificationsPage.goto();

    await notificationsPage.markAsReadButton(notification.id).click();

    await expect(notificationsPage.notification(notification.id)).toHaveCount(0);
    expect(await getUnreadNotifications(userApi)).not.toContainEqual(
      expect.objectContaining({ id: notification.id })
    );
  });
});
