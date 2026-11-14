import { TransactionResponseItem } from "../models";
import { omit, flow } from "lodash/fp";
import { dataMachine } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { backendPort } from "../utils/portUtils";
import { authService } from "./authMachine";

export const transactionDetailMachine = dataMachine<TransactionResponseItem>(
  "transactionData"
).withConfig({
  services: {
    fetchData: async (ctx, event) => {
      const payload = omit("type", event);
      const contextTransactionId = ctx.results?.[0]?.id;
      const transactionId = contextTransactionId || payload.transactionId;
      const resp = await httpClient.get(
        `http://localhost:${backendPort}/transactions/${transactionId}`
      );

      return { results: [resp.data.transaction] };
    },
    createData: async (ctx, event) => {
      const route = event.entity === "LIKE" ? "likes" : "comments";
      const payload = flow(omit("type"), omit("entity"))(event);
      const resp = await httpClient.post(
        `http://localhost:${backendPort}/${route}/${payload.transactionId}`,
        payload
      );
      return resp.data;
    },
    updateData: async (ctx, event) => {
      const payload = omit("type", event);
      const contextTransactionId = ctx.results?.[0]?.id;
      const transactionId = contextTransactionId || payload.id;
      const resp = await httpClient.patch(
        `http://localhost:${backendPort}/transactions/${transactionId}`,
        payload
      );
      // accepting a request changes the current user's balance
      authService.send("REFRESH");
      return resp.data;
    },
  },
});
