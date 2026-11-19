import type { ReactNode } from "react";
import { render } from "vitest-browser-react";
import { history, HistoryRouter } from "../../src/utils/historyUtils";

export { history };

// Renders inside the app's own router history, so navigation done by machines shows up in the UI.
export function renderWithRouter(ui: ReactNode, { route = "/" }: { route?: string } = {}) {
  history.replace(route);
  return render(ui, {
    wrapper: ({ children }) => <HistoryRouter history={history}>{children}</HistoryRouter>,
  });
}
