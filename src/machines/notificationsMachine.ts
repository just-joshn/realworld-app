import { NotificationResponseItem } from "../models";
import { isEmpty, omit } from "lodash/fp";
import { dataMachine } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { backendPort } from "../utils/portUtils";

export const notificationsMachine = dataMachine<NotificationResponseItem>(
  "notifications"
).withConfig({
  services: {
    fetchData: async (ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.get(`http://localhost:${backendPort}/notifications`, {
        params: !isEmpty(payload) && event.type === "FETCH" ? payload : undefined,
      });
      return resp.data;
    },
    updateData: async (ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.patch(
        `http://localhost:${backendPort}/notifications/${payload.id}`,
        payload
      );
      return resp.data;
    },
  },
});
