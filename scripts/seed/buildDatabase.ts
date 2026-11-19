import type {
  User,
  Like,
  Comment,
  NotificationType,
  Contact,
  BankAccount,
  Transaction,
  BankTransfer,
} from "../../src/models";
import { createSeedUsers, createSeedContacts, createSeedBankAccounts } from "./users";
import { createSeedTransactions } from "./transactions";
import { createSeedLikes, createSeedComments, createSeedNotifications } from "./social";
import { createSeedBankTransfers } from "./bankTransfers";

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
