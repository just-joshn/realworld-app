import bcrypt from "bcryptjs";
import { v4 } from "uuid";
import { curry, sample, remove } from "lodash/fp";
import shortid from "shortid";
import Fuse, { type IFuseOptions } from "fuse.js";
import type { User } from "../../src/models";
import { formatFullName } from "../../src/utils/transactionUtils";
import { required } from "../required";
import { USER_TABLE, getBy, insertRow, replaceTable, rows } from "./store";

export const getAllUsers = () => rows(USER_TABLE);

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

  insertRow(USER_TABLE, user);
  return user;
};

export const updateUserById = (userId: string, edits: Partial<User>) => {
  const user = getUserById(userId);
  if (!user) return;
  replaceTable(
    USER_TABLE,
    rows(USER_TABLE).map((row) => (row.id === userId ? { ...row, ...edits } : row))
  );
};

export const getFullNameForUser = (userId: User["id"]): string =>
  formatFullName(required(getUserById(userId), "user"));

export const getRandomUser = () => {
  const users = getAllUsers();
  return required(sample(users), "random user");
};
