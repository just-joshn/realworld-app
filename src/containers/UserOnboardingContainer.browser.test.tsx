import { object, string } from "yup";
import { http, HttpResponse } from "msw";
import { expect, test, vi } from "vitest";
import { apiUrl, worker } from "../../test/browser/msw";
import { renderWithRouter } from "../../test/browser/render";
import { login, startAuth, startBankAccounts } from "../../test/browser/auth-settings-bank-helpers";
import { buildBankAccount } from "../../test/factories";
import UserOnboardingContainer from "./UserOnboardingContainer";

test("guides a new user through adding a bank account", async () => {
  let created = false;
  const received = vi.fn();
  worker.use(
    http.post(apiUrl("/graphql"), async ({ request }) => {
      const body = object({
        operationName: string().required(),
        variables: object().default({}),
      }).validateSync(await request.json());
      if (body.operationName === "CreateBankAccount") {
        created = true;
        received(body.variables);
        return HttpResponse.json({ data: { createBankAccount: buildBankAccount() } });
      }
      return HttpResponse.json({ data: { listBankAccount: created ? [buildBankAccount()] : [] } });
    })
  );
  const screen = await renderWithRouter(
    <UserOnboardingContainer
      authService={await login()}
      bankAccountsService={startBankAccounts()}
    />
  );
  await expect.element(screen.getByText("Get Started with Real World App")).toBeVisible();
  await screen.getByRole("button", { name: "Next" }).click();
  await expect.element(screen.getByText("Create Bank Account")).toBeVisible();
  await screen.getByPlaceholder("Bank Name").fill("First Bank");
  await screen.getByPlaceholder("Routing Number").fill("987654321");
  await screen.getByPlaceholder("Account Number").fill("123456789");
  await screen.getByRole("button", { name: "Save" }).click();
  await expect.element(screen.getByText("Finished")).toBeVisible();
  await expect.element(screen.getByText(/You're all set!/)).toBeVisible();
  await expect.poll(() => received.mock.calls.length).toBe(1);
  await screen.getByRole("button", { name: "Done" }).click();
  await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
});

test("does not interrupt users who already have a bank account", async () => {
  worker.use(
    http.post(apiUrl("/graphql"), () =>
      HttpResponse.json({ data: { listBankAccount: [buildBankAccount()] } })
    )
  );
  const screen = await renderWithRouter(
    <UserOnboardingContainer
      authService={await login()}
      bankAccountsService={startBankAccounts()}
    />
  );
  await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
});

test("lets users log out during onboarding", async () => {
  const received = vi.fn();
  worker.use(
    http.post(apiUrl("/graphql"), () => HttpResponse.json({ data: { listBankAccount: [] } })),
    http.post(apiUrl("/logout"), () => {
      received();
      return HttpResponse.json({});
    })
  );
  const screen = await renderWithRouter(
    <UserOnboardingContainer
      authService={await login()}
      bankAccountsService={startBankAccounts()}
    />
  );
  await screen.getByRole("button", { name: "Logout" }).click();
  await expect.poll(() => received.mock.calls.length).toBe(1);
});

test("shows setup without account fields when signed out", async () => {
  worker.use(
    http.post(apiUrl("/graphql"), () => HttpResponse.json({ data: { listBankAccount: [] } }))
  );
  const screen = await renderWithRouter(
    <UserOnboardingContainer authService={startAuth()} bankAccountsService={startBankAccounts()} />
  );
  await screen.getByRole("button", { name: "Next" }).click();
  await expect.element(screen.getByText("Create Bank Account")).toBeVisible();
  await expect.element(screen.getByPlaceholder("Bank Name")).not.toBeInTheDocument();
});
