import { expect, test, vi, onTestFinished } from "vitest";
import { page } from "vitest/browser";
import { buildTransactionResponseItem } from "../../test/factories";
import { renderWithRouter } from "../../test/browser/render";
import TransactionInfiniteList from "./TransactionInfiniteList";

for (const width of [390, 800, 1280]) {
  test(`shows transaction descriptions in a ${String(width)}px viewport`, async () => {
    await page.viewport(width, 900);
    onTestFinished(() => page.viewport(1280, 900));
    const screen = await renderWithRouter(
      <TransactionInfiniteList
        transactions={[buildTransactionResponseItem()]}
        loadNextPage={vi.fn()}
        pagination={{ page: 1, limit: 10, hasNextPages: false, totalPages: 1 }}
      />
    );
    await expect.element(screen.getByText("Lunch")).toBeVisible();
    await expect.element(screen.getByText("-$25.00")).toBeVisible();
  });
}
