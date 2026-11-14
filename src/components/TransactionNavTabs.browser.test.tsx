import { expect, test } from "vitest";
import { history, renderWithRouter } from "../../test/browser/render";
import TransactionNavTabs from "./TransactionNavTabs";

test("switches between everyone's, friends' and personal transactions", async () => {
  const screen = await renderWithRouter(<TransactionNavTabs />);
  for (const [name, route] of [
    ["Friends", "/contacts"],
    ["Mine", "/personal"],
    ["Everyone", "/"],
  ]) {
    await screen.getByRole("tab", { name }).click();
    await expect.poll(() => history.location.pathname).toBe(route);
    await expect
      .element(screen.getByRole("tab", { name }))
      .toHaveAttribute("aria-selected", "true");
  }
});
