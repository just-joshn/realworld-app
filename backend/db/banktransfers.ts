import { v4 } from "uuid";
import shortid from "shortid";
import type { BankTransfer, BankTransferPayload } from "../../src/models";
import { BANK_TRANSFER_TABLE, getBy, insertRow, rows, select } from "./store";

export const getBankTransferBy = (key: string, value: unknown) =>
  getBy(BANK_TRANSFER_TABLE, key, value);

export const getBankTransfersBy = (key: string, value: unknown) =>
  select(rows(BANK_TRANSFER_TABLE), { [key]: value });

export const getBankTransfersByUserId = (userId: string) => getBankTransfersBy("userId", userId);

export const getBankTransferByTransactionId = (transactionId: string) =>
  getBankTransferBy("transactionId", transactionId);

export const createBankTransfer = (bankTransferDetails: BankTransferPayload) => {
  const bankTransfer: BankTransfer = {
    id: shortid(),
    uuid: v4(),
    ...bankTransferDetails,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  insertRow(BANK_TRANSFER_TABLE, bankTransfer);
  return bankTransfer;
};
