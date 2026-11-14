import { createMachine, assign } from "xstate";
import { concat } from "lodash/fp";
import type { TransactionPagination } from "../models";

export interface DataSchema {
  states: {
    idle: Record<string, never>;
    loading: Record<string, never>;
    updating: Record<string, never>;
    creating: Record<string, never>;
    deleting: Record<string, never>;
    success: {
      states: {
        unknown: Record<string, never>;
        withData: Record<string, never>;
        withoutData: Record<string, never>;
      };
    };
    failure: Record<string, never>;
  };
}

type SuccessEvent<T> = { type: "SUCCESS"; results: T[]; pageData: object };
type FailureEvent = { type: "FAILURE"; message: string };
export type DataEvents<T = unknown> = (
  | { type: "FETCH" }
  | { type: "UPDATE" }
  | { type: "CREATE" }
  | { type: "DELETE" }
  | SuccessEvent<T>
  | FailureEvent
  | { type: `done.invoke.${string}`; data: { results: T[]; pageData?: TransactionPagination } }
) & {
  id?: string | undefined;
  transactionId?: string | undefined;
  entity?: string;
  page?: number;
  limit?: number;
  q?: string;
  isRead?: boolean;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  content?: string;
  requestStatus?: string;
};

export interface DataContext<T = unknown> {
  pageData?: object | undefined;
  results: T[];
  message?: string | undefined;
}

export const dataMachine = <T = unknown>(machineId: string) =>
  createMachine<DataContext<T>, DataEvents<T>>(
    {
      id: machineId,
      initial: "idle",
      context: {
        pageData: {},
        results: [],
        message: undefined,
      },
      states: {
        idle: {
          on: {
            FETCH: "loading",
            CREATE: "creating",
            UPDATE: "updating",
            DELETE: "deleting",
          },
        },
        loading: {
          invoke: {
            src: "fetchData",
            onDone: { target: "success" },
            onError: { target: "failure", actions: "setMessage" },
          },
          // A change made before the list finishes loading must not be dropped. Leaving
          // `loading` discards the stale fetch; the change reloads the list when it finishes.
          on: {
            CREATE: "creating",
            UPDATE: "updating",
            DELETE: "deleting",
          },
        },
        updating: {
          invoke: {
            src: "updateData",
            onDone: { target: "loading" },
            onError: { target: "failure", actions: "setMessage" },
          },
        },
        creating: {
          invoke: {
            src: "createData",
            onDone: { target: "loading" },
            onError: { target: "failure", actions: "setMessage" },
          },
        },
        deleting: {
          invoke: {
            src: "deleteData",
            onDone: { target: "loading" },
            onError: { target: "failure", actions: "setMessage" },
          },
        },
        success: {
          entry: ["setResults", "setPageData"],
          on: {
            FETCH: "loading",
            CREATE: "creating",
            UPDATE: "updating",
            DELETE: "deleting",
          },
          initial: "unknown",
          states: {
            unknown: {
              on: {
                "": [{ target: "withData", cond: "hasData" }, { target: "withoutData" }],
              },
            },
            withData: {},
            withoutData: {},
          },
        },
        failure: {
          entry: ["setMessage"],
          on: {
            FETCH: "loading",
          },
        },
      },
    },
    {
      actions: {
        setResults: assign<DataContext<T>, DataEvents<T>>((_ctx, event) => {
          if (!("data" in event)) throw new Error("Expected data service result");
          return {
            results:
              event.data.pageData && event.data.pageData.page > 1
                ? concat(_ctx.results, event.data.results)
                : event.data.results,
          };
        }),
        setPageData: assign<DataContext<T>, DataEvents<T>>((_ctx, event) => {
          if (!("data" in event)) throw new Error("Expected data service result");
          return { pageData: event.data.pageData };
        }),

        setMessage: assign<DataContext<T>, DataEvents<T>>((_ctx, event) => ({
          message: "message" in event ? event.message : undefined,
        })),
      },
      guards: {
        hasData: (_ctx: DataContext<T>) => _ctx.results.length > 0,
      },
    }
  );
