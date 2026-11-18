import { test, expect } from "../fixtures/auth";
import { createTransaction, getCurrentUser, getTransaction } from "../helpers/api";
import { fullName } from "../helpers/data";

test.describe("transaction detail", { tag: ["@e2e", "@transactions"] }, () => {
  test("a user likes a transaction once", async ({
    transactionDetailPage,
    userApi,
    createUser,
  }) => {
    const payment = await createTransaction(userApi, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 3,
      description: "Likeable",
    });
    await transactionDetailPage.goto(payment.id);
    const likeCount = transactionDetailPage.likeCount(payment.id);
    await expect(likeCount).toHaveText("0");

    await transactionDetailPage.likeButton.click();

    await expect(likeCount).toHaveText("1");
    await expect(transactionDetailPage.likeButton).toBeDisabled();
  });

  test("a user comments on a transaction", async ({
    transactionDetailPage,
    userApi,
    createUser,
    fake,
  }) => {
    const payment = await createTransaction(userApi, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 3,
      description: "Talkative",
    });
    const comment = fake.lorem.sentence();
    await transactionDetailPage.goto(payment.id);
    await expect(transactionDetailPage.heading).toBeVisible();
    await expect(transactionDetailPage.commentsHeading).toBeHidden();

    await transactionDetailPage.addComment(comment);

    await expect(transactionDetailPage.commentsHeading).toBeVisible();
    await expect(transactionDetailPage.comment(comment)).toBeVisible();
  });

  test("only the person asked for money can answer a request", async ({
    page,
    transactionDetailPage,
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

    await transactionDetailPage.goto(request.id);

    await expect(page.getByText(`${fullName(user)} requested ${fullName(payer)}`)).toBeVisible();
    await expect(transactionDetailPage.acceptButton).toBeHidden();
    await expect(transactionDetailPage.rejectButton).toBeHidden();
  });

  test(
    "the person asked for money accepts the request",
    { tag: "@critical" },
    async ({ page, transactionDetailPage, user, userApi, createUser, apiAs }) => {
      const requester = await createUser({ balance: 0 });
      const requesterApi = await apiAs(requester);
      const request = await createTransaction(requesterApi, {
        transactionType: "request",
        receiverId: user.id,
        amount: 10,
        description: "Pay me back",
      });
      const balanceBefore = (await getCurrentUser(userApi)).balance;
      await transactionDetailPage.goto(request.id);
      await expect(
        page.getByText(`${fullName(requester)} requested ${fullName(user)}`)
      ).toBeVisible();

      await transactionDetailPage.acceptButton.click();

      await expect(
        page.getByText(`${fullName(requester)} charged ${fullName(user)}`)
      ).toBeVisible();
      await expect(transactionDetailPage.acceptButton).toBeHidden();
      await expect(transactionDetailPage.rejectButton).toBeHidden();
      expect((await getCurrentUser(requesterApi)).balance).toBe(1_000);
      expect((await getCurrentUser(userApi)).balance).toBe(balanceBefore - 1_000);
    }
  );

  test("the person asked for money rejects the request", async ({
    page,
    transactionDetailPage,
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
    await transactionDetailPage.goto(request.id);

    await transactionDetailPage.rejectButton.click();

    await expect(transactionDetailPage.rejectButton).toBeHidden();
    await expect(transactionDetailPage.acceptButton).toBeHidden();
    await expect(
      page.getByText(`${fullName(requester)} requested ${fullName(user)}`)
    ).toBeVisible();
    expect((await getTransaction(userApi, request.id)).requestStatus).toBe("rejected");
    expect((await getCurrentUser(requesterApi)).balance).toBe(0);
  });
});
