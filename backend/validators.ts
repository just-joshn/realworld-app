import { body, check, query } from "express-validator";
import { isValid } from "shortid";
import { NotificationsType } from "../src/models";
export * from "./validators-transactions";
export * from "./validators-users";

const NotificationsTypeValues = Object.values(NotificationsType);

const isShortId = (value: string) => isValid(value);

export const shortIdValidation = (key: string) => check(key).custom(isShortId);

export const searchValidation = query("q").exists();

export const isCommentValidator = body("content").isString().trim();

export const isNotificationsBodyValidator = [
  body("items.*.type").isIn(NotificationsTypeValues).trim(),
  body("items.*.transactionId").custom(isShortId),
];

export const isNotificationPatchValidator = [body("isRead").isBoolean()];

export const isValidEntityValidator = [
  check("entity")
    .isIn([
      "users",
      "contacts",
      "bankaccounts",
      "notifications",
      "transactions",
      "likes",
      "comments",
      "banktransfers",
    ])
    .trim(),
];
