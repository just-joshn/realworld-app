import { BankAccount, User } from "../../../src/models";
import { createBankAccountForUser, removeBankAccountById } from "../../database";

const Mutation = {
  createBankAccount: (
    obj: unknown,
    args: Pick<BankAccount, "bankName" | "accountNumber" | "routingNumber">,
    ctx: { user: User }
  ) => {
    return createBankAccountForUser(ctx.user.id, args);
  },
  deleteBankAccount: (obj: unknown, args: { id: string }) => {
    removeBankAccountById(args.id);
    return true;
  },
};

export default Mutation;
