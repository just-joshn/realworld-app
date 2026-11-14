import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { getCurrentUser, getUnreadNotifications } from "../helpers/api";
import { fullName, type TestUser } from "../helpers/data";

async function pickRecipient(page: Page, recipient: TestUser) {
  await page.getByPlaceholder("Search...").fill(recipient.username);
  await page
    .getByRole("listitem")
    .filter({ hasText: fullName(recipient) })
    .click();
  await expect(page.getByRole("heading", { name: fullName(recipient) })).toBeVisible();
}

test.describe("new transaction", { tag: ["@e2e", "@transactions"] }, () => {
  test(
    "a user finds someone and pays them",
    { tag: "@smoke" },
    async ({ page, createUser, apiAs, fake }) => {
      const payee = await createUser({ balance: 0 });
      const note = fake.lorem.words(3);
      await page.goto("/");
      await page.getByRole("link", { name: "New" }).click();
      await expect(page).toHaveURL("/transaction/new");

      await pickRecipient(page, payee);
      await page.getByPlaceholder("Amount").fill("12.50");
      await page.getByPlaceholder("Add a note").fill(note);
      await page.getByRole("button", { name: "Pay" }).click();

      await expect(page.getByRole("heading", { name: `Paid $12.50 for ${note}` })).toBeVisible();
      await expect(page.getByRole("alert")).toHaveText("Transaction Submitted!");
      expect((await getCurrentUser(await apiAs(payee))).balance).toBe(1_250);

      await page.getByRole("link", { name: "Return To Transactions" }).click();
      await page.getByRole("tab", { name: "Mine" }).click();
      await expect(page.getByText(note, { exact: true })).toBeVisible();
    }
  );

  test("a user requests money and then starts another transaction", async ({
    page,
    user,
    createUser,
    apiAs,
  }) => {
    const payer = await createUser({ balance: 10_000 });
    await page.goto("/transaction/new");

    await pickRecipient(page, payer);
    await page.getByPlaceholder("Amount").fill("40");
    await page.getByPlaceholder("Add a note").fill("Concert tickets");
    await page.getByRole("button", { name: "Request" }).click();

    await expect(
      page.getByRole("heading", { name: "Requested $40.00 for Concert tickets" })
    ).toBeVisible();
    const payerApi = await apiAs(payer);
    expect((await getCurrentUser(payerApi)).balance).toBe(10_000);
    expect(await getUnreadNotifications(payerApi)).toContainEqual(
      expect.objectContaining({ status: "requested", userFullName: fullName(user) })
    );

    await page.getByRole("button", { name: "Create Another Transaction" }).click();
    await expect(page).toHaveURL("/transaction/new");
    await expect(page.getByPlaceholder("Search...")).toBeVisible();
  });

  test("searching for someone who does not exist lists nobody", async ({ page, createUser }) => {
    const someone = await createUser();
    await page.goto("/transaction/new");
    await page.getByPlaceholder("Search...").fill(someone.username);
    await expect(page.getByRole("listitem").filter({ hasText: fullName(someone) })).toBeVisible();

    // Search is fuzzy, so use a query no generated name, username, or email comes close to.
    await page.getByPlaceholder("Search...").fill("q".repeat(24));

    await expect(page.getByRole("listitem")).toHaveCount(0);
  });

  test("the payment form explains what is missing before it can be sent", async ({
    page,
    createUser,
  }) => {
    const payee = await createUser();
    await page.goto("/transaction/new");
    await pickRecipient(page, payee);

    await page.getByPlaceholder("Add a note").focus();
    await expect(page.getByText("Please enter a valid amount")).toBeVisible();
    await page.getByPlaceholder("Amount").fill("12.50");
    await expect(page.getByText("Please enter a note")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Request" })).toBeDisabled();

    await page.getByPlaceholder("Add a note").fill("Lunch");

    await expect(page.getByRole("button", { name: "Pay" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Request" })).toBeEnabled();
  });
});
