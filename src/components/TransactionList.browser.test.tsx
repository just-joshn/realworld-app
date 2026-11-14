import { expect, test, vi } from "vitest";
import { renderWithRouter } from "../../test/browser/render";
import TransactionList from "./TransactionList";

test("shows an empty list without offering creation when creation is unavailable", async () => {
  const screen = await renderWithRouter(
    <TransactionList
      header="Transactions"
      transactions={[]}
      isLoading={false}
      loadNextPage={vi.fn()}
      pagination={{ page: 1, limit: 10, totalPages: 1, hasNextPages: false }}
      filterComponent={null}
    />
  );
  await expect.element(screen.getByRole("heading", { name: "No Transactions" })).toBeVisible();
  await expect
    .element(screen.getByRole("link", { name: "Create A Transaction" }))
    .not.toBeInTheDocument();
});
