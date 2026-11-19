import { required } from "../backend/required";
import dotenv from "dotenv";

dotenv.config();

import shortid from "shortid";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import {
  map,
  flattenDeep,
  times,
  concat,
  sample,
  uniqBy,
  flow,
  get,
  curry,
  filter,
  isEqual,
  flattenDepth,
  find,
  compact,
  differenceBy,
  sampleSize,
} from "lodash/fp";
import type {
  BankAccount,
  User,
  Like,
  Comment,
  PaymentNotification,
  NotificationType,
  LikeNotification,
  CommentNotification,
  Transaction,
  TransactionScenario,
  FakeTransaction,
  Contact,
  BankTransfer,
} from "../src/models";
import {
  DefaultPrivacyLevel,
  TransactionStatus,
  TransactionRequestStatus,
  BankTransferType,
  PaymentNotificationStatus,
} from "../src/models";
import { getFakeAmount } from "../src/utils/transactionUtils";

export const userbaseSize = +required(process.env["SEED_USERBASE_SIZE"], "SEED_USERBASE_SIZE");
export const contactsPerUser = +required(
  process.env["SEED_CONTACTS_PER_USER"],
  "SEED_CONTACTS_PER_USER"
);
export const paymentsPerUser = +required(
  process.env["SEED_PAYMENTS_PER_USER"],
  "SEED_PAYMENTS_PER_USER"
);
export const requestsPerUser = +required(
  process.env["SEED_REQUESTS_PER_USER"],
  "SEED_REQUESTS_PER_USER"
);
export const bankAccountsPerUser = +required(
  process.env["SEED_BANK_ACCOUNTS_PER_USER"],
  "SEED_BANK_ACCOUNTS_PER_USER"
);
export const likesPerUser = +required(process.env["SEED_LIKES_PER_USER"], "SEED_LIKES_PER_USER");
export const commentsPerUser = +required(
  process.env["SEED_COMMENTS_PER_USER"],
  "SEED_COMMENTS_PER_USER"
);
export const notificationsPerUser = +required(
  process.env["SEED_NOTIFICATIONS_PER_USER"],
  "SEED_NOTIFICATIONS_PER_USER"
);
export const bankTransfersPerUser = +required(
  process.env["SEED_BANK_TRANSFERS_PER_USER"],
  "SEED_BANK_TRANSFERS_PER_USER"
);
export const defaultPassword = required(
  process.env["SEED_DEFAULT_USER_PASSWORD"],
  "SEED_DEFAULT_USER_PASSWORD"
);

export const paymentVariations = 2;
export const requestVariations = 3;
export const transactionsPerUser =
  paymentsPerUser * paymentVariations * 2 + requestsPerUser * requestVariations * 2;
export const totalTransactions = userbaseSize * transactionsPerUser;
export const totalLikes = userbaseSize * likesPerUser;
export const totalComments = userbaseSize * commentsPerUser;
export const totalNotifications = userbaseSize * notificationsPerUser;
export const totalContacts = userbaseSize * contactsPerUser;
export const totalBankTransfers = userbaseSize * bankTransfersPerUser * 2;

export const isPayment = (type: string) => type === "payment";
export const passwordHash = bcrypt.hashSync(defaultPassword, 10);

const requestScenarios: TransactionScenario[] = [
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
];

const paymentScenarios: TransactionScenario[] = [
  {
    status: TransactionStatus.pending,
    requestStatus: "",
  },
  {
    status: TransactionStatus.complete,
    requestStatus: "",
  },
];

export const getRandomTransactions = (baseCount: number, baseTransactions: Transaction[]) =>
  compact(
    uniqBy(
      "id",
      times(() => sample(baseTransactions), baseCount * 3)
    )
  ).slice(0, baseCount);

export const getUserAvatar = (identifier: string) => {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(identifier)}`;
};

export const createFakeUser = (): User => {
  const id = shortid();
  return {
    id,
    uuid: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    username: faker.internet.username(),
    password: passwordHash,
    email: faker.internet.email(),
    phoneNumber: faker.helpers.replaceSymbols("###-###-####"),
    avatar: getUserAvatar(id),
    defaultPrivacyLevel: faker.helpers.arrayElement([
      DefaultPrivacyLevel.public,
      DefaultPrivacyLevel.private,
      DefaultPrivacyLevel.contacts,
    ]),
    balance: faker.number.int({ min: 10000, max: 200000 }),
    createdAt: faker.date.past(),
    modifiedAt: faker.date.recent(),
  };
};

export const createSeedUsers = () => times(() => createFakeUser(), userbaseSize);

export const createContact = (userId: User["id"], contactUserId: User["id"]) => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  contactUserId,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

export const getOtherRandomUser = curry((seedUsers: User[], userId: User["id"]): User =>
  required(sample(seedUsers.filter((user) => user.id !== userId)), "other user")
);

export const randomContactsForUser = curry((seedUsers: User[], user: User) =>
  uniqBy(
    "id",
    times(() => getOtherRandomUser(seedUsers, user.id), contactsPerUser * 3)
  ).slice(0, contactsPerUser)
);
export const generateRandomContactsForUser = (seedUsers: User[]) =>
  map((user: User) => ({
    userId: user.id,
    contacts: randomContactsForUser(seedUsers, user),
  }))(seedUsers);

export const createContactsForUser = curry(
  (randomContacts: ReturnType<typeof generateRandomContactsForUser>) =>
    flattenDeep(
      map((item: ReturnType<typeof generateRandomContactsForUser>[number]) =>
        map((contact: User) => createContact(item.userId, contact.id))(item.contacts)
      )(randomContacts)
    )
);

export const createSeedContacts = (seedUsers: User[]) => {
  return flow(generateRandomContactsForUser, createContactsForUser)(seedUsers);
};

export const createSeedBankAccounts = (seedUsers: User[]) =>
  map((user: User): BankAccount => {
    return {
      id: shortid(),
      uuid: faker.string.uuid(),
      userId: user.id,
      bankName: `${faker.company.name()} Bank`,
      accountNumber: faker.finance.accountNumber(10),
      routingNumber: faker.finance.accountNumber(9),
      isDeleted: false,
      createdAt: faker.date.past(),
      modifiedAt: faker.date.recent(),
    };
  })(seedUsers);

export const createTransaction = (
  type: "payment" | "request",
  account: BankAccount,
  details: FakeTransaction
): Transaction => {
  const { senderId, receiverId } = details;

  const createdAt = faker.date.past();
  const modifiedAt = faker.date.recent();

  const status = faker.helpers.arrayElement([TransactionStatus.pending, TransactionStatus.complete]);

  let requestStatus: TransactionRequestStatus | "" = "";

  if (type === "request") {
    requestStatus = TransactionRequestStatus.pending;

    if (status === TransactionStatus.complete) {
      requestStatus = faker.helpers.arrayElement([
        TransactionRequestStatus.accepted,
        TransactionRequestStatus.rejected,
      ]);
    }
  }

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

export const createFakeLike = (userId: string, transactionId: string): Like => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  transactionId,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

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

export const createSeedLikes = (seedUsers: User[], seedTransactions: Transaction[]) =>
  flattenDeep(
    map((user: User): Like[] => {
      const transactions = getPublicTransactionsForOtherUsers(seedTransactions, user.id);

      const randomTransactions = getRandomTransactions(10, transactions);

      const selectedTransactions = sampleSize(
        likesPerUser,
        compact(randomTransactions.slice(0, likesPerUser * 2))
      );

      return selectedTransactions.map((transaction) => createFakeLike(user.id, transaction.id));
    })(seedUsers)
  );

export const createFakeComment = (userId: string, transactionId: string): Comment => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  content: faker.lorem.words(),
  userId,
  transactionId,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

export const createSeedComments = (seedUsers: User[], seedTransactions: Transaction[]) =>
  flattenDeep(
    map((user: User): Comment[] => {
      const transactions = getPublicTransactionsForOtherUsers(seedTransactions, user.id);

      const randomTransactions = getRandomTransactions(5, transactions);

      const selectedTransactions = randomTransactions.slice(0, commentsPerUser);

      return selectedTransactions.map((transaction) => createFakeComment(user.id, transaction.id));
    })(seedUsers)
  );

export const createFakePaymentNotification = (
  userId: string,
  transaction: Transaction,
  status: PaymentNotificationStatus
): PaymentNotification => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  transactionId: transaction.id,
  status,
  isRead: false,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

export const createFakeLikeNotification = (
  userId: string,
  transactionId: string,
  likeId: string
): LikeNotification => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  likeId,
  transactionId,
  isRead: false,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

export const createFakeCommentNotification = (
  userId: string,
  transactionId: string,
  commentId: string
): CommentNotification => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  commentId,
  transactionId,
  isRead: false,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

const getTransactionsWithLikes = (transactions: Transaction[], seedLikes: Like[]) =>
  transactions.filter((transaction) =>
    seedLikes.some((like) => isEqual(transaction.id, like.transactionId))
  );

const getLikeByTransactionId = (transactionId: Transaction["id"], seedLikes: Like[]) =>
  required(find({ transactionId }, seedLikes), "like");

const getTransactionsWithComments = (transactions: Transaction[], seedComments: Comment[]) =>
  transactions.filter((transaction) =>
    seedComments.some((comment) => isEqual(transaction.id, comment.transactionId))
  );

const getCommentByTransactionId = (transactionId: Transaction["id"], seedComments: Comment[]) =>
  required(find({ transactionId }, seedComments), "comment");

export const createSeedNotifications = (
  seedUsers: User[],
  seedTransactions: Transaction[],
  seedLikes: Like[],
  seedComments: Comment[]
) =>
  flattenDeep(
    map((user: User): NotificationType[] => {
      const transactions = getPublicTransactionsForOtherUsers(seedTransactions, user.id);

      const transactionsWithLikes = getTransactionsWithLikes(transactions, seedLikes);

      const transactionsWithComments = getTransactionsWithComments(transactions, seedComments);

      const likeTransaction = required(
        sample(compact(getRandomTransactions(5, transactionsWithLikes))),
        "transaction with likes"
      );
      const like = getLikeByTransactionId(likeTransaction.id, seedLikes);
      const likeNotification = createFakeLikeNotification(user.id, likeTransaction.id, like.id);

      const commentTransaction = required(
        sample(compact(getRandomTransactions(5, transactionsWithComments))),
        "transaction with comments"
      );
      const comment = getCommentByTransactionId(commentTransaction.id, seedComments);
      const commentNotification = createFakeCommentNotification(
        user.id,
        commentTransaction.id,
        comment.id
      );

      const randomTransactions = getRandomTransactions(notificationsPerUser - 2, transactions);

      const paymentRequestNotifications = randomTransactions.map((transaction) =>
        createFakePaymentNotification(user.id, transaction, PaymentNotificationStatus.requested)
      );

      const paymentReceivedNotifications = randomTransactions.map((transaction) =>
        createFakePaymentNotification(user.id, transaction, PaymentNotificationStatus.received)
      );

      const allNotifications = [likeNotification, commentNotification];

      return flattenDeep(
        concat<NotificationType | NotificationType[]>(allNotifications, [
          paymentRequestNotifications,
          paymentReceivedNotifications,
        ])
      );
    })(seedUsers)
  );

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

export const buildDatabase = () => {
  const seedUsers: User[] = createSeedUsers();
  const seedContacts: Contact[] = createSeedContacts(seedUsers);
  const seedBankAccounts: BankAccount[] = createSeedBankAccounts(seedUsers);
  const seedTransactions: Transaction[] = createSeedTransactions(seedUsers, seedBankAccounts);
  const seedLikes: Like[] = createSeedLikes(seedUsers, seedTransactions);
  const seedComments: Comment[] = createSeedComments(seedUsers, seedTransactions);
  const seedNotifications: NotificationType[] = createSeedNotifications(
    seedUsers,
    seedTransactions,
    seedLikes,
    seedComments
  );
  const seedBankTransfers: BankTransfer[] = createSeedBankTransfers(
    seedUsers,
    seedTransactions,
    seedBankAccounts
  );

  return {
    users: seedUsers,
    contacts: seedContacts,
    bankaccounts: seedBankAccounts,
    transactions: seedTransactions,
    likes: seedLikes,
    comments: seedComments,
    notifications: seedNotifications,
    banktransfers: seedBankTransfers,
  };
};
