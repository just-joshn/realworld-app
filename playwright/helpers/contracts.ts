/** Shared Playwright contracts: finite domain sets and app routes. */

export type TransactionType = "payment" | "request";

export type PrivacyLevel = "public" | "private" | "contacts";

export type TransactionStatus = "pending" | "incomplete" | "complete";
export const transactionStatuses: [TransactionStatus, ...TransactionStatus[]] = [
  "pending",
  "incomplete",
  "complete",
];

export type TransactionRequestStatus = "pending" | "accepted" | "rejected";
export const transactionRequestStatuses: [
  TransactionRequestStatus,
  ...TransactionRequestStatus[],
] = ["pending", "accepted", "rejected"];

export const routes = {
  home: "/",
  signIn: "/signin",
  signUp: "/signup",
  userSettings: "/user/settings",
  bankAccounts: "/bankaccounts",
  bankAccountsNew: "/bankaccounts/new",
  notifications: "/notifications",
  transactionNew: "/transaction/new",
  feeds: {
    everyone: "/",
    friends: "/contacts",
    mine: "/personal",
  },
} as const;

export type FeedName = keyof typeof routes.feeds;

export function transactionPath(transactionId: string) {
  return `/transaction/${transactionId}`;
}
