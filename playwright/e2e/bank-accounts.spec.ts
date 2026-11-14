import { test, expect } from "../fixtures/auth";
import { createBankAccount } from "../helpers/api";
import { buildBankAccount } from "../helpers/data";
import { readJson } from "../helpers/schemas";

test.describe("bank accounts", { tag: ["@e2e", "@bank-accounts"] }, () => {
  test("a user adds a bank account", async ({ page, userApi, fake }) => {
    const account = buildBankAccount(fake);
    await page.goto("/bankaccounts");
    await page.getByRole("link", { name: "Create" }).click();
    await expect(page.getByRole("heading", { name: "Create Bank Account" })).toBeVisible();

    await page.getByPlaceholder("Bank Name").fill(account.bankName);
    await page.getByPlaceholder("Routing Number").fill(account.routingNumber);
    await page.getByPlaceholder("Account Number").fill(account.accountNumber);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page).toHaveURL("/bankaccounts");
    await expect(page.getByText(account.bankName, { exact: true })).toBeVisible();
    expect(await readJson(await userApi.get("/bankAccounts"))).toEqual({
      results: expect.arrayContaining([expect.objectContaining({ ...account, isDeleted: false })]),
    });
  });

  test("a user deletes a bank account and it stays listed as deleted", async ({
    page,
    userApi,
    fake,
  }) => {
    const account = await createBankAccount(userApi, buildBankAccount(fake));
    const item = page.getByTestId(`bankaccount-list-item-${account.id}`);
    await page.goto("/bankaccounts");

    await item.getByRole("button", { name: "Delete" }).click();

    await expect(item).toContainText(`${account.bankName} (Deleted)`);
    await expect(item.getByRole("button", { name: "Delete" })).toBeHidden();
  });

  test("the bank account form explains missing details", async ({ page }) => {
    await page.goto("/bankaccounts/new");

    for (const placeholder of ["Bank Name", "Routing Number", "Account Number"]) {
      await page.getByPlaceholder(placeholder).focus();
    }
    await page.getByPlaceholder("Bank Name").focus();

    await expect(page.getByText("Enter a bank name")).toBeVisible();
    await expect(page.getByText("Enter a valid bank routing number")).toBeVisible();
    await expect(page.getByText("Enter a valid bank account number")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("the bank account form explains invalid details", async ({ page }) => {
    await page.goto("/bankaccounts/new");

    await page.getByPlaceholder("Bank Name").fill("Bank");
    await page.getByPlaceholder("Routing Number").fill("123");
    await page.getByPlaceholder("Account Number").fill("123");
    await page.getByPlaceholder("Bank Name").focus();

    await expect(page.getByText("Must contain at least 5 characters")).toBeVisible();
    await expect(page.getByText("Must contain a valid routing number")).toBeVisible();
    await expect(page.getByText("Must contain at least 9 digits")).toBeVisible();

    await page.getByPlaceholder("Account Number").fill("1234567890123");
    await expect(page.getByText("Must contain no more than 12 digits")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
