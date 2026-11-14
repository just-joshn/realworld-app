import { notificationsResponseSchema } from "../models/schemas";
import type { NotificationResponseItem } from "../models";
import { isEmpty, omit } from "lodash/fp";
import { dataMachine } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { backendPort } from "../utils/portUtils";

export const notificationsMachine = dataMachine<NotificationResponseItem>(
  "notifications"
).withConfig({
  services: {
    fetchData: async (_ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.get<unknown>(
        `http://localhost:${String(backendPort)}/notifications`,
        {
          params: !isEmpty(payload) && event.type === "FETCH" ? payload : undefined,
        }
      );
      return notificationsResponseSchema.validateSync(resp.data);
    },
    updateData: async (_ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.patch<unknown>(
        `http://localhost:${String(backendPort)}/notifications/${String(payload.id)}`,
        payload
      );
      return resp.data;
    },
  },
});
