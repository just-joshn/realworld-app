import { required } from "../../backend/required";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

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

export const avatarBaseUrl = "https://api.dicebear.com/9.x/pixel-art/svg?seed=";
