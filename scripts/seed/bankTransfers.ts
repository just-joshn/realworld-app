import shortid from "shortid";
import { faker } from "@faker-js/faker";
import { map, flattenDepth } from "lodash/fp";
import type { BankAccount, User, Transaction, BankTransfer } from "../../src/models";
import { BankTransferType } from "../../src/models";
import { required } from "../../backend/required";
import { getFakeAmount } from "../../src/utils/transactionUtils";
import { bankTransfersPerUser } from "./config";
import {
  getBankAccountsByUserId,
  getTransactionsByUserId,
  getRandomTransactions,
} from "./transactions";

export const createBankTransfer = (
  transferType: BankTransferType,
  userId: User["id"],
  transactionId: Transaction["id"],
  bankAccountId: BankAccount["id"]
): BankTransfer => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  source: bankAccountId,
  amount: getFakeAmount(),
  type: transferType,
  transactionId,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

export const createSeedBankTransfers = (
  seedUsers: User[],
  seedTransactions: Transaction[],
  seedBankAccounts: BankAccount[]
) =>
  flattenDepth(
    2,
    map((user: User): BankTransfer[] => {
      const userTransactions: Transaction[] = getTransactionsByUserId(seedTransactions, user.id);
      const bankAccounts = getBankAccountsByUserId(seedBankAccounts, user.id);

      const randomTransactions = getRandomTransactions(bankTransfersPerUser, userTransactions);

      return flattenDepth(
        2,
        map((transaction: Transaction): BankTransfer[] => {
          const deposit = createBankTransfer(
            BankTransferType.deposit,
            user.id,
            transaction.id,
            required(bankAccounts[0], "bank account").id
          );
          const withdrawal = createBankTransfer(
            BankTransferType.withdrawal,
            user.id,
            transaction.id,
            required(bankAccounts[0], "bank account").id
          );

          return [deposit, withdrawal];
        })(randomTransactions)
      );
    })(seedUsers)
  );
