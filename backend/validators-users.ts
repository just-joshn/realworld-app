import { body, check, oneOf } from "express-validator";

export const userFieldsValidator = oneOf([
  check("firstName").exists(),
  check("lastName").exists(),
  check("password").exists(),
  check("balance").exists(),
  check("avatar").exists(),
  check("defaultPrivacyLevel").exists(),
]);

export const isBankAccountValidator = [
  body("bankName").isString().trim(),
  body("accountNumber").isString().trim(),
  body("routingNumber").isString().trim(),
];

export const isUserValidator = [
  check("firstName").optional({ checkFalsy: true }).isString().trim(),
  check("lastName").optional({ checkFalsy: true }).isString().trim(),
  check("username").optional({ checkFalsy: true }).isString().trim(),
  check("password").optional({ checkFalsy: true }).isString().trim(),
  check("email").optional({ checkFalsy: true }).isString().trim(),
  check("phoneNumber").optional({ checkFalsy: true }).isString().trim(),
  check("balance").optional({ checkFalsy: true }).isNumeric().trim(),
  check("avatar").optional({ checkFalsy: true }).isURL().trim(),
  check("defaultPrivacyLevel")
    .optional({ checkFalsy: true })
    .isIn(["public", "private", "contacts"]),
];
