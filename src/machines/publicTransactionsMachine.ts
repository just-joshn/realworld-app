import { transactionsResponseSchema } from "../models/schemas";
import type { TransactionResponseItem } from "../models";
import { isEmpty, omit } from "lodash/fp";
import { dataMachine, dataServices } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { apiUrl } from "../utils/apiConfig";

const { load } = dataServices<TransactionResponseItem>();

export const publicTransactionsMachine = dataMachine<TransactionResponseItem>(
  "publicTransactions"
).provide({
  actors: {
    fetchData: load(async (_ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.get<unknown>(apiUrl("/transactions/public"), {
        params: !isEmpty(payload) ? payload : undefined,
      });
      return transactionsResponseSchema.validateSync(resp.data);
    }),
  },
});
