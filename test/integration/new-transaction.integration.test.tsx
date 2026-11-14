import { expect, test } from "vitest";
import { history, renderSignedIn, seededUsers } from "./app";

const kristian = `${seededUsers.arvilla.firstName} ${seededUsers.arvilla.lastName}`;

test("a user finds a contact by name and pays them", async () => {
  const screen = await renderSignedIn();

  await screen.getByRole("link", { name: "New" }).click();
  await expect.poll(() => history.location.pathname).toBe("/transaction/new");
  await screen.getByPlaceholder("Search...").fill("Kristian");
  await screen.getByText(kristian).click();

  await expect.element(screen.getByRole("heading", { name: kristian })).toBeVisible();
  await screen.getByPlaceholder("Amount").fill("12.50");
  await screen.getByPlaceholder("Add a note").fill("Lunch");
  await screen.getByRole("button", { name: "Pay" }).click();

  await expect
    .element(screen.getByRole("heading", { name: "Paid $12.50 for Lunch" }))
    .toBeVisible();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Transaction Submitted!");

  await screen.getByRole("link", { name: "Return To Transactions" }).click();
  await screen.getByRole("tab", { name: "Mine" }).click();
  await expect.element(screen.getByText("Lunch", { exact: true })).toBeVisible();
});

test("a user requests money and then starts another transaction", async () => {
  const screen = await renderSignedIn({ route: "/transaction/new" });

  await screen.getByText(kristian).click();
  await screen.getByPlaceholder("Amount").fill("40");
  await screen.getByPlaceholder("Add a note").fill("Concert tickets");
  await screen.getByRole("button", { name: "Request" }).click();

  await expect
    .element(screen.getByRole("heading", { name: "Requested $40.00 for Concert tickets" }))
    .toBeVisible();

  await screen.getByRole("button", { name: "Create Another Transaction" }).click();
  await expect.element(screen.getByPlaceholder("Search...")).toBeVisible();
  await expect.poll(() => history.location.pathname).toBe("/transaction/new");
});

test("searching for someone who does not exist lists nobody", async () => {
  const screen = await renderSignedIn({ route: "/transaction/new" });
  await expect.element(screen.getByText(kristian)).toBeVisible();

  await screen.getByPlaceholder("Search...").fill("nobody-by-this-name");

  await expect.element(screen.getByText(kristian)).not.toBeInTheDocument();
});

test("the payment form explains what is missing before it can be sent", async () => {
  const screen = await renderSignedIn({ route: "/transaction/new" });
  await screen.getByText(kristian).click();

  await screen.getByPlaceholder("Add a note").click();
  await expect.element(screen.getByText("Please enter a valid amount")).toBeVisible();
  await screen.getByPlaceholder("Amount").fill("12.50");
  await expect.element(screen.getByText("Please enter a note")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Pay" })).toBeDisabled();

  await screen.getByPlaceholder("Add a note").fill("Lunch");
  await expect.element(screen.getByRole("button", { name: "Pay" })).toBeEnabled();
  await expect.element(screen.getByRole("button", { name: "Request" })).toBeEnabled();
});
