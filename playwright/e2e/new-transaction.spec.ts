import { test, expect } from "../fixtures/auth";
import { getCurrentUser, getUnreadNotifications } from "../helpers/api";
import { routes } from "../helpers/contracts";
import { fullName } from "../helpers/data";

test.describe("new transaction", { tag: ["@e2e", "@transactions"] }, () => {
  test(
    "a user finds someone and pays them",
    { tag: "@smoke" },
    async ({ page, navBar, newTransactionPage, transactionFeedPage, createUser, apiAs, fake }) => {
      const payee = await createUser({ balance: 0 });
      const note = fake.lorem.words(3);
      await transactionFeedPage.goto();
      await navBar.newTransactionLink.click();
      await expect(page).toHaveURL(routes.transactionNew);

      await newTransactionPage.pickRecipient(payee);
      await newTransactionPage.amount.fill("12.50");
      await newTransactionPage.note.fill(note);
      await newTransactionPage.payButton.click();

      await expect(newTransactionPage.heading(`Paid $12.50 for ${note}`)).toBeVisible();
      await expect(newTransactionPage.submittedAlert).toHaveText("Transaction Submitted!");
      expect((await getCurrentUser(await apiAs(payee))).balance).toBe(1_250);

      await newTransactionPage.returnToTransactionsLink.click();
      await transactionFeedPage.mineTab.click();
      await expect(page.getByText(note, { exact: true })).toBeVisible();
    }
  );

  test("a user requests money and then starts another transaction", async ({
    page,
    newTransactionPage,
    user,
    createUser,
    apiAs,
  }) => {
    const payer = await createUser({ balance: 10_000 });
    await newTransactionPage.goto();

    await newTransactionPage.pickRecipient(payer);
    await newTransactionPage.amount.fill("40");
    await newTransactionPage.note.fill("Concert tickets");
    await newTransactionPage.requestButton.click();

    await expect(newTransactionPage.heading("Requested $40.00 for Concert tickets")).toBeVisible();
    const payerApi = await apiAs(payer);
    expect((await getCurrentUser(payerApi)).balance).toBe(10_000);
    expect(await getUnreadNotifications(payerApi)).toContainEqual(
      expect.objectContaining({ status: "requested", userFullName: fullName(user) })
    );

    await newTransactionPage.createAnotherButton.click();
    await expect(page).toHaveURL(routes.transactionNew);
    await expect(newTransactionPage.search).toBeVisible();
  });

  test("searching for someone who does not exist lists nobody", async ({
    newTransactionPage,
    createUser,
  }) => {
    const someone = await createUser();
    await newTransactionPage.goto();
    await newTransactionPage.search.fill(someone.username);
    await expect(newTransactionPage.user(someone)).toBeVisible();

    // Search is fuzzy, so use a query no generated name, username, or email comes close to.
    await newTransactionPage.search.fill("q".repeat(24));

    await expect(newTransactionPage.users).toHaveCount(0);
  });

  test("the payment form explains what is missing before it can be sent", async ({
    page,
    newTransactionPage,
    createUser,
  }) => {
    const { amount, note, payButton, requestButton } = newTransactionPage;
    const payee = await createUser();
    await newTransactionPage.goto();
    await newTransactionPage.pickRecipient(payee);

    await note.focus();
    await expect(page.getByText("Please enter a valid amount")).toBeVisible();
    await amount.fill("12.50");
    await expect(page.getByText("Please enter a note")).toBeVisible();
    await expect(payButton).toBeDisabled();
    await expect(requestButton).toBeDisabled();

    await note.fill("Lunch");

    await expect(payButton).toBeEnabled();
    await expect(requestButton).toBeEnabled();
  });
});
