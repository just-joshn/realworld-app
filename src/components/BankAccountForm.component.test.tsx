import { expect, test, vi } from "vitest";
import { history, renderWithRouter } from "../../test/browser/render";
import BankAccountForm from "./BankAccountForm";

test.each([false, true])("saves a bank account with onboarding set to %s", async (onboarding) => {
  const createBankAccount = vi.fn();
  const screen = await renderWithRouter(
    <BankAccountForm
      userId="user1"
      createBankAccount={createBankAccount}
      onboarding={onboarding}
    />,
    { route: "/bankaccounts/new" }
  );
  await screen.getByPlaceholder("Bank Name").fill("First Bank");
  await screen.getByPlaceholder("Routing Number").fill("987654321");
  await screen.getByPlaceholder("Account Number").fill("123456789");
  await screen.getByRole("button", { name: "Save" }).click();
  expect(createBankAccount).toHaveBeenCalledWith({
    userId: "user1",
    bankName: "First Bank",
    routingNumber: "987654321",
    accountNumber: "123456789",
  });
  await expect
    .poll(() => history.location.pathname)
    .toBe(onboarding ? "/bankaccounts/new" : "/bankaccounts");
  await expect.element(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});

test("explains missing and invalid bank details", async () => {
  const screen = await renderWithRouter(
    <BankAccountForm userId="user1" createBankAccount={vi.fn()} />
  );
  for (const placeholder of ["Bank Name", "Routing Number", "Account Number"])
    await screen.getByPlaceholder(placeholder).click();
  await screen.getByPlaceholder("Bank Name").click();
  for (const message of [
    "Enter a bank name",
    "Enter a valid bank routing number",
    "Enter a valid bank account number",
  ])
    await expect.element(screen.getByText(message)).toBeVisible();
  await screen.getByPlaceholder("Bank Name").fill("Bank");
  await screen.getByPlaceholder("Routing Number").fill("123");
  await screen.getByPlaceholder("Account Number").fill("123");
  for (const message of [
    "Must contain at least 5 characters",
    "Must contain a valid routing number",
    "Must contain at least 9 digits",
  ])
    await expect.element(screen.getByText(message)).toBeVisible();
  await screen.getByPlaceholder("Account Number").fill("1234567890123");
  await expect.element(screen.getByText("Must contain no more than 12 digits")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
