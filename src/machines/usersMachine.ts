import { usersResponseSchema } from "../models/schemas";
import type { User } from "../models";
import { isEmpty, omit } from "lodash/fp";
import { dataMachine, dataServices } from "./dataMachine";
import { httpClient } from "../utils/asyncUtils";
import { backendPort } from "../utils/apiConfig";

const { load } = dataServices<User>();

export const usersMachine = dataMachine<User>("users").provide({
  actors: {
    fetchData: load(async (_ctx, event) => {
      const payload = omit("type", event);
      const route = isEmpty(payload) ? "users" : "users/search";
      const resp = await httpClient.get<unknown>(
        `http://localhost:${String(backendPort)}/${route}`,
        {
          params: !isEmpty(payload) ? payload : undefined,
        }
      );
      return usersResponseSchema.validateSync(resp.data);
    }),
  },
});
