import { required } from "../../required";
import type { User } from "../../../src/models";
import { getBankAccountsByUserId } from "../../database";

const Query = {
  listBankAccount(_obj: unknown, _args: unknown, ctx: { user?: User }) {
    try {
      return getBankAccountsByUserId(required(ctx.user, "GraphQL user").id);
    } catch (err) {
      throw new Error(String(err), { cause: err });
    }
  },
};

export default Query;
