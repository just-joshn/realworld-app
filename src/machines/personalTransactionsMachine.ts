import { TransactionResponseItem } from "../models";
import { isEmpty, omit } from "lodash/fp";
import { dataMachine } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { backendPort } from "../utils/portUtils";

export const personalTransactionsMachine = dataMachine<TransactionResponseItem>(
  "personalTransactions"
).withConfig({
  services: {
    fetchData: async (ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.get(`http://localhost:${backendPort}/transactions`, {
        params: !isEmpty(payload) ? payload : undefined,
      });
      return resp.data;
    },
  },
});
