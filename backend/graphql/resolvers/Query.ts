import { User } from "../../../src/models";
import { getBankAccountsByUserId } from "../../database";

const Query = {
  listBankAccount(obj: unknown, args: unknown, ctx: { user: User }) {
    /* istanbul ignore next */
    try {
      return getBankAccountsByUserId(ctx.user.id);
      /* istanbul ignore next */
    } catch (err) {
      /* istanbul ignore next */
      throw new Error(err === undefined ? undefined : `${err}`); // eslint-disable-line preserve-caught-error
    }
  },
};

export default Query;
