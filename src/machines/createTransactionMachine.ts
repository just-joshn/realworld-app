import { omit } from "lodash/fp";
import { createMachine, assign } from "xstate";
import { dataMachine } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import type { User, TransactionCreatePayload } from "../models";
import { authService } from "./authMachine";
import { backendPort } from "../utils/portUtils";

export interface CreateTransactionMachineSchema {
  states: {
    stepOne: Record<string, never>;
    stepTwo: Record<string, never>;
    stepThree: Record<string, never>;
  };
}

const transactionDataMachine = dataMachine("transactionData").withConfig({
  services: {
    createData: async (_ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.post<unknown>(
        `http://localhost:${String(backendPort)}/transactions`,
        payload
      );
      authService.send("REFRESH");
      return resp.data;
    },
  },
});

export type CreateTransactionMachineEvents =
  | { type: "SET_USERS"; sender?: User | undefined; receiver: User }
  | ({ type: "CREATE" } & TransactionCreatePayload)
  | { type: "RESET" };

export interface CreateTransactionMachineContext {
  sender?: User | undefined;
  receiver?: User | undefined;
  transactionDetails?: TransactionCreatePayload | undefined;
}

export const createTransactionMachine = createMachine<
  CreateTransactionMachineContext,
  CreateTransactionMachineEvents
>(
  {
    id: "createTransaction",
    initial: "stepOne",
    // Filled by SET_USERS and CREATE before step three reads it.
    context: {},
    states: {
      stepOne: {
        entry: "clearContext",
        on: {
          SET_USERS: "stepTwo",
        },
      },
      stepTwo: {
        entry: "setSenderAndReceiver",
        invoke: {
          id: "transactionDataMachine",
          src: transactionDataMachine,
          autoForward: true,
        },
        on: {
          CREATE: "stepThree",
        },
      },
      stepThree: {
        entry: "setTransactionDetails",
        on: {
          RESET: "stepOne",
        },
      },
    },
  },
  {
    actions: {
      setSenderAndReceiver: assign<CreateTransactionMachineContext, CreateTransactionMachineEvents>(
        (_ctx, event) => ({
          sender: event.type === "SET_USERS" ? event.sender : _ctx.sender,
          receiver: event.type === "SET_USERS" ? event.receiver : _ctx.receiver,
        })
      ),
      setTransactionDetails: assign<
        CreateTransactionMachineContext,
        CreateTransactionMachineEvents
      >((_ctx, event) => ({
        transactionDetails: event.type === "CREATE" ? event : _ctx.transactionDetails,
      })),
      clearContext: assign(() => ({})),
    },
  }
);
