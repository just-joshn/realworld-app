import { omit } from "lodash/fp";
import { Machine, assign } from "xstate";
import { dataMachine } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { User, TransactionCreatePayload } from "../models";
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
    createData: async (ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.post(`http://localhost:${backendPort}/transactions`, payload);
      authService.send("REFRESH");
      return resp.data;
    },
  },
});

export type CreateTransactionMachineEvents =
  | { type: "SET_USERS"; sender: User; receiver: User }
  | ({ type: "CREATE" } & TransactionCreatePayload)
  | { type: "RESET" };

export interface CreateTransactionMachineContext {
  sender: User;
  receiver: User;
  transactionDetails: TransactionCreatePayload;
}

export const createTransactionMachine = Machine<
  CreateTransactionMachineContext,
  CreateTransactionMachineSchema,
  CreateTransactionMachineEvents
>(
  {
    id: "createTransaction",
    initial: "stepOne",
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
        (ctx, event) => ({
          sender: event.type === "SET_USERS" ? event.sender : ctx.sender,
          receiver: event.type === "SET_USERS" ? event.receiver : ctx.receiver,
        })
      ),
      setTransactionDetails: assign<
        CreateTransactionMachineContext,
        CreateTransactionMachineEvents
      >((ctx, event) => ({
        transactionDetails: event.type === "CREATE" ? event : ctx.transactionDetails,
      })),
      clearContext: assign(() => ({})),
    },
  }
);
