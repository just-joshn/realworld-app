import { v4 } from "uuid";
import {
  uniqBy,
  map,
  orderBy,
  flow,
  flatMap,
  curry,
  get,
  constant,
} from "lodash/fp";
import shortid from "shortid";
import {
  transactionsWithinAmountRange,
  transactionsWithinDateRange,
} from "./transaction-ranges";

export { transactionsWithinAmountRange, transactionsWithinDateRange };
import type {
  Transaction,
  User,
  TransactionResponseItem,
  TransactionPayload,
  TransactionQueryPayload,
} from "../../src/models";
import {
  TransactionStatus,
  TransactionRequestStatus,
  PaymentNotificationStatus,
  BankTransferType,
  DefaultPrivacyLevel,
} from "../../src/models";
import {
  isPayment,
  getTransferAmount,
  hasSufficientFunds,
  getChargeAmount,
  hasDateQueryFields,
  getDateQueryFields,
  hasAmountQueryFields,
  getAmountQueryFields,
  getQueryWithoutFilterFields,
  getPayAppCreditedAmount,
  isRequestTransaction,
} from "../../src/utils/transactionUtils";
import { required } from "../required";
import {
  TRANSACTION_TABLE,
  db,
  getBy,
  insertRow,
  persist,
  select,
} from "./store";
import { getFullNameForUser, getUserById, updateUserById } from "./users";
import { getContactIdsForUser } from "./contacts";
import { createBankTransfer } from "./banktransfers";
import { getLikesByTransactionId } from "./likes";
import { getCommentsByTransactionId } from "./comments";
import { createPaymentNotification } from "./notifications";

export const getTransactionBy = (key: string, value: unknown) =>
  getBy(TRANSACTION_TABLE, key, value);

export const getTransactionById = (id: string) => getTransactionBy("id", id);

export const getTransactionsByObj = (query: object) =>
  select(db.data.transactions, query);

export const getTransactionByIdForApi = (id: string) =>
  formatTransactionForApiResponse(
    required(getTransactionBy("id", id), "transaction"),
  );

export const getTransactionsForUserForApi = (userId: string, query?: object) =>
  formatTransactionsForApiResponse(
    getTransactionsForUserByObj(userId, query ?? {}),
  );

export const formatTransactionForApiResponse = (
  transaction: Transaction,
): TransactionResponseItem => {
  const receiver = required(getUserById(transaction.receiverId), "receiver");
  const sender = required(getUserById(transaction.senderId), "sender");

  const receiverName = getFullNameForUser(transaction.receiverId);
  const senderName = getFullNameForUser(transaction.senderId);
  const likes = getLikesByTransactionId(transaction.id);
  const comments = getCommentsByTransactionId(transaction.id);

  return {
    receiverName,
    senderName,
    receiverAvatar: receiver.avatar,
    senderAvatar: sender.avatar,
    likes,
    comments,
    ...transaction,
  };
};

export const formatTransactionsForApiResponse = (
  transactions: Transaction[],
): TransactionResponseItem[] =>
  orderBy(
    [(transaction: Transaction) => new Date(transaction.modifiedAt)],
    ["desc"],
    transactions.map((transaction) =>
      formatTransactionForApiResponse(transaction),
    ),
  );

export const getAllTransactionsForUserByObj = curry(
  (userId: string, query: object | undefined) => {
    const queryWithoutFilterFields =
      query && getQueryWithoutFilterFields(query);

    const queryFields = queryWithoutFilterFields || query;

    const userTransactions = flatMap(getTransactionsByObj)([
      {
        receiverId: userId,
        ...queryFields,
      },
      {
        senderId: userId,
        ...queryFields,
      },
    ]);

    if (query && (hasDateQueryFields(query) || hasAmountQueryFields(query))) {
      const { dateRangeStart, dateRangeEnd } = getDateQueryFields(query);
      const { amountMin, amountMax } = getAmountQueryFields(query);

      return transactionsWithinAmountRange(
        amountMin,
        amountMax,
        transactionsWithinDateRange(
          dateRangeStart,
          dateRangeEnd,
          userTransactions,
        ),
      );
    }
    return userTransactions;
  },
);

export const getTransactionsForUserByObj = curry(
  (userId: string, query: object): Transaction[] =>
    uniqBy("id", getAllTransactionsForUserByObj(userId, query)),
);

export const getTransactionsForUserContacts = (
  userId: string,
  query?: object,
) =>
  uniqBy(
    "id",
    flatMap(
      (contactId: string) => getTransactionsForUserForApi(contactId, query),
      getContactIdsForUser(userId),
    ),
  );

export const getTransactionIds = (transactions: Transaction[]) =>
  map("id", transactions);

export const getContactsTransactionIds = (
  userId: string,
): Transaction["id"][] =>
  flow(getTransactionsForUserContacts, getTransactionIds)(userId);

export const nonContactPublicTransactions = (userId: string): Transaction[] => {
  const contactsTransactionIds = getContactsTransactionIds(userId);
  return getAllPublicTransactions().filter(
    (transaction) => !contactsTransactionIds.includes(transaction.id),
  );
};

export const getNonContactPublicTransactionsForApi = (userId: string) =>
  flow(nonContactPublicTransactions, formatTransactionsForApiResponse)(userId);

export const getPublicTransactionsDefaultSort = (userId: string) => ({
  contactsTransactions: getTransactionsForUserContacts(userId),
  publicTransactions: getNonContactPublicTransactionsForApi(userId),
});

export const getPublicTransactionsByQuery = (
  userId: string,
  query: TransactionQueryPayload,
) => {
  if (hasDateQueryFields(query) || hasAmountQueryFields(query)) {
    const { dateRangeStart, dateRangeEnd } = getDateQueryFields(query);
    const { amountMin, amountMax } = getAmountQueryFields(query);

    return {
      contactsTransactions: getTransactionsForUserContacts(userId, query),
      publicTransactions: transactionsWithinAmountRange(
        amountMin,
        amountMax,
        transactionsWithinDateRange(
          dateRangeStart,
          dateRangeEnd,
          getNonContactPublicTransactionsForApi(userId),
        ),
      ),
    };
  } else {
    return {
      contactsTransactions: getTransactionsForUserContacts(userId),
      publicTransactions: getNonContactPublicTransactionsForApi(userId),
    };
  }
};

export const resetPayAppBalance = constant(0);

export const debitPayAppBalance = (user: User, transaction: Transaction) => {
  if (hasSufficientFunds(user, transaction)) {
    flow(getChargeAmount, savePayAppBalance(user))(user, transaction);
  } else {
    flow(
      getTransferAmount(user),
      createBankTransferWithdrawal(user, transaction),
      resetPayAppBalance,
      savePayAppBalance(user),
    )(transaction);
  }
};

export const creditPayAppBalance = (user: User, transaction: Transaction) => {
  flow(getPayAppCreditedAmount, savePayAppBalance(user))(user, transaction);
};

export const createBankTransferWithdrawal = curry(
  (sender: User, transaction: Transaction, transferAmount: number) =>
    createBankTransfer({
      userId: sender.id,
      source: transaction.source,
      amount: transferAmount,
      transactionId: transaction.id,
      type: BankTransferType.withdrawal,
    }),
);

export const savePayAppBalance = curry((sender: User, balance: number) => {
  updateUserById(get("id", sender), { balance });
});

function applyCreateTransactionEffects(
  transaction: Transaction,
  sender: User,
  receiver: User,
): void {
  if (isPayment(transaction)) {
    debitPayAppBalance(sender, transaction);
    creditPayAppBalance(receiver, transaction);
    updateTransactionById(transaction.id, {
      status: TransactionStatus.complete,
    });
    createPaymentNotification(
      transaction.receiverId,
      transaction.id,
      PaymentNotificationStatus.received,
    );
    return;
  }
  createPaymentNotification(
    transaction.receiverId,
    transaction.id,
    PaymentNotificationStatus.requested,
  );
}

export const createTransaction = (
  userId: User["id"],
  transactionType: "payment" | "request",
  transactionDetails: Omit<TransactionPayload, "privacyLevel"> &
    Partial<Pick<TransactionPayload, "privacyLevel">>,
): Transaction => {
  const sender = required(getUserById(userId), "sender");
  const receiver = required(
    getUserById(transactionDetails.receiverId),
    "receiver",
  );
  const transaction: Transaction = {
    id: shortid(),
    uuid: v4(),
    source: transactionDetails.source,
    amount: Math.round(transactionDetails.amount * 100),
    description: transactionDetails.description,
    receiverId: transactionDetails.receiverId,
    senderId: userId,
    privacyLevel: transactionDetails.privacyLevel ?? sender.defaultPrivacyLevel,
    status: TransactionStatus.pending,
    ...(transactionType === "request"
      ? { requestStatus: TransactionRequestStatus.pending }
      : {}),
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  insertRow(TRANSACTION_TABLE, transaction);
  applyCreateTransactionEffects(transaction, sender, receiver);
  return transaction;
};

export const updateTransactionById = (
  transactionId: string,
  edits: Partial<Transaction>,
) => {
  const transaction = required(
    getTransactionBy("id", transactionId),
    "transaction",
  );
  const { senderId, receiverId } = transaction;
  const sender = required(getUserById(senderId), "sender");
  const receiver = required(getUserById(receiverId), "receiver");

  const nextEdits: Partial<Transaction> = isRequestTransaction(transaction)
    ? { ...edits, status: TransactionStatus.complete }
    : edits;

  // only an accepted request moves money: debit the payee, credit the requester
  if (
    isRequestTransaction(transaction) &&
    nextEdits.requestStatus === TransactionRequestStatus.accepted
  ) {
    debitPayAppBalance(receiver, transaction);
    creditPayAppBalance(sender, transaction);

    createPaymentNotification(
      transaction.senderId,
      transaction.id,
      PaymentNotificationStatus.received,
    );
  }

  db.data = {
    ...db.data,
    transactions: db.data.transactions.map((row) =>
      row.id === transactionId ? { ...row, ...nextEdits } : row,
    ),
  };
  persist();
};

export const getAllTransactions = () => db.data.transactions;

export const getAllPublicTransactions = () =>
  db.data.transactions.filter(
    (transaction) => transaction.privacyLevel === DefaultPrivacyLevel.public,
  );

export const getTransactionsBy = (key: string, value: string) =>
  select(db.data.transactions, { [key]: value });

export const getTransactionsByUserId = (userId: string) =>
  getTransactionsBy("receiverId", userId);
