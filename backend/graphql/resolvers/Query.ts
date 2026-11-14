import { User } from "../../../src/models";
import { getBankAccountsByUserId } from "../../database";

const Query = {
  listBankAccount(obj: unknown, args: unknown, ctx: { user: User }) {
    try {
      return getBankAccountsByUserId(ctx.user.id);
    } catch (err) {
      throw new Error(String(err)); // eslint-disable-line preserve-caught-error
    }
  },
};

export default Query;
