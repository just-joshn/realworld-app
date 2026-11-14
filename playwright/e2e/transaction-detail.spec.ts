import { test, expect } from "../fixtures/auth";
import { createTransaction, getCurrentUser, getTransaction } from "../helpers/api";
import { fullName } from "../helpers/data";

test.describe("transaction detail", { tag: ["@e2e", "@transactions"] }, () => {
  test("a user likes a transaction once", async ({ page, userApi, createUser }) => {
    const payment = await createTransaction(userApi, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 3,
      description: "Likeable",
    });
    await page.goto(`/transaction/${payment.id}`);
    const likeCount = page.getByTestId(`transaction-like-count-${payment.id}`);
    const like = page.getByRole("button", { name: "Like" });
    await expect(likeCount).toHaveText("0");

    await like.click();

    await expect(likeCount).toHaveText("1");
    await expect(like).toBeDisabled();
  });

  test("a user comments on a transaction", async ({ page, userApi, createUser, fake }) => {
    const payment = await createTransaction(userApi, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 3,
      description: "Talkative",
    });
    const comment = fake.lorem.sentence();
    await page.goto(`/transaction/${payment.id}`);
    await expect(page.getByRole("heading", { name: "Transaction Detail" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comments" })).toBeHidden();

    await page.getByPlaceholder("Write a comment...").fill(comment);
    await page.getByPlaceholder("Write a comment...").press("Enter");

    await expect(page.getByRole("heading", { name: "Comments" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: comment })).toBeVisible();
  });

  test("only the person asked for money can answer a request", async ({
    page,
    user,
    userApi,
    createUser,
  }) => {
    const payer = await createUser();
    const request = await createTransaction(userApi, {
      transactionType: "request",
      receiverId: payer.id,
      amount: 10,
      description: "Pay me back",
    });

    await page.goto(`/transaction/${request.id}`);

    await expect(page.getByText(`${fullName(user)} requested ${fullName(payer)}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept Request" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Reject Request" })).toBeHidden();
  });

  test(
    "the person asked for money accepts the request",
    { tag: "@critical" },
    async ({ page, user, userApi, createUser, apiAs }) => {
      const requester = await createUser({ balance: 0 });
      const requesterApi = await apiAs(requester);
      const request = await createTransaction(requesterApi, {
        transactionType: "request",
        receiverId: user.id,
        amount: 10,
        description: "Pay me back",
      });
      const balanceBefore = (await getCurrentUser(userApi)).balance;
      await page.goto(`/transaction/${request.id}`);
      await expect(
        page.getByText(`${fullName(requester)} requested ${fullName(user)}`)
      ).toBeVisible();

      await page.getByRole("button", { name: "Accept Request" }).click();

      await expect(
        page.getByText(`${fullName(requester)} charged ${fullName(user)}`)
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Accept Request" })).toBeHidden();
      await expect(page.getByRole("button", { name: "Reject Request" })).toBeHidden();
      expect((await getCurrentUser(requesterApi)).balance).toBe(1_000);
      expect((await getCurrentUser(userApi)).balance).toBe(balanceBefore - 1_000);
    }
  );

  test("the person asked for money rejects the request", async ({
    page,
    user,
    userApi,
    createUser,
    apiAs,
  }) => {
    const requester = await createUser({ balance: 0 });
    const requesterApi = await apiAs(requester);
    const request = await createTransaction(requesterApi, {
      transactionType: "request",
      receiverId: user.id,
      amount: 10,
      description: "Pay me back",
    });
    await page.goto(`/transaction/${request.id}`);

    await page.getByRole("button", { name: "Reject Request" }).click();

    await expect(page.getByRole("button", { name: "Reject Request" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Accept Request" })).toBeHidden();
    await expect(
      page.getByText(`${fullName(requester)} requested ${fullName(user)}`)
    ).toBeVisible();
    expect((await getTransaction(userApi, request.id)).requestStatus).toBe("rejected");
    expect((await getCurrentUser(requesterApi)).balance).toBe(0);
  });
});
