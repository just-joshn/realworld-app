import { http, HttpResponse } from "msw";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { apiUrl, worker } from "../../test/browser/msw";
import { history, renderWithRouter } from "../../test/browser/render";
import { buildTransactionResponseItem } from "../../test/factories";
import TransactionsContainer from "./TransactionsContainer";

for (const [route, endpoint, header] of [
  ["/", "/transactions/public", "Public"],
  ["/personal", "/transactions", "Personal"],
  ["/contacts", "/transactions/contacts", "Contacts"],
] as const) {
  test(`shows ${header.toLowerCase()} transactions and opens their details`, async () => {
    worker.use(
      http.get(apiUrl(endpoint), () =>
        HttpResponse.json({
          results: [buildTransactionResponseItem()],
          pageData: { page: 1, limit: 10, hasNextPages: false, totalPages: 1 },
        })
      )
    );
    const screen = await renderWithRouter(<TransactionsContainer />, { route });
    await expect.element(screen.getByText(header)).toBeVisible();
    await expect.element(screen.getByText("Lunch")).toBeVisible();
    await screen.getByText("Lunch").click();
    await expect.poll(() => history.location.pathname).toBe("/transaction/txn1");
  });

  test(`loads more ${header.toLowerCase()} transactions when scrolling`, async () => {
    worker.use(
      http.get(apiUrl(endpoint), ({ request }) => {
        const next = new URL(request.url).searchParams.get("page") === "2";
        return HttpResponse.json({
          results: next
            ? [
                buildTransactionResponseItem({
                  id: "last",
                  description: "Last payment",
                }),
              ]
            : Array.from({ length: 12 }, (_, i) =>
                buildTransactionResponseItem({
                  id: `txn${String(i)}`,
                  description: `Payment ${String(i)}`,
                })
              ),
          pageData: {
            page: next ? 2 : 1,
            limit: 12,
            hasNextPages: !next,
            totalPages: 2,
          },
        });
      })
    );
    const screen = await renderWithRouter(<TransactionsContainer />, { route });
    await expect.element(screen.getByText("Payment 0")).toBeVisible();
    await screen.getByRole("grid").wheel({ delta: { y: 2000 } });
    await expect.element(screen.getByText("Last payment")).toBeVisible();
  });
}

test("offers to create a transaction when there are none", async () => {
  const requested = vi.fn();
  worker.use(
    http.get(apiUrl("/transactions/public"), () => {
      requested();
      return HttpResponse.json({
        results: [],
        pageData: { page: 1, hasNextPages: false },
      });
    })
  );
  const screen = await renderWithRouter(<TransactionsContainer />);
  // The empty state shows before the fetch starts; let the request finish before this test ends.
  await expect.poll(() => requested.mock.calls.length).toBe(1);
  await expect.element(screen.getByRole("heading", { name: "No Transactions" })).toBeVisible();
  await screen.getByRole("link", { name: "Create A Transaction" }).click();
  await expect.poll(() => history.location.pathname).toBe("/transaction/new");
});

for (const mobile of [false, true]) {
  test(`filters and clears transaction amounts on ${mobile ? "mobile" : "desktop"}`, async () => {
    await page.viewport(mobile ? 390 : 1280, 900);
    const queries = vi.fn<(query: Record<string, string>) => void>();
    worker.use(
      http.get(apiUrl("/transactions/public"), ({ request }) => {
        queries(Object.fromEntries(new URL(request.url).searchParams));
        return HttpResponse.json({
          results: [],
          pageData: { page: 1, hasNextPages: false },
        });
      })
    );
    const screen = await renderWithRouter(<TransactionsContainer />);
    await expect.element(screen.getByRole("heading", { name: "No Transactions" })).toBeVisible();
    await screen.getByRole("button", { name: "Amount: $0 - $1,000" }).click();
    const minAmount = screen.getByRole("slider").first();
    // The range input is visually hidden, so focus it for the keyboard instead of clicking it.
    // First wait for the filter to finish sliding on screen.
    await expect
      .poll(() => minAmount.element().getBoundingClientRect().bottom <= window.innerHeight)
      .toBe(true);
    minAmount.element().focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .poll(() => queries.mock.calls.some(([q]) => Number(q["amountMin"]) > 0))
      .toBe(true);
    await expect.element(screen.getByText(/Amount Range:/)).toBeVisible();
    await screen.getByRole("button", { name: "Clear", exact: true }).click();
    await expect.poll(() => queries.mock.lastCall?.[0]).toEqual({});
    if (mobile) await screen.getByRole("button", { name: "Close", exact: true }).click();
    else {
      await userEvent.tab();
      await userEvent.keyboard("{Escape}");
    }
    await expect.element(screen.getByRole("button", { name: "Amount: $0 - $1,000" })).toBeVisible();
    await page.viewport(1280, 900);
  });

  test(`filters and resets transaction dates on ${mobile ? "mobile" : "desktop"}`, async () => {
    await page.viewport(mobile ? 390 : 1280, 900);
    const queries = vi.fn<(query: Record<string, string>) => void>();
    worker.use(
      http.get(apiUrl("/transactions/public"), ({ request }) => {
        queries(Object.fromEntries(new URL(request.url).searchParams));
        return HttpResponse.json({
          results: [],
          pageData: { page: 1, hasNextPages: false },
        });
      })
    );
    const screen = await renderWithRouter(<TransactionsContainer />);
    await expect.element(screen.getByRole("heading", { name: "No Transactions" })).toBeVisible();
    await screen.getByRole("button", { name: "Date: ALL" }).click();
    const month = new Date().toLocaleString("en-US", { month: "long" });
    const year = new Date().getFullYear();
    await screen.getByRole("button", { name: `${month} 1, ${String(year)}`, exact: true }).click();
    await screen.getByRole("button", { name: `${month} 10, ${String(year)}`, exact: true }).click();
    await expect
      .poll(() =>
        queries.mock.calls.some(([q]) => Boolean(q["dateRangeStart"] && q["dateRangeEnd"]))
      )
      .toBe(true);
    await expect.element(screen.getByRole("button", { name: /Date: .* - / })).toBeVisible();
    await screen.getByRole("button", { name: /Date: .* - / }).click();
    if (mobile) await screen.getByRole("button", { name: "Close", exact: true }).click();
    else await userEvent.keyboard("{Escape}");
    await screen.getByTestId("CancelIcon").click();
    await expect.element(screen.getByRole("button", { name: "Date: ALL" })).toBeVisible();
    await expect.poll(() => queries.mock.lastCall?.[0]).toEqual({});
    await page.viewport(1280, 900);
  });
}
