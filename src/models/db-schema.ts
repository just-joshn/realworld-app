import type { User } from "./user";
import type { Contact } from "./contact";
import type { BankAccount } from "./bankaccount";
import type { Transaction } from "./transaction";
import type { Like } from "./like";
import type { BankTransfer } from "./banktransfer";
import type { NotificationType } from "./notification";
import type { Comment } from "./comment";

export interface DbSchema {
  users: User[];
  contacts: Contact[];
  bankaccounts: BankAccount[];
  transactions: Transaction[];
  likes: Like[];
  comments: Comment[];
  notifications: NotificationType[];
  banktransfers: BankTransfer[];
}
