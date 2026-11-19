import { assign, setup } from "xstate";
import type { PromiseActorLogic } from "xstate";
import { concat } from "lodash/fp";
import type { TransactionPagination } from "../models";
import type { ServiceInput } from "./service";
import { errorMessage, service, typed } from "./service";

export type DataEvents = (
  { type: "FETCH" } | { type: "UPDATE" } | { type: "CREATE" } | { type: "DELETE" }
) & {
  id?: string | undefined;
  transactionId?: string | undefined;
  entity?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  q?: string | undefined;
  isRead?: boolean | undefined;
  bankName?: string | undefined;
  accountNumber?: string | undefined;
  routingNumber?: string | undefined;
  content?: string | undefined;
  requestStatus?: string | undefined;
};

export interface DataContext<T = unknown> {
  pageData?: Partial<TransactionPagination> | undefined;
  results: T[];
  message?: string | undefined;
}

export interface FetchOutput<T> {
  results: T[];
  pageData?: Partial<TransactionPagination>;
}

type DataInput<T> = ServiceInput<DataContext<T>, DataEvents>;

export const dataMachine = <T = unknown>(machineId: string) =>
  setup({
    types: typed<{ context: DataContext<T>; events: DataEvents }>(),
    actors: typed<{
      fetchData: PromiseActorLogic<FetchOutput<T>, DataInput<T>>;
      updateData: PromiseActorLogic<unknown, DataInput<T>>;
      createData: PromiseActorLogic<unknown, DataInput<T>>;
      deleteData: PromiseActorLogic<unknown, DataInput<T>>;
    }>(),
    guards: {
      hasData: ({ context }) => context.results.length > 0,
    },
  }).createMachine({
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
          input: ({ context, event }) => ({ context, event }),
          onDone: {
            target: "success",
            actions: assign(({ context, event }) => ({
              results:
                event.output.pageData?.page !== undefined && event.output.pageData.page > 1
                  ? concat(context.results, event.output.results)
                  : event.output.results,
              pageData: event.output.pageData,
            })),
          },
          onError: {
            target: "failure",
            actions: assign({ message: ({ event }) => errorMessage(event.error) }),
          },
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
          input: ({ context, event }) => ({ context, event }),
          onDone: { target: "loading" },
          onError: {
            target: "failure",
            actions: assign({ message: ({ event }) => errorMessage(event.error) }),
          },
        },
      },
      creating: {
        invoke: {
          src: "createData",
          input: ({ context, event }) => ({ context, event }),
          onDone: { target: "loading" },
          onError: {
            target: "failure",
            actions: assign({ message: ({ event }) => errorMessage(event.error) }),
          },
        },
      },
      deleting: {
        invoke: {
          src: "deleteData",
          input: ({ context, event }) => ({ context, event }),
          onDone: { target: "loading" },
          onError: {
            target: "failure",
            actions: assign({ message: ({ event }) => errorMessage(event.error) }),
          },
        },
      },
      success: {
        on: {
          FETCH: "loading",
          CREATE: "creating",
          UPDATE: "updating",
          DELETE: "deleting",
        },
        initial: "unknown",
        states: {
          unknown: {
            always: [{ target: "withData", guard: "hasData" }, { target: "withoutData" }],
          },
          withData: {},
          withoutData: {},
        },
      },
      failure: {
        on: {
          FETCH: "loading",
        },
      },
    },
  });

/** Builds the promise actors a data machine's `provide` takes, typed to its context and events. */
export const dataServices = <T>() => ({
  load: (run: (context: DataContext<T>, event: DataEvents) => Promise<FetchOutput<T>>) =>
    service<DataContext<T>, DataEvents, FetchOutput<T>>(run),
  change: (run: (context: DataContext<T>, event: DataEvents) => Promise<unknown>) =>
    service<DataContext<T>, DataEvents, unknown>(run),
});
