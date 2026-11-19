import shortid from "shortid";
import { faker } from "@faker-js/faker";
import { map, flattenDeep, concat, sample, compact, sampleSize, isEqual, find } from "lodash/fp";
import type {
  User,
  Like,
  Comment,
  PaymentNotification,
  NotificationType,
  LikeNotification,
  CommentNotification,
  Transaction,
} from "../../src/models";
import { PaymentNotificationStatus } from "../../src/models";
import { required } from "../../backend/required";
import { likesPerUser, commentsPerUser, notificationsPerUser } from "./config";
import {
  getRandomTransactions,
  getPublicTransactionsForOtherUsers,
} from "./transactions";

export const createFakeLike = (userId: string, transactionId: string): Like => ({
  id: shortid(),
  uuid: faker.string.uuid(),
  userId,
  transactionId,
  createdAt: faker.date.past(),
  modifiedAt: faker.date.recent(),
});

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
