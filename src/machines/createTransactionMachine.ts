import { omit } from "lodash/fp";
import { assign, fromPromise, setup } from "xstate";
import { httpClient } from "../utils/asyncUtils";
import type { User, TransactionCreatePayload } from "../models";
import { authService } from "./authMachine";
import { backendPort } from "../utils/portUtils";
import { typed } from "./service";

export type CreateTransactionMachineEvents =
  | { type: "SET_USERS"; sender?: User | undefined; receiver: User }
  | ({ type: "CREATE" } & TransactionCreatePayload)
  | { type: "RESET" };

export interface CreateTransactionMachineContext {
  sender?: User | undefined;
  receiver?: User | undefined;
  transactionDetails?: TransactionCreatePayload | undefined;
}

const postTransaction = fromPromise<unknown, CreateTransactionMachineEvents>(async ({ input }) => {
  if (input.type !== "CREATE") throw new Error("Expected CREATE event");
  const payload = omit("type", input);
  const resp = await httpClient.post<unknown>(
    `http://localhost:${String(backendPort)}/transactions`,
    payload
  );
  authService.send({ type: "REFRESH" });
  return resp.data;
});

export const createTransactionMachine = setup({
  types: typed<{
    context: CreateTransactionMachineContext;
    events: CreateTransactionMachineEvents;
  }>(),
  actors: { postTransaction },
}).createMachine({
  id: "createTransaction",
  initial: "stepOne",
  // Filled by SET_USERS and CREATE before step three reads it.
  context: {},
  states: {
    stepOne: {
      entry: assign({ sender: undefined, receiver: undefined, transactionDetails: undefined }),
      on: {
        SET_USERS: "stepTwo",
      },
    },
    stepTwo: {
      entry: assign(({ context, event }) => ({
        sender: event.type === "SET_USERS" ? event.sender : context.sender,
        receiver: event.type === "SET_USERS" ? event.receiver : context.receiver,
      })),
      on: {
        CREATE: "stepThree",
      },
    },
    stepThree: {
      entry: assign(({ context, event }) => ({
        transactionDetails: event.type === "CREATE" ? event : context.transactionDetails,
      })),
      invoke: {
        src: "postTransaction",
        input: ({ event }) => event,
        // The user sees the confirmation step either way; a failed post is not surfaced.
        onError: {},
      },
      on: {
        RESET: "stepOne",
      },
    },
  },
});
