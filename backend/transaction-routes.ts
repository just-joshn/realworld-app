import { required } from "./required";
import "./types";

import express from "express";
import { remove, isEmpty, slice, concat } from "lodash/fp";
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
    const transactions = getTransactionsForUserForApi(
      required(req.user, "authenticated user").id,
      req.query
    );

    const { totalPages, data: paginatedItems } = getPaginatedItems(
      req.query.page as unknown as number,
      req.query.limit as unknown as number,
      transactions
    );

    res.status(200);
    res.json({
      pageData: {
        page: res.locals.paginate.page,
        limit: res.locals.paginate.limit,
        hasNextPages: res.locals.paginate.hasNextPages(totalPages),
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
    const transactions = getTransactionsForUserContacts(
      required(req.user, "authenticated user").id,
      req.query
    );

    const { totalPages, data: paginatedItems } = getPaginatedItems(
      req.query.page as unknown as number,
      req.query.limit as unknown as number,
      transactions
    );

    res.status(200);
    res.json({
      pageData: {
        page: res.locals.paginate.page,
        limit: res.locals.paginate.limit,
        hasNextPages: res.locals.paginate.hasNextPages(totalPages),
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
    const isFirstPage = (req.query.page as unknown as number) === 1;

    const transactions = !isEmpty(req.query)
      ? getPublicTransactionsByQuery(required(req.user, "authenticated user").id, req.query)
      : getPublicTransactionsDefaultSort(required(req.user, "authenticated user").id);

    const { contactsTransactions, publicTransactions } = transactions;

    let publicTransactionsWithContacts;

    if (isFirstPage) {
      const firstFiveContacts = slice(0, 5, contactsTransactions);

      publicTransactionsWithContacts = concat(firstFiveContacts, publicTransactions);
    }

    const { totalPages, data: paginatedItems } = getPaginatedItems(
      req.query.page as unknown as number,
      req.query.limit as unknown as number,
      isFirstPage ? publicTransactionsWithContacts : publicTransactions
    );

    res.status(200);
    res.json({
      pageData: {
        page: res.locals.paginate.page,
        limit: res.locals.paginate.limit,
        hasNextPages: res.locals.paginate.hasNextPages(totalPages),
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
    const transactionPayload = req.body;
    const transactionType = transactionPayload.transactionType;

    remove("transactionType", transactionPayload);

    const transaction = createTransaction(
      required(req.user, "authenticated user").id,
      transactionType,
      transactionPayload
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
    const { transactionId } = req.params;

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
    const { transactionId } = req.params;

    updateTransactionById(transactionId, req.body);

    res.sendStatus(204);
  }
);

export default router;
