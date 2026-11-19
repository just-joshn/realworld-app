import { v4 } from "uuid";
import shortid from "shortid";
import type { Contact } from "../../src/models";
import { required } from "../required";
import { CONTACT_TABLE, db, getBy, insertRow, persist, rows, select } from "./store";
import { getUserByUsername } from "./users";

export const getAllContacts = () => db.data.contacts;

export const getContactBy = (key: string, value: unknown) => getBy(CONTACT_TABLE, key, value);

export const getContactsBy = (key: string, value: unknown) =>
  select(db.data.contacts, { [key]: value });

export const getContactsByUserId = (userId: string): Contact[] => getContactsBy("userId", userId);

export const getContactsByUsername = (username: string): Contact[] => {
  const user = required(getUserByUsername(username), "user");
  return getContactsByUserId(user.id);
};

export const getContactIdsForUser = (userId: string): Contact["id"][] =>
  getContactsByUserId(userId).map((contact) => contact.contactUserId);

export const createContact = (contact: Contact) => {
  insertRow(CONTACT_TABLE, contact);

  return getContactBy("id", contact.id);
};

export const removeContactById = (contactId: string) => {
  db.data.contacts = rows(CONTACT_TABLE).filter((contact) => contact.id !== contactId);
  persist();
};

export const createContactForUser = (userId: string, contactUserId: string) => {
  const contactId = shortid();
  const contact: Contact = {
    id: contactId,
    uuid: v4(),
    userId,
    contactUserId,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  const result = createContact(contact);

  return result;
};
