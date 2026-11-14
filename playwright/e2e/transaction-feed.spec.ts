import { test, expect } from "../fixtures/auth";
import { addContact, createTransaction } from "../helpers/api";
import { FUTURE, pickDateRange, raiseMinimumAmount } from "../helpers/feed";
import { required } from "../../backend/required";

test.describe("transaction feed", { tag: ["@e2e", "@transactions"] }, () => {
  test(
    "a user browses everyone's, friends', and their own transactions",
    { tag: "@smoke" },
    async ({ page, user, userApi, createUser, apiAs }) => {
      const friend = await createUser({ balance: 10_000 });
      await addContact(userApi, friend.id);
      const friendsPayment = await createTransaction(await apiAs(friend), {
        transactionType: "payment",
        receiverId: (await createUser()).id,
        amount: 3,
        description: "Friend's coffee",
        privacyLevel: "public",
      });
      const myPayment = await createTransaction(userApi, {
        transactionType: "payment",
        receiverId: friend.id,
        amount: 4,
        description: "My coffee",
        privacyLevel: "public",
      });
      await page.goto("/");

      await expect(page.getByText("Public", { exact: true })).toBeVisible();
      await expect(page.getByRole("listitem").first()).toBeVisible();

      await page.getByRole("tab", { name: "Friends" }).click();
      await expect(page).toHaveURL("/contacts");
      await expect(page.getByText("Contacts", { exact: true })).toBeVisible();
      await expect(page.getByTestId(`transaction-item-${friendsPayment.id}`)).toBeVisible();

      await page.getByRole("tab", { name: "Mine" }).click();
      await expect(page).toHaveURL("/personal");
      await expect(page.getByText("Personal", { exact: true })).toBeVisible();
      const mine = page.getByTestId(`transaction-item-${myPayment.id}`);
      await expect(mine).toContainText(`${user.firstName} ${user.lastName}`);
      await expect(mine).toContainText("My coffee");
      await expect(mine).toContainText("-$4.00");
      await expect(page.getByTestId(`transaction-item-${friendsPayment.id}`)).toHaveCount(0);

      await page.getByRole("tab", { name: "Everyone" }).click();
      await expect(page).toHaveURL("/");
    }
  );

  test("scrolling to the end of a feed loads the next page", async ({
    page,
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
    const oldest = page.getByTestId(
      `transaction-item-${required(payments[0], "oldest payment").id}`
    );
    await page.goto("/personal");
    await expect(
      page.getByTestId(`transaction-item-${required(payments[10], "newest payment").id}`)
    ).toBeVisible();
    await expect(oldest).toHaveCount(0);

    await page.getByRole("grid").hover();
    await expect(async () => {
      await page.mouse.wheel(0, 300);
      await expect(oldest).toBeVisible({ timeout: 1_000 });
    }).toPass();
  });

  test("opening a transaction from the feed shows its details", async ({
    page,
    userApi,
    createUser,
  }) => {
    const payment = await createTransaction(userApi, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 9,
      description: "Detail check",
    });
    await page.goto("/personal");

    await page.getByTestId(`transaction-item-${payment.id}`).click();

    await expect(page).toHaveURL(`/transaction/${payment.id}`);
    await expect(page.getByRole("heading", { name: "Transaction Detail" })).toBeVisible();
    await expect(page.getByText("Detail check")).toBeVisible();
    await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
  });

  test("filtering to a date range with no activity shows an empty feed until cleared", async ({
    page,
  }) => {
    await page.clock.install({ time: FUTURE });
    await page.goto("/");
    await expect(page.getByRole("listitem").first()).toBeVisible();

    await pickDateRange(page, new Date("2030-01-01"), new Date("2030-01-10"));

    await expect(page.getByRole("heading", { name: "No Transactions" })).toBeVisible();
    const dateChip = page.getByRole("button", { name: "Date: Jan, 1 2030 - Jan, 10 2030" });
    await expect(dateChip).toBeVisible();

    await page.keyboard.press("Escape");
    await dateChip.focus();
    await page.keyboard.press("Delete");

    await expect(page.getByRole("button", { name: "Date: ALL" })).toBeVisible();
    await expect(page.getByRole("listitem").first()).toBeVisible();
  });

  test("an empty feed offers to create a transaction", async ({ page }) => {
    await page.clock.install({ time: FUTURE });
    await page.goto("/");
    await pickDateRange(page, new Date("2030-01-01"), new Date("2030-01-02"));
    await page.keyboard.press("Escape");

    await page.getByRole("link", { name: "Create A Transaction" }).click();

    await expect(page).toHaveURL("/transaction/new");
    await expect(page.getByPlaceholder("Search...")).toBeVisible();
  });

  test("a user narrows the feed by amount", async ({ page, userApi, createUser }) => {
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
    await page.goto("/personal");
    await expect(page.getByTestId(`transaction-item-${small.id}`)).toBeVisible();

    await raiseMinimumAmount(page);

    await expect(page.getByText("Amount Range: $10 - $1,000")).toBeVisible();
    await expect(page.getByTestId(`transaction-item-${large.id}`)).toBeVisible();
    await expect(page.getByTestId(`transaction-item-${small.id}`)).toHaveCount(0);

    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByRole("slider").first().press("Escape");

    await expect(page.getByRole("button", { name: "Amount: $0 - $1,000" })).toBeVisible();
    await expect(page.getByTestId(`transaction-item-${small.id}`)).toBeVisible();
  });
});
