import { transactionsResponseSchema } from "../models/schemas";
import type { TransactionResponseItem } from "../models";
import { isEmpty, omit } from "lodash/fp";
import { dataMachine, dataServices } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { backendPort } from "../utils/portUtils";

const { load } = dataServices<TransactionResponseItem>();

export const personalTransactionsMachine = dataMachine<TransactionResponseItem>(
  "personalTransactions"
).provide({
  actors: {
    fetchData: load(async (_ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.get<unknown>(
        `http://localhost:${String(backendPort)}/transactions`,
        {
          params: !isEmpty(payload) ? payload : undefined,
        }
      );
      return transactionsResponseSchema.validateSync(resp.data);
    }),
  },
});
