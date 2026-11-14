import { expect, test } from "vitest";
import { history, renderSignedIn } from "./app";

const seededBank = "Waters, King and O'Reilly Bank";

test("a user adds a bank account", async () => {
  const screen = await renderSignedIn();

  await screen.getByRole("link", { name: "Bank Accounts" }).click();
  await expect.element(screen.getByText(seededBank, { exact: false })).toBeVisible();
  await screen.getByRole("link", { name: "Create" }).click();

  await expect.element(screen.getByRole("heading", { name: "Create Bank Account" })).toBeVisible();
  await screen.getByPlaceholder("Bank Name").fill("Second Bank");
  await screen.getByPlaceholder("Routing Number").fill("987654321");
  await screen.getByPlaceholder("Account Number").fill("123456789");
  await screen.getByRole("button", { name: "Save" }).click();

  await expect.poll(() => history.location.pathname).toBe("/bankaccounts");
  await expect.element(screen.getByText("Second Bank", { exact: false })).toBeVisible();
  await expect.poll(() => screen.getByRole("button", { name: "Delete" }).all().length).toBe(2);
});

test("a user deletes a bank account and it stays listed as deleted", async () => {
  const screen = await renderSignedIn({ route: "/bankaccounts" });

  await screen.getByRole("button", { name: "Delete" }).click();

  await expect.element(screen.getByText(`${seededBank} (Deleted)`)).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Delete" })).not.toBeInTheDocument();
});

test("the bank account form explains missing and invalid details", async () => {
  const screen = await renderSignedIn({ route: "/bankaccounts/new" });

  for (const placeholder of ["Bank Name", "Routing Number", "Account Number"]) {
    await screen.getByPlaceholder(placeholder).click();
  }
  await screen.getByPlaceholder("Bank Name").click();
  await expect.element(screen.getByText("Enter a bank name")).toBeVisible();
  await expect.element(screen.getByText("Enter a valid bank routing number")).toBeVisible();
  await expect.element(screen.getByText("Enter a valid bank account number")).toBeVisible();

  await screen.getByPlaceholder("Bank Name").fill("Bank");
  await screen.getByPlaceholder("Routing Number").fill("123");
  await screen.getByPlaceholder("Account Number").fill("123");
  await expect.element(screen.getByText("Must contain at least 5 characters")).toBeVisible();
  await expect.element(screen.getByText("Must contain a valid routing number")).toBeVisible();
  await expect.element(screen.getByText("Must contain at least 9 digits")).toBeVisible();

  await screen.getByPlaceholder("Account Number").fill("1234567890123");
  await expect.element(screen.getByText("Must contain no more than 12 digits")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
