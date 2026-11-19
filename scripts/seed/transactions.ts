import shortid from "shortid";
import { faker } from "@faker-js/faker";
import {
  map,
  flattenDeep,
  times,
  concat,
  uniqBy,
  flow,
  get,
  filter,
  isEqual,
  flattenDepth,
  differenceBy,
  compact,
  sample,
} from "lodash/fp";
import type {
  BankAccount,
  User,
  Transaction,
  TransactionScenario,
  FakeTransaction,
} from "../../src/models";
import { DefaultPrivacyLevel, TransactionStatus, TransactionRequestStatus } from "../../src/models";
import { required } from "../../backend/required";
import { getFakeAmount } from "../../src/utils/transactionUtils";
import { isPayment, paymentsPerUser, requestsPerUser } from "./config";
import { getOtherRandomUser } from "./users";

const requestScenarios = [
  {
    status: TransactionStatus.pending,
    requestStatus: "pending",
  },
  {
    status: TransactionStatus.complete,
    requestStatus: "accepted",
  },
  {
    status: TransactionStatus.complete,
    requestStatus: "rejected",
  },
] satisfies TransactionScenario[];

const paymentScenarios = [
  {
    status: TransactionStatus.pending,
    requestStatus: "",
  },
  {
    status: TransactionStatus.complete,
    requestStatus: "",
  },
] satisfies TransactionScenario[];

export const getRandomTransactions = (baseCount: number, baseTransactions: Transaction[]) =>
  compact(
    uniqBy(
      "id",
      times(() => sample(baseTransactions), baseCount * 3)
    )
  ).slice(0, baseCount);

const resolveRequestStatus = (
  type: "payment" | "request",
  status: TransactionStatus
): TransactionRequestStatus | "" => {
  if (type !== "request") return "";
  if (status !== TransactionStatus.complete) return TransactionRequestStatus.pending;
  return faker.helpers.arrayElement([
    TransactionRequestStatus.accepted,
    TransactionRequestStatus.rejected,
  ]);
};

export const createTransaction = (
  type: "payment" | "request",
  account: BankAccount,
  details: FakeTransaction
): Transaction => {
  const { senderId, receiverId } = details;

  const createdAt = faker.date.past();
  const modifiedAt = faker.date.recent();

  const status = faker.helpers.arrayElement([
    TransactionStatus.pending,
    TransactionStatus.complete,
  ]);

  const requestStatus = resolveRequestStatus(type, status);

  const requestResolvedAt =
    requestStatus === TransactionRequestStatus.pending
      ? ""
      : faker.date.future({ refDate: createdAt });

  return {
    id: shortid(),
    uuid: faker.string.uuid(),
    source: account.id,
    amount: getFakeAmount(),
    description: isPayment(type)
      ? `Payment: ${senderId} to ${receiverId}`
      : `Request: ${receiverId} to ${senderId}`,
    privacyLevel: faker.helpers.arrayElement([
      DefaultPrivacyLevel.public,
      DefaultPrivacyLevel.private,
      DefaultPrivacyLevel.contacts,
    ]),
    receiverId,
    senderId,
    balanceAtCompletion: getFakeAmount(),
    status,
    requestStatus,
    requestResolvedAt,
    createdAt,
    modifiedAt,
  };
};

export const createPayment = (account: BankAccount, user: User, randomUser: User) => {
  const allScenarios = paymentScenarios.map((details) => {
    const paymentTransaction = createTransaction("payment", account, {
      senderId: user.id,
      receiverId: randomUser.id,
      ...details,
    });

    const paymentInverseTransaction = createTransaction("payment", account, {
      senderId: randomUser.id,
      receiverId: user.id,
      ...details,
    });

    return [paymentTransaction, paymentInverseTransaction];
  });

  return flattenDeep(allScenarios);
};

export const createRequest = (account: BankAccount, user: User, randomUser: User) => {
  const allScenarios = requestScenarios.map((details) => {
    const requestTransaction = createTransaction("request", account, {
      senderId: user.id,
      receiverId: randomUser.id,
      ...details,
    });

    const requestInverseTransaction = createTransaction("request", account, {
      senderId: randomUser.id,
      receiverId: user.id,
      ...details,
    });

    return [requestTransaction, requestInverseTransaction];
  });

  return flattenDeep(allScenarios);
};

export const getBankAccountsByUserId = (
  seedBankAccounts: BankAccount[],
  userId: User["id"]
): BankAccount[] => filter(flow(get("userId"), isEqual(userId)), seedBankAccounts);

export const getTransactionsByUserId = (
  seedTransactions: Transaction[],
  userId: User["id"]
): Transaction[] =>
  filter(
    ({ senderId, receiverId }) => isEqual(senderId, userId) || isEqual(receiverId, userId),
    seedTransactions
  );

export const getPublicTransactionsForOtherUsers = (
  seedTransactions: Transaction[],
  userId: User["id"]
): Transaction[] =>
  seedTransactions.filter(
    (transaction) =>
      transaction.privacyLevel === DefaultPrivacyLevel.public &&
      transaction.senderId !== userId &&
      transaction.receiverId !== userId
  );

export const createSeedTransactions = (seedUsers: User[], seedBankAccounts: BankAccount[]) =>
  flattenDepth(
    2,
    map((user: User): Transaction[] => {
      const accounts = getBankAccountsByUserId(seedBankAccounts, user.id);

      return flattenDepth(
        2,
        map((account: BankAccount): Transaction[] => {
          const randomUser = getOtherRandomUser(seedUsers, user.id);
          const payments = times(() => createPayment(account, user, randomUser), paymentsPerUser);
          const requests = times(() => createRequest(account, user, randomUser), requestsPerUser);

          const allScenarios = flattenDeep<Transaction>(concat<Transaction[]>(payments, requests));
          const requestedTransaction = required(
            filter<Transaction>(required(requestScenarios[0], "request scenario"), allScenarios)[0],
            "scenario transaction"
          );
          const chargedTransaction = required(
            filter<Transaction>(required(requestScenarios[1], "request scenario"), allScenarios)[0],
            "scenario transaction"
          );
          const paidTransaction = required(
            filter<Transaction>(required(paymentScenarios[1], "payment scenario"), allScenarios)[0],
            "scenario transaction"
          );

          const testTransactions = [paidTransaction, requestedTransaction, chargedTransaction];

          const remainingScenarios = differenceBy<Transaction, Transaction>(
            get("id"),
            allScenarios,
            testTransactions
          );

          return flattenDeep<Transaction>(
            concat<Transaction>(testTransactions, remainingScenarios)
          );
        })(accounts)
      );
    })(seedUsers)
  );
