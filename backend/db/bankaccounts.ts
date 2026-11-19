import { v4 } from "uuid";
import shortid from "shortid";
import type { BankAccount } from "../../src/models";
import { BANK_ACCOUNT_TABLE, db, getBy, insertRow, persist, select } from "./store";

export const getBankAccountBy = (key: string, value: unknown) =>
  getBy(BANK_ACCOUNT_TABLE, key, value);

export const getBankAccountById = (id: string) => getBankAccountBy("id", id);

export const getBankAccountsBy = (key: string, value: unknown) =>
  select(db.data.bankaccounts, { [key]: value });

export const getBankAccountsByUserId = (userId: string) => getBankAccountsBy("userId", userId);

export const createBankAccount = (bankaccount: BankAccount) => {
  insertRow(BANK_ACCOUNT_TABLE, bankaccount);

  return getBankAccountBy("id", bankaccount.id);
};

export const createBankAccountForUser = (
  userId: string,
  accountDetails: Pick<BankAccount, "bankName" | "accountNumber" | "routingNumber">
) => {
  const accountId = shortid();
  const bankaccount: BankAccount = {
    id: accountId,
    uuid: v4(),
    userId,
    bankName: accountDetails.bankName,
    accountNumber: accountDetails.accountNumber,
    routingNumber: accountDetails.routingNumber,
    isDeleted: false,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  const result = createBankAccount(bankaccount);

  return result;
};

export const removeBankAccountById = (bankAccountId: string) => {
  const account = getBankAccountById(bankAccountId);
  if (account) account.isDeleted = true;
  persist();
};
