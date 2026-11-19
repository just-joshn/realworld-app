import path from "path";
import { parseDatabase } from "./database-schema";
import { required } from "./required";
import bcrypt from "bcryptjs";
import fs from "fs";
import { v4 } from "uuid";
import {
  uniqBy,
  map,
  sample,
  orderBy,
  flow,
  flatMap,
  curry,
  get,
  constant,
  filter,
  inRange,
  remove,
} from "lodash/fp";
import { isWithinInterval } from "date-fns";
import { LowSync, MemorySync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import shortid from "shortid";
import type {
  BankAccount,
  Transaction,
  User,
  Contact,
  Like,
  Comment,
  PaymentNotification,
  LikeNotification,
  CommentNotification,
  NotificationType,
  NotificationPayloadType,
  TransactionResponseItem,
  TransactionPayload,
  BankTransfer,
  BankTransferPayload,
  NotificationResponseItem,
  TransactionQueryPayload,
} from "../src/models";
import {
  TransactionStatus,
  TransactionRequestStatus,
  PaymentNotificationStatus,
  NotificationsType,
  BankTransferType,
  DefaultPrivacyLevel,
} from "../src/models";
import Fuse, { type IFuseOptions } from "fuse.js";
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
  formatFullName,
  isLikeNotification,
  isCommentNotification,
} from "../src/utils/transactionUtils";
import type { DbSchema } from "../src/models/db-schema";

export type TDatabase = {
  users: User[];
  contacts: Contact[];
  bankaccounts: BankAccount[];
  transactions: Transaction[];
  likes: Like[];
  comments: Comment[];
  notifications: NotificationType[];
  banktransfers: BankTransfer[];
};

const USER_TABLE = "users";
const CONTACT_TABLE = "contacts";
const BANK_ACCOUNT_TABLE = "bankaccounts";
const TRANSACTION_TABLE = "transactions";
const LIKE_TABLE = "likes";
const COMMENT_TABLE = "comments";
const NOTIFICATION_TABLE = "notifications";
const BANK_TRANSFER_TABLE = "banktransfers";

function emptyDatabase(): DbSchema {
  return {
    users: [],
    contacts: [],
    bankaccounts: [],
    transactions: [],
    likes: [],
    comments: [],
    notifications: [],
    banktransfers: [],
  };
}

const databaseFile = path.join(__dirname, "../data/database.json");
// lowdb's own preset switches to memory for every NODE_ENV=test process, including the API
// server the integration suite starts. Only the Vitest process itself should skip the file.
const db = new LowSync<DbSchema>(
  process.env["VITEST"] === "true"
    ? new MemorySync<DbSchema>()
    : new JSONFileSync<DbSchema>(databaseFile),
  emptyDatabase()
);
db.read();

function rows<K extends keyof DbSchema>(entity: K): DbSchema[K] {
  return db.data[entity];
}

function persist(): void {
  db.write();
}

function rowMatches(item: object, query: object): boolean {
  return Object.entries(query).every(([key, value]) =>
    Object.entries(item).some(([itemKey, itemValue]) => itemKey === key && itemValue === value)
  );
}

export const seedDatabase = () => {
  const testSeed: unknown = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "database-seed.json"), "utf-8")
  );

  db.data = parseDatabase(testSeed);
  persist();
};

export const getAllUsers = () => db.data.users;

export const getAllPublicTransactions = () =>
  db.data.transactions.filter(
    (transaction) => transaction.privacyLevel === DefaultPrivacyLevel.public
  );

export const getAllForEntity = <K extends keyof DbSchema>(entity: K): DbSchema[K] =>
  db.data[entity];

function select<T extends object>(items: readonly T[], query: object): T[] {
  const found: T[] = [];
  for (const item of items) {
    if (rowMatches(item, query)) found.push(item);
  }
  return found;
}

export function replaceDatabase(state: DbSchema): void {
  db.data = state;
  persist();
}

export function getAllBy(entity: keyof DbSchema, key: string, value: unknown): object[] {
  const items: readonly object[] = db.data[entity];
  return select(items, { [key]: value });
}

export function getBy<K extends keyof DbSchema>(
  entity: K,
  key: string,
  value: unknown
): DbSchema[K][number] | undefined {
  return rows(entity).find((item) => rowMatches(item, { [key]: value }));
}

export function getAllByObj(entity: keyof DbSchema, query: object): object[] {
  const items: readonly object[] = db.data[entity];
  return select(items, query);
}

export const cleanSearchQuery = (query: string) => query.replace(/[^a-zA-Z0-9]/g, "");

export const setupSearch = curry(
  (items: object[], options: IFuseOptions<object>, query: string) => {
    const fuse = new Fuse(items, options);
    return fuse.search(query);
  }
);

export const performSearch = <T>(items: T[], options: IFuseOptions<T>, query: string): T[] =>
  new Fuse(items, options).search(cleanSearchQuery(query)).map((result) => result.item);

export const searchUsers = (query: string) => {
  const items = getAllUsers();
  return performSearch(
    items,
    {
      keys: ["firstName", "lastName", "username", "email", "phoneNumber"],
    },
    query
  );
};

export const removeUserFromResults = (userId: User["id"], results: User[]) =>
  remove({ id: userId }, results);

export const getUserBy = (key: string, value: unknown) => getBy(USER_TABLE, key, value);
export const getUserId = (user: User): string => user.id;
export const getUserById = (id: string) => getUserBy("id", id);
export const getUserByUsername = (username: string) => getUserBy("username", username);

export const createUser = (
  userDetails: Pick<
    User,
    | "password"
    | "firstName"
    | "lastName"
    | "username"
    | "email"
    | "phoneNumber"
    | "avatar"
    | "defaultPrivacyLevel"
  > &
    Partial<User>
): User => {
  const password = bcrypt.hashSync(userDetails.password, 10);
  const user: User = {
    id: shortid(),
    uuid: v4(),
    firstName: userDetails.firstName,
    lastName: userDetails.lastName,
    username: userDetails.username,
    password,
    email: userDetails.email,
    phoneNumber: userDetails.phoneNumber,
    balance: Number(userDetails.balance) || 0,
    avatar: userDetails.avatar,
    defaultPrivacyLevel: userDetails.defaultPrivacyLevel,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  saveUser(user);
  return user;
};

const saveUser = (user: User) => {
  rows(USER_TABLE).push(user);
  persist();
};

export const updateUserById = (userId: string, edits: Partial<User>) => {
  const user = getUserById(userId);
  if (user) Object.assign(user, edits);
  persist();
};

export const getContactBy = (key: string, value: unknown) => getBy(CONTACT_TABLE, key, value);

export const getContactsBy = (key: string, value: unknown) =>
  select(db.data.contacts, { [key]: value });

export const getContactsByUsername = (username: string): Contact[] => {
  const user = required(getUserByUsername(username), "user");
  return getContactsByUserId(user.id);
};

export const getContactsByUserId = (userId: string): Contact[] => getContactsBy("userId", userId);

export const createContact = (contact: Contact) => {
  rows(CONTACT_TABLE).push(contact);
  persist();

  return getContactBy("id", contact.id);
};

export const removeContactById = (contactId: string) => {
  db.data.contacts = rows(CONTACT_TABLE).filter((contact) => contact.id !== contactId);
  persist();
};

export const createContactForUser = (userId: string, contactUserId: string) => {
  const contactId = shortid();
  const contact: Contact = {
    id: contactId,
    uuid: v4(),
    userId,
    contactUserId,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  const result = createContact(contact);

  return result;
};

export const getBankAccountBy = (key: string, value: unknown) =>
  getBy(BANK_ACCOUNT_TABLE, key, value);

export const getBankAccountById = (id: string) => getBankAccountBy("id", id);

export const getBankAccountsBy = (key: string, value: unknown) =>
  select(db.data.bankaccounts, { [key]: value });

export const createBankAccount = (bankaccount: BankAccount) => {
  rows(BANK_ACCOUNT_TABLE).push(bankaccount);
  persist();

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

export const getBankTransferBy = (key: string, value: unknown) =>
  getBy(BANK_TRANSFER_TABLE, key, value);

export const getBankTransfersBy = (key: string, value: unknown) =>
  select(db.data.banktransfers, { [key]: value });

export const getBankTransfersByUserId = (userId: string) => getBankTransfersBy("userId", userId);

export const createBankTransfer = (bankTransferDetails: BankTransferPayload) => {
  const bankTransfer: BankTransfer = {
    id: shortid(),
    uuid: v4(),
    ...bankTransferDetails,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  const savedBankTransfer = saveBankTransfer(bankTransfer);
  return savedBankTransfer;
};

const saveBankTransfer = (bankTransfer: BankTransfer): BankTransfer => {
  rows(BANK_TRANSFER_TABLE).push(bankTransfer);
  persist();
  return bankTransfer;
};

export const getTransactionBy = (key: string, value: unknown) =>
  getBy(TRANSACTION_TABLE, key, value);

export const getTransactionById = (id: string) => getTransactionBy("id", id);

export const getTransactionsByObj = (query: object) => select(db.data.transactions, query);

export const getTransactionByIdForApi = (id: string) =>
  formatTransactionForApiResponse(required(getTransactionBy("id", id), "transaction"));

export const getTransactionsForUserForApi = (userId: string, query?: object) =>
  formatTransactionsForApiResponse(getTransactionsForUserByObj(userId, query ?? {}));

export const getFullNameForUser = (userId: User["id"]): string =>
  formatFullName(required(getUserById(userId), "user"));

export const formatTransactionForApiResponse = (
  transaction: Transaction
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
  transactions: Transaction[]
): TransactionResponseItem[] =>
  orderBy(
    [(transaction: Transaction) => new Date(transaction.modifiedAt)],
    ["desc"],
    transactions.map((transaction) => formatTransactionForApiResponse(transaction))
  );

export const getAllTransactionsForUserByObj = curry((userId: string, query: object | undefined) => {
  const queryWithoutFilterFields = query && getQueryWithoutFilterFields(query);

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
      transactionsWithinDateRange(dateRangeStart, dateRangeEnd, userTransactions)
    );
  }
  return userTransactions;
});

export const transactionsWithinAmountRange = curry(
  (
    amountMin: number | string | undefined,
    amountMax: number | string | undefined,
    transactions: Transaction[]
  ) => {
    if (amountMin === undefined || amountMax === undefined) {
      return transactions;
    }

    return filter(
      (transaction: Transaction) =>
        inRange(Number(amountMin), Number(amountMax), transaction.amount),
      transactions
    );
  }
);

export const transactionsWithinDateRange = curry(
  (
    dateRangeStart: string | undefined,
    dateRangeEnd: string | undefined,
    transactions: Transaction[]
  ) => {
    if (dateRangeStart === undefined || dateRangeEnd === undefined) {
      return transactions;
    }

    return filter(
      (transaction: Transaction) =>
        isWithinInterval(new Date(transaction.createdAt), {
          start: new Date(dateRangeStart),
          end: new Date(dateRangeEnd),
        }),
      transactions
    );
  }
);

export const getTransactionsForUserByObj = curry((userId: string, query: object): Transaction[] =>
  uniqBy("id", getAllTransactionsForUserByObj(userId, query))
);

export const getContactIdsForUser = (userId: string): Contact["id"][] =>
  getContactsByUserId(userId).map((contact) => contact.contactUserId);

export const getTransactionsForUserContacts = (userId: string, query?: object) =>
  uniqBy(
    "id",
    flatMap(
      (contactId: string) => getTransactionsForUserForApi(contactId, query),
      getContactIdsForUser(userId)
    )
  );

export const getTransactionIds = (transactions: Transaction[]) => map("id", transactions);

export const getContactsTransactionIds = (userId: string): Transaction["id"][] =>
  flow(getTransactionsForUserContacts, getTransactionIds)(userId);

export const nonContactPublicTransactions = (userId: string): Transaction[] => {
  const contactsTransactionIds = getContactsTransactionIds(userId);
  return getAllPublicTransactions().filter(
    (transaction) => !contactsTransactionIds.includes(transaction.id)
  );
};

export const getNonContactPublicTransactionsForApi = (userId: string) =>
  flow(nonContactPublicTransactions, formatTransactionsForApiResponse)(userId);

export const getPublicTransactionsDefaultSort = (userId: string) => ({
  contactsTransactions: getTransactionsForUserContacts(userId),
  publicTransactions: getNonContactPublicTransactionsForApi(userId),
});

export const getPublicTransactionsByQuery = (userId: string, query: TransactionQueryPayload) => {
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
          getNonContactPublicTransactionsForApi(userId)
        )
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
      savePayAppBalance(user)
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
    })
);

export const savePayAppBalance = curry((sender: User, balance: number) => {
  updateUserById(get("id", sender), { balance });
});

export const createTransaction = (
  userId: User["id"],
  transactionType: "payment" | "request",
  transactionDetails: Omit<TransactionPayload, "privacyLevel"> &
    Partial<Pick<TransactionPayload, "privacyLevel">>
): Transaction => {
  const sender = required(getUserById(userId), "sender");
  const receiver = required(getUserById(transactionDetails.receiverId), "receiver");
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
    ...(transactionType === "request" ? { requestStatus: TransactionRequestStatus.pending } : {}),
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  const savedTransaction = saveTransaction(transaction);

  if (isPayment(transaction)) {
    debitPayAppBalance(sender, transaction);
    creditPayAppBalance(receiver, transaction);
    updateTransactionById(transaction.id, {
      status: TransactionStatus.complete,
    });
    createPaymentNotification(
      transaction.receiverId,
      transaction.id,
      PaymentNotificationStatus.received
    );
  } else {
    createPaymentNotification(
      transaction.receiverId,
      transaction.id,
      PaymentNotificationStatus.requested
    );
  }

  return savedTransaction;
};

const saveTransaction = (transaction: Transaction): Transaction => {
  rows(TRANSACTION_TABLE).push(transaction);
  persist();
  return transaction;
};

export const updateTransactionById = (transactionId: string, edits: Partial<Transaction>) => {
  const transaction = required(getTransactionBy("id", transactionId), "transaction");
  const { senderId, receiverId } = transaction;
  const sender = required(getUserById(senderId), "sender");
  const receiver = required(getUserById(receiverId), "receiver");

  if (isRequestTransaction(transaction)) {
    edits.status = TransactionStatus.complete;
  }

  // only an accepted request moves money: debit the payee, credit the requester
  if (
    isRequestTransaction(transaction) &&
    edits.requestStatus === TransactionRequestStatus.accepted
  ) {
    debitPayAppBalance(receiver, transaction);
    creditPayAppBalance(sender, transaction);

    createPaymentNotification(
      transaction.senderId,
      transaction.id,
      PaymentNotificationStatus.received
    );
  }

  Object.assign(transaction, edits);
  persist();
};

export const getLikeBy = (key: string, value: unknown): Like =>
  required(getBy(LIKE_TABLE, key, value), "like");
export const getLikesByObj = (query: object) => select(db.data.likes, query);

export const getLikeById = (id: string): Like => getLikeBy("id", id);
export const getLikesByTransactionId = (transactionId: string) => getLikesByObj({ transactionId });

export const createLike = (userId: string, transactionId: string): Like => {
  const like = {
    id: shortid(),
    uuid: v4(),
    userId,
    transactionId,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  const savedLike = saveLike(like);
  return savedLike;
};

export const createLikes = (userId: string, transactionId: string) => {
  const { senderId, receiverId } = required(getTransactionById(transactionId), "transaction");

  const like = createLike(userId, transactionId);

  if (userId !== senderId || userId !== receiverId) {
    createLikeNotification(senderId, transactionId, like.id);
    createLikeNotification(receiverId, transactionId, like.id);
  } else if (userId === senderId) {
    createLikeNotification(senderId, transactionId, like.id);
  } else {
    createLikeNotification(receiverId, transactionId, like.id);
  }
};

const saveLike = (like: Like): Like => {
  rows(LIKE_TABLE).push(like);
  persist();
  return like;
};

export const getCommentBy = (key: string, value: unknown): Comment =>
  required(getBy(COMMENT_TABLE, key, value), "comment");
export const getCommentsByObj = (query: object) => select(db.data.comments, query);

export const getCommentById = (id: string): Comment => getCommentBy("id", id);
export const getCommentsByTransactionId = (transactionId: string) =>
  getCommentsByObj({ transactionId });

export const createComment = (userId: string, transactionId: string, content: string): Comment => {
  const comment = {
    id: shortid(),
    uuid: v4(),
    content,
    userId,
    transactionId,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  const savedComment = saveComment(comment);
  return savedComment;
};

export const createComments = (userId: string, transactionId: string, content: string) => {
  const { senderId, receiverId } = required(getTransactionById(transactionId), "transaction");

  const comment = createComment(userId, transactionId, content);

  if (userId !== senderId || userId !== receiverId) {
    createCommentNotification(senderId, transactionId, comment.id);
    createCommentNotification(receiverId, transactionId, comment.id);
  } else if (userId === senderId) {
    createCommentNotification(senderId, transactionId, comment.id);
  } else {
    createCommentNotification(receiverId, transactionId, comment.id);
  }
};

const saveComment = (comment: Comment): Comment => {
  rows(COMMENT_TABLE).push(comment);
  persist();
  return comment;
};

export const getNotificationBy = (key: string, value: unknown): NotificationType =>
  required(getBy(NOTIFICATION_TABLE, key, value), "notification");

export const getNotificationsByObj = (query: object): NotificationType[] =>
  select(db.data.notifications, query);

export const getUnreadNotificationsByUserId = (userId: string) =>
  formatNotificationsForApiResponse(getNotificationsByObj({ userId, isRead: false }));

export const createPaymentNotification = (
  userId: string,
  transactionId: string,
  status: PaymentNotificationStatus
): PaymentNotification => {
  const notification: PaymentNotification = {
    id: shortid(),
    uuid: v4(),
    userId: userId,
    transactionId: transactionId,
    status,
    isRead: false,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  saveNotification(notification);
  return notification;
};

export const createLikeNotification = (
  userId: string,
  transactionId: string,
  likeId: string
): LikeNotification => {
  const notification: LikeNotification = {
    id: shortid(),
    uuid: v4(),
    userId: userId,
    transactionId: transactionId,
    likeId: likeId,
    isRead: false,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  saveNotification(notification);
  return notification;
};

export const createCommentNotification = (
  userId: string,
  transactionId: string,
  commentId: string
): CommentNotification => {
  const notification: CommentNotification = {
    id: shortid(),
    uuid: v4(),
    userId: userId,
    transactionId: transactionId,
    commentId: commentId,
    isRead: false,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  saveNotification(notification);
  return notification;
};

const saveNotification = (notification: NotificationType) => {
  rows(NOTIFICATION_TABLE).push(notification);
  persist();
};

export const createNotifications = (userId: string, notifications: NotificationPayloadType[]) =>
  notifications.flatMap((item: NotificationPayloadType) => {
    if ("status" in item && item.type === NotificationsType.payment) {
      return createPaymentNotification(userId, item.transactionId, item.status);
    } else if ("likeId" in item && item.type === NotificationsType.like) {
      return createLikeNotification(userId, item.transactionId, item.likeId);
    } else {
      if ("commentId" in item) {
        return createCommentNotification(userId, item.transactionId, item.commentId);
      }
    }
    return undefined;
  });

export const updateNotificationById = (
  _userId: string,
  notificationId: string,
  edits: Partial<NotificationType>
) => {
  const notification = getNotificationBy("id", notificationId);
  Object.assign(notification, edits);
  persist();
};

export const formatNotificationForApiResponse = (
  notification: NotificationType
): NotificationResponseItem => {
  let userFullName = getFullNameForUser(notification.userId);
  const transaction = required(getTransactionById(notification.transactionId), "transaction");

  if (isRequestTransaction(transaction)) {
    userFullName = getFullNameForUser(transaction.senderId);
  }

  if (isLikeNotification(notification)) {
    const like = getLikeById(notification.likeId);
    userFullName = getFullNameForUser(like.userId);
  }

  if (isCommentNotification(notification)) {
    const comment = getCommentById(notification.commentId);
    userFullName = getFullNameForUser(comment.userId);
  }

  return {
    userFullName,
    ...notification,
  };
};

export const formatNotificationsForApiResponse = (
  notifications: NotificationType[]
): NotificationResponseItem[] =>
  orderBy(
    [(notification: NotificationResponseItem) => new Date(notification.modifiedAt)],
    ["desc"],
    notifications.map((notification) => formatNotificationForApiResponse(notification))
  );

export const getRandomUser = () => {
  const users = getAllUsers();
  return required(sample(users), "random user");
};

export const getAllContacts = () => db.data.contacts;

export const getAllTransactions = () => db.data.transactions;

export const getBankAccountsByUserId = (userId: string) => getBankAccountsBy("userId", userId);

export const getNotificationById = (id: string): NotificationType => getNotificationBy("id", id);

export const getNotificationsByUserId = (userId: string) => getNotificationsByObj({ userId });

export const getBankTransferByTransactionId = (transactionId: string) =>
  getBankTransferBy("transactionId", transactionId);

export const getTransactionsBy = (key: string, value: string) =>
  select(db.data.transactions, { [key]: value });

export const getTransactionsByUserId = (userId: string) => getTransactionsBy("receiverId", userId);
