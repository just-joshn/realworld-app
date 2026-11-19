// react-router 8 only exports history-object routing under unstable and unsafe names, and its
// listeners fire on push only with v5Compat. The state machines navigate imperatively through one
// shared history, so everything goes through here.
import { UNSAFE_createBrowserHistory, unstable_HistoryRouter } from "react-router";

export const history = UNSAFE_createBrowserHistory({ v5Compat: true });
export const HistoryRouter = unstable_HistoryRouter;
