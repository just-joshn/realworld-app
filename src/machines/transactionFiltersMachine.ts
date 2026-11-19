import { assign, setup } from "xstate";
import { typed } from "./service";

export type FilterEvents =
  | { type: "NONE" }
  | { type: "DATE_FILTER"; dateRangeStart?: string | undefined; dateRangeEnd?: string | undefined }
  | {
      type: "AMOUNT_FILTER";
      amountMin?: number | string | undefined;
      amountMax?: number | string | undefined;
    }
  | { type: "DATE_RESET" }
  | { type: "AMOUNT_RESET" };

export interface FilterContext {
  dateRangeStart?: string | undefined;
  dateRangeEnd?: string | undefined;
  amountMin?: number | string | undefined;
  amountMax?: number | string | undefined;
}

export const transactionFiltersMachine = setup({
  types: typed<{ context: FilterContext; events: FilterEvents }>(),
}).createMachine({
  id: "filters",
  type: "parallel",
  context: {},
  states: {
    dateRange: {
      initial: "none",
      states: {
        none: {
          entry: assign({ dateRangeStart: undefined, dateRangeEnd: undefined }),
          on: { DATE_FILTER: "filter" },
        },
        filter: {
          entry: assign(({ event }) => ({
            dateRangeStart: "dateRangeStart" in event ? event.dateRangeStart : undefined,
            dateRangeEnd: "dateRangeEnd" in event ? event.dateRangeEnd : undefined,
          })),
          on: { DATE_RESET: "none" },
        },
      },
    },
    amountRange: {
      initial: "none",
      states: {
        none: {
          entry: assign({ amountMin: undefined, amountMax: undefined }),
          on: { AMOUNT_FILTER: "filter" },
        },
        filter: {
          entry: assign(({ event }) => ({
            amountMin: "amountMin" in event ? event.amountMin : undefined,
            amountMax: "amountMax" in event ? event.amountMax : undefined,
          })),
          on: {
            AMOUNT_RESET: "none",
            AMOUNT_FILTER: { target: "filter", reenter: true },
          },
        },
      },
    },
  },
});
