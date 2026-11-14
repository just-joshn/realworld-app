import { createMachine, assign } from "xstate";

type DateFilterEvent = {
  type: "DATE_FILTER";
  dateRangeStart: string;
  dateRangeEnd: string;
};
type AmountFilterEvent = {
  type: "AMOUNT_FILTER";
  amountMin: string;
  amountMax: string;
};
type DateResetEvent = { type: "DATE_RESET" };
type AmountResetEvent = { type: "AMOUNT_RESET" };
type FilterEvents =
  { type: "NONE" } | DateFilterEvent | AmountFilterEvent | DateResetEvent | AmountResetEvent;

export interface FilterContext {
  dateRangeStart?: string | undefined;
  dateRangeEnd?: string | undefined;
  amountMin?: string | undefined;
  amountMax?: string | undefined;
}

export const transactionFiltersMachine = createMachine<FilterContext, FilterEvents>(
  {
    id: "filters",
    type: "parallel",
    context: {},
    states: {
      dateRange: {
        initial: "none",
        states: {
          none: {
            entry: "resetDateRange",
            on: {
              DATE_FILTER: "filter",
            },
          },
          filter: {
            entry: "setDateRange",
            on: {
              DATE_RESET: "none",
            },
          },
        },
      },
      amountRange: {
        initial: "none",
        states: {
          none: {
            entry: "resetAmountRange",
            on: {
              AMOUNT_FILTER: "filter",
            },
          },
          filter: {
            entry: "setAmountRange",
            on: {
              AMOUNT_RESET: "none",
              AMOUNT_FILTER: "filter",
            },
          },
        },
      },
    },
  },
  {
    actions: {
      setDateRange: assign<FilterContext, FilterEvents>((_ctx, event) => ({
        dateRangeStart: "dateRangeStart" in event ? event.dateRangeStart : undefined,
        dateRangeEnd: "dateRangeEnd" in event ? event.dateRangeEnd : undefined,
      })),
      resetDateRange: assign(() => ({
        dateRangeStart: undefined,
        dateRangeEnd: undefined,
      })),
      setAmountRange: assign<FilterContext, FilterEvents>((_ctx, event) => ({
        amountMin: "amountMin" in event ? event.amountMin : undefined,
        amountMax: "amountMax" in event ? event.amountMax : undefined,
      })),
      resetAmountRange: assign(() => ({
        amountMin: undefined,
        amountMax: undefined,
      })),
    },
  }
);
