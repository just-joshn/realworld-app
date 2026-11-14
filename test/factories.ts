import {
  BankAccount,
  Comment,
  CommentNotification,
  Contact,
  DefaultPrivacyLevel,
  Like,
  LikeNotification,
  PaymentNotification,
  PaymentNotificationStatus,
  Transaction,
  TransactionResponseItem,
  TransactionStatus,
  User,
} from "../src/models";
import { DbSchema } from "../src/models/db-schema";

const createdAt = new Date("2026-01-01T00:00:00.000Z");

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "user1",
    uuid: "uuid-user1",
    firstName: "Ada",
    lastName: "Lovelace",
    username: "ada",
    password: "hashed",
    email: "ada@example.com",
    phoneNumber: "555-0100",
    balance: 10000,
    avatar: "https://example.com/ada.png",
    defaultPrivacyLevel: DefaultPrivacyLevel.public,
    createdAt,
    modifiedAt: createdAt,
    ...overrides,
  };
}

export function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn1",
    uuid: "uuid-txn1",
    source: "bank1",
    amount: 2500,
    description: "Lunch",
    privacyLevel: DefaultPrivacyLevel.public,
    receiverId: "user2",
    senderId: "user1",
    status: TransactionStatus.complete,
    createdAt,
    modifiedAt: createdAt,
    ...overrides,
  };
}

export function buildTransactionResponseItem(
  overrides: Partial<TransactionResponseItem> = {}
): TransactionResponseItem {
  return {
    ...buildTransaction(),
    likes: [],
    comments: [],
    receiverName: "Grace Hopper",
    receiverAvatar: "https://example.com/grace.png",
    senderName: "Ada Lovelace",
    senderAvatar: "https://example.com/ada.png",
    ...overrides,
  };
}

export function buildContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact1",
    uuid: "uuid-contact1",
    userId: "user1",
    contactUserId: "user2",
    createdAt,
    modifiedAt: createdAt,
    ...overrides,
  };
}

export function buildBankAccount(overrides: Partial<BankAccount> = {}): BankAccount {
  return {
    id: "bank1",
    uuid: "uuid-bank1",
    userId: "user1",
    bankName: "First Bank",
    accountNumber: "123456789",
    routingNumber: "987654321",
    isDeleted: false,
    createdAt,
    modifiedAt: createdAt,
    ...overrides,
  };
}

export function buildLike(overrides: Partial<Like> = {}): Like {
  return {
    id: "like1",
    uuid: "uuid-like1",
    userId: "user3",
    transactionId: "txn1",
    createdAt,
    modifiedAt: createdAt,
    ...overrides,
  };
}

export function buildComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment1",
    uuid: "uuid-comment1",
    content: "Nice!",
    userId: "user3",
    transactionId: "txn1",
    createdAt,
    modifiedAt: createdAt,
    ...overrides,
  };
}

export function buildPaymentNotification(
  overrides: Partial<PaymentNotification> = {}
): PaymentNotification {
  return {
    id: "notif1",
    uuid: "uuid-notif1",
    userId: "user2",
    transactionId: "txn1",
    status: PaymentNotificationStatus.received,
    isRead: false,
    createdAt,
    modifiedAt: createdAt,
    ...overrides,
  };
}

export function buildLikeNotification(overrides: Partial<LikeNotification> = {}): LikeNotification {
  return {
    id: "notif2",
    uuid: "uuid-notif2",
    userId: "user1",
    transactionId: "txn1",
    likeId: "like1",
    isRead: false,
    createdAt,
    modifiedAt: createdAt,
    ...overrides,
  };
}

export function buildCommentNotification(
  overrides: Partial<CommentNotification> = {}
): CommentNotification {
  return {
    id: "notif3",
    uuid: "uuid-notif3",
    userId: "user1",
    transactionId: "txn1",
    commentId: "comment1",
    isRead: false,
    createdAt,
    modifiedAt: createdAt,
    ...overrides,
  };
}

export function buildDbState(overrides: Partial<DbSchema> = {}): DbSchema {
  return {
    users: [],
    contacts: [],
    bankaccounts: [],
    transactions: [],
    likes: [],
    comments: [],
    notifications: [],
    banktransfers: [],
    ...overrides,
  };
}
