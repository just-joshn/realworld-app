import { stringField, bankAccountBody } from "./request-data";
import { required } from "./required";
import "./types";

import express from "express";

import {
  getBankAccountsByUserId,
  getBankAccountById,
  createBankAccountForUser,
  removeBankAccountById,
} from "./database";
import { ensureAuthenticated, validateMiddleware } from "./helpers";
import { shortIdValidation, isBankAccountValidator } from "./validators";
const router = express.Router();

router.get("/", ensureAuthenticated, (req, res) => {
  const accounts = getBankAccountsByUserId(required(req.user, "authenticated user").id);

  res.status(200);
  res.json({ results: accounts });
});

router.get(
  "/:bankAccountId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("bankAccountId")]),
  (req, res) => {
    const bankAccountId = stringField(req.params, "bankAccountId");

    const account = getBankAccountById(bankAccountId);

    res.status(200);
    res.json({ account });
  }
);

router.post("/", ensureAuthenticated, validateMiddleware(isBankAccountValidator), (req, res) => {
  const account = createBankAccountForUser(
    required(req.user, "authenticated user").id,
    bankAccountBody.validateSync(req.body)
  );

  res.status(200);
  res.json({ account });
});

router.delete(
  "/:bankAccountId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("bankAccountId")]),
  (req, res) => {
    const bankAccountId = stringField(req.params, "bankAccountId");

    removeBankAccountById(bankAccountId);
    const account = undefined;

    res.status(200);
    res.json({ account });
  }
);

export default router;
