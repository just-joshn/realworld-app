import shortid from "shortid";
import { faker } from "@faker-js/faker";
import { map, flattenDeep, times, sample, uniqBy, flow, curry } from "lodash/fp";
import type { BankAccount, User } from "../../src/models";
import { DefaultPrivacyLevel } from "../../src/models";
import { required } from "../../backend/required";
import { userbaseSize, contactsPerUser, passwordHash } from "./config";

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
