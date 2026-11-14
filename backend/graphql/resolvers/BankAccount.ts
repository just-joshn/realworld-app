import type { BankAccount } from "../../../src/models";

// Accounts created while the server runs hold Date objects, which GraphQL's String scalar would
// send as epoch milliseconds. Send ISO timestamps, like the REST API and the seed data do.
const BankAccount = {
  createdAt: ({ createdAt }: Pick<BankAccount, "createdAt">) => new Date(createdAt).toISOString(),
  modifiedAt: ({ modifiedAt }: Pick<BankAccount, "modifiedAt">) =>
    new Date(modifiedAt).toISOString(),
};

export default BankAccount;
