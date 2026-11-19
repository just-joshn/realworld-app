import { createSeedUsers, createSeedContacts, createSeedBankAccounts } from "./users";
import { createSeedTransactions } from "./transactions";
import { createSeedLikes, createSeedComments, createSeedNotifications } from "./social";
import { createSeedBankTransfers } from "./bankTransfers";

export const buildDatabase = () => {
  const seedUsers = createSeedUsers();
  const seedContacts = createSeedContacts(seedUsers);
  const seedBankAccounts = createSeedBankAccounts(seedUsers);
  const seedTransactions = createSeedTransactions(seedUsers, seedBankAccounts);
  const seedLikes = createSeedLikes(seedUsers, seedTransactions);
  const seedComments = createSeedComments(seedUsers, seedTransactions);
  const seedNotifications = createSeedNotifications(
    seedUsers,
    seedTransactions,
    seedLikes,
    seedComments
  );
  const seedBankTransfers = createSeedBankTransfers(seedUsers, seedTransactions, seedBankAccounts);

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
