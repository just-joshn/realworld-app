import { transactionDetailResponseSchema } from "../models/schemas";
import type { TransactionResponseItem } from "../models";
import { omit, flow } from "lodash/fp";
import { dataMachine } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { backendPort } from "../utils/portUtils";
import { authService } from "./authMachine";

export const transactionDetailMachine = dataMachine<TransactionResponseItem>(
  "transactionData"
).withConfig({
  services: {
    fetchData: async (_ctx, event) => {
      const payload = omit("type", event);
      const contextTransactionId = _ctx.results[0]?.id;
      const transactionId = contextTransactionId || payload.transactionId;
      const resp = await httpClient.get<unknown>(
        `http://localhost:${String(backendPort)}/transactions/${String(transactionId)}`
      );
      return { results: [transactionDetailResponseSchema.validateSync(resp.data).transaction] };
    },
    createData: async (_ctx, event) => {
      const route = event.entity === "LIKE" ? "likes" : "comments";
      const payload = flow(omit("type"), omit("entity"))(event);
      const resp = await httpClient.post<unknown>(
        `http://localhost:${String(backendPort)}/${route}/${String(payload.transactionId)}`,
        payload
      );
      return resp.data;
    },
    updateData: async (_ctx, event) => {
      const payload = omit("type", event);
      const contextTransactionId = _ctx.results[0]?.id;
      const transactionId = contextTransactionId || payload.id;
      const resp = await httpClient.patch<unknown>(
        `http://localhost:${String(backendPort)}/transactions/${String(transactionId)}`,
        payload
      );
      // accepting a request changes the current user's balance
      authService.send("REFRESH");
      return resp.data;
    },
  },
});
