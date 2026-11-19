import { assign, setup } from "xstate";
import { typed } from "./service";

export type SnackbarEvents = ({ type: "SHOW" } | { type: "HIDE" }) & SnackbarContext;
export enum Severities {
  success = "success",
  info = "info",
  warning = "warning",
  error = "error",
}
export interface SnackbarContext {
  severity?: Severities | undefined;
  message?: string | undefined;
}

export const snackbarMachine = setup({
  types: typed<{ context: SnackbarContext; events: SnackbarEvents }>(),
}).createMachine({
  id: "snackbar",
  initial: "invisible",
  context: {
    severity: undefined,
    message: undefined,
  },
  states: {
    invisible: {
      entry: assign({ severity: undefined, message: undefined }),
      on: { SHOW: "visible" },
    },
    visible: {
      entry: assign(({ event }) => ({
        severity: "severity" in event ? event.severity : undefined,
        message: "message" in event ? event.message : undefined,
      })),
      on: { HIDE: "invisible" },
      after: {
        3000: "invisible",
      },
    },
  },
});
