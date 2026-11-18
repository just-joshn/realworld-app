import { test, expect } from "../fixtures/auth";
import { createBankAccount } from "../helpers/api";
import { routes } from "../helpers/contracts";
import { buildBankAccount } from "../helpers/data";
import { readJson } from "../helpers/schemas";

test.describe("bank accounts", { tag: ["@e2e", "@bank-accounts"] }, () => {
  test("a user adds a bank account", async ({ page, bankAccountsPage, userApi, fake }) => {
    const account = buildBankAccount(fake);
    await bankAccountsPage.goto();
    await bankAccountsPage.createLink.click();
    await expect(bankAccountsPage.createHeading).toBeVisible();

    await bankAccountsPage.form.save(account);

    await expect(page).toHaveURL(routes.bankAccounts);
    await expect(page.getByText(account.bankName, { exact: true })).toBeVisible();
    expect(await readJson(await userApi.get("/bankAccounts"))).toEqual({
      results: expect.arrayContaining([expect.objectContaining({ ...account, isDeleted: false })]),
    });
  });

  test("a user deletes a bank account and it stays listed as deleted", async ({
    bankAccountsPage,
    userApi,
    fake,
  }) => {
    const account = await createBankAccount(userApi, buildBankAccount(fake));
    await bankAccountsPage.goto();

    await bankAccountsPage.deleteButton(account.id).click();

    await expect(bankAccountsPage.account(account.id)).toContainText(
      `${account.bankName} (Deleted)`
    );
    await expect(bankAccountsPage.deleteButton(account.id)).toBeHidden();
  });

  test("the bank account form explains missing details", async ({ page, bankAccountsPage }) => {
    const { form } = bankAccountsPage;
    await bankAccountsPage.gotoCreate();

    for (const field of [form.bankName, form.routingNumber, form.accountNumber]) {
      await field.focus();
    }
    await form.bankName.focus();

    await expect(page.getByText("Enter a bank name")).toBeVisible();
    await expect(page.getByText("Enter a valid bank routing number")).toBeVisible();
    await expect(page.getByText("Enter a valid bank account number")).toBeVisible();
    await expect(form.saveButton).toBeDisabled();
  });

  test("the bank account form explains invalid details", async ({ page, bankAccountsPage }) => {
    const { form } = bankAccountsPage;
    await bankAccountsPage.gotoCreate();

    await form.bankName.fill("Bank");
    await form.routingNumber.fill("123");
    await form.accountNumber.fill("123");
    await form.bankName.focus();

    await expect(page.getByText("Must contain at least 5 characters")).toBeVisible();
    await expect(page.getByText("Must contain a valid routing number")).toBeVisible();
    await expect(page.getByText("Must contain at least 9 digits")).toBeVisible();

    await form.accountNumber.fill("1234567890123");
    await expect(page.getByText("Must contain no more than 12 digits")).toBeVisible();
    await expect(form.saveButton).toBeDisabled();
  });
});
