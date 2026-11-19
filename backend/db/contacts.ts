import { v4 } from "uuid";
import shortid from "shortid";
import type { Contact } from "../../src/models";
import { required } from "../required";
import { CONTACT_TABLE, getBy, insertRow, replaceTable, rows, select } from "./store";
import { getUserByUsername } from "./users";

export const getAllContacts = () => rows(CONTACT_TABLE);

export const getContactBy = (key: string, value: unknown) => getBy(CONTACT_TABLE, key, value);

export const getContactsBy = (key: string, value: unknown) =>
  select(rows(CONTACT_TABLE), { [key]: value });

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
  replaceTable(
    CONTACT_TABLE,
    rows(CONTACT_TABLE).filter((contact) => contact.id !== contactId)
  );
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
