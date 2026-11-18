import { test, expect } from "../fixtures/auth";
import { addContact, createTransaction } from "../helpers/api";
import { FUTURE } from "../pages/transaction-feed.page";
import { required } from "../../backend/required";

test.describe("transaction feed", { tag: ["@e2e", "@transactions"] }, () => {
  test(
    "a user browses everyone's, friends', and their own transactions",
    { tag: "@smoke" },
    async ({ page, transactionFeedPage: feed, user, userApi, createUser, apiAs }) => {
      const friend = await test.step("create a friend", async () => {
        const created = await createUser({ balance: 10_000 });
        await addContact(userApi, created.id);
        return created;
      });
      const friendsPayment = await test.step("pay someone as the friend", async () =>
        createTransaction(await apiAs(friend), {
          transactionType: "payment",
          receiverId: (await createUser()).id,
          amount: 3,
          description: "Friend's coffee",
          privacyLevel: "public",
        }));
      const myPayment = await test.step("pay the friend", async () =>
        createTransaction(userApi, {
          transactionType: "payment",
          receiverId: friend.id,
          amount: 4,
          description: "My coffee",
          privacyLevel: "public",
        }));

      await test.step("open everyone's feed", async () => {
        await feed.goto();
        await expect(page.getByText("Public", { exact: true })).toBeVisible();
        await expect(feed.transactions.first()).toBeVisible();
      });

      await test.step("open the friends feed", async () => {
        await feed.friendsTab.click();
        await expect(page).toHaveURL("/contacts");
        await expect(page.getByText("Contacts", { exact: true })).toBeVisible();
        await expect(feed.transaction(friendsPayment.id)).toBeVisible();
      });

      await test.step("open their own feed", async () => {
        await feed.mineTab.click();
        await expect(page).toHaveURL("/personal");
        await expect(page.getByText("Personal", { exact: true })).toBeVisible();
        const mine = feed.transaction(myPayment.id);
        await expect(mine).toContainText(`${user.firstName} ${user.lastName}`);
        await expect(mine).toContainText("My coffee");
        await expect(mine).toContainText("-$4.00");
        await expect(feed.transaction(friendsPayment.id)).toHaveCount(0);
      });

      await test.step("return to everyone's feed", async () => {
        await feed.everyoneTab.click();
        await expect(page).toHaveURL("/");
      });
    }
  );

  test("scrolling to the end of a feed loads the next page", async ({
    page,
    transactionFeedPage: feed,
    userApi,
    createUser,
  }) => {
    const payee = await createUser();
    const payments = [];
    for (let i = 1; i <= 11; i++) {
      payments.push(
        await createTransaction(userApi, {
          transactionType: "payment",
          receiverId: payee.id,
          amount: i,
          description: `Payment ${String(i)}`,
        })
      );
    }
    const oldest = feed.transaction(required(payments[0], "oldest payment").id);
    await feed.goto("mine");
    await expect(feed.transaction(required(payments[10], "newest payment").id)).toBeVisible();
    await expect(oldest).toHaveCount(0);

    await feed.list.hover();
    await expect(async () => {
      await page.mouse.wheel(0, 300);
      await expect(oldest).toBeVisible({ timeout: 1_000 });
    }).toPass();
  });

  test("opening a transaction from the feed shows its details", async ({
    page,
    transactionFeedPage: feed,
    transactionDetailPage,
    userApi,
    createUser,
  }) => {
    const payment = await createTransaction(userApi, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 9,
      description: "Detail check",
    });
    await feed.goto("mine");

    await feed.transaction(payment.id).click();

    await expect(page).toHaveURL(`/transaction/${payment.id}`);
    await expect(transactionDetailPage.heading).toBeVisible();
    await expect(page.getByText("Detail check")).toBeVisible();
    await expect(transactionDetailPage.likeButton).toBeVisible();
  });

  test("filtering to a date range with no activity shows an empty feed until cleared", async ({
    page,
    transactionFeedPage: feed,
  }) => {
    await page.clock.install({ time: FUTURE });
    await feed.goto();
    await expect(feed.transactions.first()).toBeVisible();

    await feed.pickDateRange(new Date("2030-01-01"), new Date("2030-01-10"));

    await expect(feed.emptyHeading).toBeVisible();
    const dateChip = feed.dateFilter("Jan, 1 2030 - Jan, 10 2030");
    await expect(dateChip).toBeVisible();

    await page.keyboard.press("Escape");
    await dateChip.focus();
    await page.keyboard.press("Delete");

    await expect(feed.dateFilter("ALL")).toBeVisible();
    await expect(feed.transactions.first()).toBeVisible();
  });

  test("an empty feed offers to create a transaction", async ({
    page,
    transactionFeedPage: feed,
    newTransactionPage,
  }) => {
    await page.clock.install({ time: FUTURE });
    await feed.goto();
    await feed.pickDateRange(new Date("2030-01-01"), new Date("2030-01-02"));
    await page.keyboard.press("Escape");

    await feed.createTransactionLink.click();

    await expect(page).toHaveURL("/transaction/new");
    await expect(newTransactionPage.search).toBeVisible();
  });

  test("a user narrows the feed by amount", async ({
    page,
    transactionFeedPage: feed,
    userApi,
    createUser,
  }) => {
    const payee = await createUser();
    const small = await createTransaction(userApi, {
      transactionType: "payment",
      receiverId: payee.id,
      amount: 5,
      description: "Small",
    });
    const large = await createTransaction(userApi, {
      transactionType: "payment",
      receiverId: payee.id,
      amount: 50,
      description: "Large",
    });
    await feed.goto("mine");
    await expect(feed.transaction(small.id)).toBeVisible();

    await feed.raiseMinimumAmount();

    await expect(page.getByText("Amount Range: $10 - $1,000")).toBeVisible();
    await expect(feed.transaction(large.id)).toBeVisible();
    await expect(feed.transaction(small.id)).toHaveCount(0);

    await feed.clearButton.click();
    await feed.amountSlider.press("Escape");

    await expect(feed.amountFilter("$0 - $1,000")).toBeVisible();
    await expect(feed.transaction(small.id)).toBeVisible();
  });
});
