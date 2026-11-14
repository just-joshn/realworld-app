import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { buildBankAccount } from "../../test/factories";
import BankAccountList from "./BankAccountList";

test("explains when there are no bank accounts", async () => {
  const screen = await render(<BankAccountList bankAccounts={[]} deleteBankAccount={vi.fn()} />);
  await expect.element(screen.getByRole("heading", { name: "No Bank Accounts" })).toBeVisible();
});

test("allows deleting active accounts but labels deleted accounts", async () => {
  const deleteBankAccount = vi.fn();
  const screen = await render(
    <BankAccountList
      bankAccounts={[
        buildBankAccount(),
        buildBankAccount({ id: "bank2", bankName: "Old Bank", isDeleted: true }),
      ]}
      deleteBankAccount={deleteBankAccount}
    />
  );
  await expect.element(screen.getByText("First Bank")).toBeVisible();
  await expect.element(screen.getByText("Old Bank (Deleted)")).toBeVisible();
  await screen.getByRole("button", { name: "Delete" }).click();
  expect(deleteBankAccount).toHaveBeenCalledExactlyOnceWith({ id: "bank1" });
});
