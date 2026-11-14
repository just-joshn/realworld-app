import { transactionBody, transactionPatch, transactionQuery, stringField } from "./request-data";
import { required } from "./required";
import "./types";

import express from "express";
import { isEmpty, slice, concat } from "lodash/fp";
import {
  getTransactionsForUserContacts,
  createTransaction,
  updateTransactionById,
  getPublicTransactionsDefaultSort,
  getTransactionByIdForApi,
  getTransactionsForUserForApi,
  getPublicTransactionsByQuery,
} from "./database";
import { ensureAuthenticated, validateMiddleware } from "./helpers";
import {
  sanitizeTransactionStatus,
  sanitizeRequestStatus,
  isTransactionQSValidator,
  isTransactionPayloadValidator,
  shortIdValidation,
  isTransactionPatchValidator,
  isTransactionPublicQSValidator,
} from "./validators";
import { getPaginatedItems } from "../src/utils/transactionUtils";
const router = express.Router();

router.get(
  "/",
  ensureAuthenticated,
  validateMiddleware([
    sanitizeTransactionStatus,
    sanitizeRequestStatus,
    ...isTransactionQSValidator,
  ]),
  (req, res) => {
    const query = transactionQuery.validateSync(req.query);
    const transactions = getTransactionsForUserForApi(
      required(req.user, "authenticated user").id,
      query
    );

    const { totalPages, data: paginatedItems } = getPaginatedItems(
      query.page,
      query.limit,
      transactions
    );

    res.status(200);
    res.json({
      pageData: {
        page: query.page,
        limit: query.limit,
        hasNextPages: query.page < totalPages,
        totalPages,
      },
      results: paginatedItems,
    });
  }
);

router.get(
  "/contacts",
  ensureAuthenticated,
  validateMiddleware([
    sanitizeTransactionStatus,
    sanitizeRequestStatus,
    ...isTransactionQSValidator,
  ]),
  (req, res) => {
    const query = transactionQuery.validateSync(req.query);
    const transactions = getTransactionsForUserContacts(
      required(req.user, "authenticated user").id,
      query
    );

    const { totalPages, data: paginatedItems } = getPaginatedItems(
      query.page,
      query.limit,
      transactions
    );

    res.status(200);
    res.json({
      pageData: {
        page: query.page,
        limit: query.limit,
        hasNextPages: query.page < totalPages,
        totalPages,
      },
      results: paginatedItems,
    });
  }
);

router.get(
  "/public",
  ensureAuthenticated,
  validateMiddleware(isTransactionPublicQSValidator),
  (req, res) => {
    const query = transactionQuery.validateSync(req.query);
    const isFirstPage = query.page === 1 && "page" in req.query;

    const transactions = !isEmpty(req.query)
      ? getPublicTransactionsByQuery(required(req.user, "authenticated user").id, {
          ...(query.status === undefined ? {} : { status: query.status }),
          ...(query.dateRangeStart === undefined ? {} : { dateRangeStart: query.dateRangeStart }),
          ...(query.dateRangeEnd === undefined ? {} : { dateRangeEnd: query.dateRangeEnd }),
          ...(query.amountMin === undefined ? {} : { amountMin: query.amountMin }),
          ...(query.amountMax === undefined ? {} : { amountMax: query.amountMax }),
        })
      : getPublicTransactionsDefaultSort(required(req.user, "authenticated user").id);

    const { contactsTransactions, publicTransactions } = transactions;

    let publicTransactionsWithContacts;

    if (isFirstPage) {
      const firstFiveContacts = slice(0, 5, contactsTransactions);

      publicTransactionsWithContacts = concat(firstFiveContacts, publicTransactions);
    }

    const { totalPages, data: paginatedItems } = getPaginatedItems(
      query.page,
      query.limit,
      isFirstPage ? publicTransactionsWithContacts : publicTransactions
    );

    res.status(200);
    res.json({
      pageData: {
        page: query.page,
        limit: query.limit,
        hasNextPages: query.page < totalPages,
        totalPages,
      },
      results: paginatedItems,
    });
  }
);

router.post(
  "/",
  ensureAuthenticated,
  validateMiddleware(isTransactionPayloadValidator),
  (req, res) => {
    const { transactionType, privacyLevel, ...transactionPayload } = transactionBody.validateSync(
      req.body
    );

    const transaction = createTransaction(
      required(req.user, "authenticated user").id,
      transactionType,
      { ...transactionPayload, ...(privacyLevel === undefined ? {} : { privacyLevel }) }
    );

    res.status(200);
    res.json({ transaction });
  }
);

router.get(
  "/:transactionId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("transactionId")]),
  (req, res) => {
    const transactionId = stringField(req.params, "transactionId");

    const transaction = getTransactionByIdForApi(transactionId);

    res.status(200);
    res.json({ transaction });
  }
);

router.patch(
  "/:transactionId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("transactionId"), ...isTransactionPatchValidator]),
  (req, res) => {
    const transactionId = stringField(req.params, "transactionId");

    updateTransactionById(transactionId, transactionPatch.validateSync(req.body));

    res.sendStatus(204);
  }
);

export default router;
