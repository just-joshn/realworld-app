import { object, string } from "yup";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";
import { apiUrl, worker } from "../../test/browser/msw";
import { history, renderWithRouter } from "../../test/browser/render";
import { login, startAuth, startBankAccounts } from "../../test/browser/auth-settings-bank-helpers";
import { buildBankAccount } from "../../test/factories";
import BankAccountsContainer from "./BankAccountsContainer";

test("creates an account from the account list", async () => {
  const received = vi.fn();
  let accounts: ReturnType<typeof buildBankAccount>[] = [];
  worker.use(
    http.post(apiUrl("/graphql"), async ({ request }) => {
      const body = object({
        operationName: string().required(),
        variables: object().default({}),
      }).validateSync(await request.json());
      if (body.operationName === "CreateBankAccount") {
        received(body.variables);
        accounts = [buildBankAccount()];
        return HttpResponse.json({ data: { createBankAccount: accounts[0] } });
      }
      return HttpResponse.json({ data: { listBankAccount: accounts } });
    })
  );
  const authService = await login();
  const bankAccountsService = startBankAccounts();
  const screen = await renderWithRouter(
    <Routes>
      <Route
        path="/bankaccounts/new"
        element={
          <BankAccountsContainer
            authService={authService}
            bankAccountsService={bankAccountsService}
          />
        }
      />
    </Routes>,
    { route: "/bankaccounts/new" }
  );
  await expect.element(screen.getByRole("heading", { name: "Create Bank Account" })).toBeVisible();
  await screen.getByPlaceholder("Bank Name").fill("First Bank");
  await screen.getByPlaceholder("Routing Number").fill("987654321");
  await screen.getByPlaceholder("Account Number").fill("123456789");
  await screen.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => history.location.pathname).toBe("/bankaccounts");
  await expect.poll(() => received.mock.calls.length).toBe(1);
  expect(received).toHaveBeenCalledWith({
    userId: "user1",
    bankName: "First Bank",
    routingNumber: "987654321",
    accountNumber: "123456789",
  });
});

test("deletes an account from the list", async () => {
  let deleted = false;
  const received = vi.fn();
  worker.use(
    http.post(apiUrl("/graphql"), async ({ request }) => {
      const body = object({
        operationName: string().required(),
        variables: object().default({}),
      }).validateSync(await request.json());
      if (body.operationName === "DeleteBankAccount") {
        deleted = true;
        received(body.variables);
        return HttpResponse.json({ data: { deleteBankAccount: true } });
      }
      return HttpResponse.json({
        data: { listBankAccount: [buildBankAccount({ isDeleted: deleted })] },
      });
    })
  );
  const screen = await renderWithRouter(
    <BankAccountsContainer authService={await login()} bankAccountsService={startBankAccounts()} />,
    { route: "/bankaccounts" }
  );
  await screen.getByRole("button", { name: "Delete" }).click();
  await expect.element(screen.getByText("First Bank (Deleted)")).toBeVisible();
  expect(received).toHaveBeenCalledWith({ id: "bank1" });
});

test("offers creation when the user has no accounts", async () => {
  worker.use(
    http.post(apiUrl("/graphql"), () => HttpResponse.json({ data: { listBankAccount: [] } }))
  );
  const screen = await renderWithRouter(
    <Routes>
      <Route
        path="/bankaccounts/*"
        element={
          <BankAccountsContainer
            authService={startAuth()}
            bankAccountsService={startBankAccounts()}
          />
        }
      />
    </Routes>,
    { route: "/bankaccounts/new" }
  );
  await expect.element(screen.getByRole("heading", { name: "No Bank Accounts" })).toBeVisible();
  await screen.getByRole("link", { name: "Create" }).click();
  await expect.poll(() => history.location.pathname).toBe("/bankaccounts/new");
});
