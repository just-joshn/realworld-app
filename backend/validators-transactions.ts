import { body, query } from "express-validator";
import { includes } from "lodash/fp";
import {
  TransactionStatus,
  TransactionRequestStatus,
  DefaultPrivacyLevel,
} from "../src/models";

const TransactionStatusValues = Object.values(TransactionStatus);
const RequestStatusValues = Object.values(TransactionRequestStatus);
const DefaultPrivacyLevelValues = Object.values(DefaultPrivacyLevel);

export const sanitizeTransactionStatus = query("status").customSanitizer(
  (value: unknown) => {
    if (includes(value, TransactionStatusValues)) {
      return value;
    }
    return;
  },
);

export const sanitizeRequestStatus = query("requestStatus").customSanitizer(
  (value: unknown) => {
    if (includes(value, RequestStatusValues)) {
      return value;
    }
    return;
  },
);

export const isTransactionQSValidator = [
  query("status").isIn(TransactionStatusValues).optional().trim(),
  query("requestStatus")
    .optional({ checkFalsy: true })
    .isIn(RequestStatusValues)
    .trim(),
  query("receiverId").optional({ checkFalsy: true }).isString().trim(),
  query("senderId").optional({ checkFalsy: true }).isString().trim(),
  query("rangeStartTs").optional({ checkFalsy: true }).isString().trim(),
  query("rangeEndTs").optional({ checkFalsy: true }).isString().trim(),
  query("amountMax").optional({ checkFalsy: true }).isNumeric().trim(),
  query("amountMin").optional({ checkFalsy: true }).isNumeric().trim(),
];

export const isTransactionPayloadValidator = [
  body("transactionType").isIn(["payment", "request"]).trim(),
  body("privacyLevel").optional().isIn(DefaultPrivacyLevelValues).trim(),
  body("source").optional().isString().trim(),
  body("receiverId").isString().trim(),
  body("description").isString().trim(),
  body("amount").isNumeric().trim().toFloat(),
];

export const isTransactionPatchValidator = [
  body("requestStatus").isIn(RequestStatusValues),
];

export const isTransactionPublicQSValidator = [
  query("order").optional({ checkFalsy: true }).isIn(["default"]),
];
