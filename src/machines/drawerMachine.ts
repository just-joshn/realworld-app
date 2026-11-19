import { setup } from "xstate";
import { typed } from "./service";

export const drawerMachine = setup({
  types: typed<{
    context: { aboveSmallBreakpoint: boolean };
    events:
      | { type: "TOGGLE_DESKTOP" }
      | { type: "CLOSE_DESKTOP" }
      | { type: "OPEN_DESKTOP"; aboveSmallBreakpoint: boolean }
      | { type: "TOGGLE_MOBILE" }
      | { type: "OPEN_MOBILE" }
      | { type: "CLOSE_MOBILE" };
  }>(),
  guards: {
    // The desktop drawer reopens only when the breakpoint changed since it last opened.
    shouldOpenDesktop: ({ context, event }) =>
      event.type === "OPEN_DESKTOP" && event.aboveSmallBreakpoint !== context.aboveSmallBreakpoint,
  },
}).createMachine({
  id: "drawer",
  type: "parallel",
  context: { aboveSmallBreakpoint: true },
  states: {
    desktop: {
      initial: "open",
      states: {
        closed: {
          on: {
            TOGGLE_DESKTOP: "open",
            OPEN_DESKTOP: { target: "open", guard: "shouldOpenDesktop" },
          },
        },
        open: {
          on: { TOGGLE_DESKTOP: "closed", CLOSE_DESKTOP: "closed" },
        },
      },
    },
    mobile: {
      initial: "closed",
      states: {
        closed: {
          on: { TOGGLE_MOBILE: "open", OPEN_MOBILE: "open" },
        },
        open: {
          on: { TOGGLE_MOBILE: "closed", CLOSE_MOBILE: "closed" },
        },
      },
    },
  },
});
