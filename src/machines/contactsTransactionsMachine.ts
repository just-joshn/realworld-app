import { transactionsResponseSchema } from "../models/schemas";
import type { TransactionResponseItem } from "../models";
import { isEmpty, omit } from "lodash/fp";
import { dataMachine, dataServices } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { backendPort } from "../utils/portUtils";

const { load } = dataServices<TransactionResponseItem>();

export const contactsTransactionsMachine = dataMachine<TransactionResponseItem>(
  "contactsTransactions"
).provide({
  actors: {
    fetchData: load(async (_ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.get<unknown>(
        `http://localhost:${String(backendPort)}/transactions/contacts`,
        {
          params: !isEmpty(payload) ? payload : undefined,
        }
      );
      return transactionsResponseSchema.validateSync(resp.data);
    }),
  },
});
