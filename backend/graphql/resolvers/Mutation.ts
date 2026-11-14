import type { BankAccount, User } from "../../../src/models";
import { createBankAccountForUser, removeBankAccountById } from "../../database";

const Mutation = {
  createBankAccount: (
    _obj: unknown,
    args: Pick<BankAccount, "bankName" | "accountNumber" | "routingNumber">,
    ctx: { user: User }
  ) => {
    return createBankAccountForUser(ctx.user.id, args);
  },
  deleteBankAccount: (_obj: unknown, args: { id: string }) => {
    removeBankAccountById(args.id);
    return true;
  },
};

export default Mutation;
