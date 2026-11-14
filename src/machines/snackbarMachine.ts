import { Machine, assign } from "xstate";

export interface SnackbarSchema {
  states: {
    invisible: Record<string, never>;
    visible: Record<string, never>;
  };
}

export type SnackbarEvents = ({ type: "SHOW" } | { type: "HIDE" }) & SnackbarContext;
export enum Severities {
  success = "success",
  info = "info",
  warning = "warning",
  error = "error",
}
export interface SnackbarContext {
  severity?: Severities;
  message?: string;
}

export const snackbarMachine = Machine<SnackbarContext, SnackbarSchema, SnackbarEvents>(
  {
    id: "snackbar",
    initial: "invisible",
    context: {
      severity: undefined,
      message: undefined,
    },
    states: {
      invisible: {
        entry: "resetSnackbar",
        on: { SHOW: "visible" },
      },
      visible: {
        entry: "setSnackbar",
        on: { HIDE: "invisible" },
        after: {
          // after 3 seconds, transition to invisible
          3000: "invisible",
        },
      },
    },
  },
  {
    actions: {
      setSnackbar: assign<SnackbarContext, SnackbarEvents>((ctx, event) => ({
        severity: event.severity,
        message: event.message,
      })),
      resetSnackbar: assign(() => ({
        severity: undefined,
        message: undefined,
      })),
    },
  }
);
