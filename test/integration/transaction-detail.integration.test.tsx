import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { renderSignedIn, seededUsers } from "./app";

const heathToLiaPrivateRequest = "C1l4TIlLTsu";
const heathToLiaPublicRequest = "lqPfz9g0EYE";

test("a user likes a transaction once", async () => {
  const screen = await renderSignedIn({ route: `/transaction/${heathToLiaPrivateRequest}` });
  const like = screen.getByRole("button", { name: "Like" });
  await expect.element(screen.getByText("0", { exact: true })).toBeVisible();

  await like.click();

  await expect.element(screen.getByText("1", { exact: true })).toBeVisible();
  await expect.element(like).toBeDisabled();
});

test("a user comments on a transaction", async () => {
  const screen = await renderSignedIn({ route: `/transaction/${heathToLiaPrivateRequest}` });
  await expect.element(screen.getByRole("heading", { name: "Transaction Detail" })).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Comments" })).not.toBeInTheDocument();

  await screen.getByPlaceholder("Write a comment...").fill("Thanks for lunch!");
  await userEvent.keyboard("{Enter}");

  await expect.element(screen.getByRole("heading", { name: "Comments" })).toBeVisible();
  await expect.element(screen.getByText("Thanks for lunch!")).toBeVisible();
});

test("only the person asked for money can answer a request", async () => {
  const screen = await renderSignedIn({
    username: seededUsers.heath.username,
    route: `/transaction/${heathToLiaPrivateRequest}`,
  });

  await expect.element(screen.getByText("Ted Parisian", { exact: true })).toBeVisible();
  await expect.element(screen.getByText(" requested ")).toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Accept Request" }))
    .not.toBeInTheDocument();
});

test("the person asked for money accepts the request", async () => {
  const screen = await renderSignedIn({
    username: seededUsers.lia.username,
    route: `/transaction/${heathToLiaPrivateRequest}`,
  });
  await expect.element(screen.getByText(" requested ")).toBeVisible();

  await screen.getByRole("button", { name: "Accept Request" }).click();

  await expect.element(screen.getByText(" charged ")).toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Accept Request" }))
    .not.toBeInTheDocument();
  await expect
    .element(screen.getByRole("button", { name: "Reject Request" }))
    .not.toBeInTheDocument();
});

test("the person asked for money rejects the request", async () => {
  const screen = await renderSignedIn({
    username: seededUsers.lia.username,
    route: `/transaction/${heathToLiaPublicRequest}`,
  });

  await screen.getByRole("button", { name: "Reject Request" }).click();

  await expect
    .element(screen.getByRole("button", { name: "Reject Request" }))
    .not.toBeInTheDocument();
  await expect.element(screen.getByText(" requested ")).toBeVisible();
});
