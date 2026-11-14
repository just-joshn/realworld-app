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

// Routes

//GET /bankAccounts (scoped-user)
router.get("/", ensureAuthenticated, (req, res) => {
  /* istanbul ignore next */
  const accounts = getBankAccountsByUserId(required(req.user, "authenticated user").id);

  res.status(200);
  res.json({ results: accounts });
});

//GET /bankAccounts/:bankAccountId (scoped-user)
router.get(
  "/:bankAccountId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("bankAccountId")]),
  (req, res) => {
    const { bankAccountId } = req.params;

    const account = getBankAccountById(bankAccountId);

    res.status(200);
    res.json({ account });
  }
);

//POST /bankAccounts (scoped-user)
router.post("/", ensureAuthenticated, validateMiddleware(isBankAccountValidator), (req, res) => {
  /* istanbul ignore next */
  const account = createBankAccountForUser(required(req.user, "authenticated user").id, req.body);

  res.status(200);
  res.json({ account });
});

//DELETE (soft) /bankAccounts (scoped-user)
router.delete(
  "/:bankAccountId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("bankAccountId")]),
  (req, res) => {
    const { bankAccountId } = req.params;

    const account = removeBankAccountById(bankAccountId);

    res.status(200);
    res.json({ account });
  }
);

export default router;
