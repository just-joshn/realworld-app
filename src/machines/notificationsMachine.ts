import { notificationsResponseSchema } from "../models/schemas";
import type { NotificationResponseItem } from "../models";
import { isEmpty, omit } from "lodash/fp";
import { dataMachine, dataServices } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { apiUrl } from "../utils/apiConfig";

const { load, change } = dataServices<NotificationResponseItem>();

export const notificationsMachine = dataMachine<NotificationResponseItem>("notifications").provide({
  actors: {
    fetchData: load(async (_ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.get<unknown>(apiUrl("/notifications"), {
        params: !isEmpty(payload) && event.type === "FETCH" ? payload : undefined,
      });
      return notificationsResponseSchema.validateSync(resp.data);
    }),
    updateData: change(async (_ctx, event) => {
      const payload = omit("type", event);
      const resp = await httpClient.patch<unknown>(
        apiUrl(`/notifications/${String(payload.id)}`),
        payload
      );
      return resp.data;
    }),
  },
});
