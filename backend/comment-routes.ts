import { stringField } from "./request-data";
import { required } from "./required";
import "./types";

import express from "express";
import { getCommentsByTransactionId, createComments } from "./database";
import { ensureAuthenticated, validateMiddleware } from "./helpers";
import { shortIdValidation, isCommentValidator } from "./validators";
const router = express.Router();

router.get(
  "/:transactionId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("transactionId")]),
  (req, res) => {
    const transactionId = stringField(req.params, "transactionId");
    const comments = getCommentsByTransactionId(transactionId);

    res.status(200);
    res.json({ comments });
  }
);

router.post(
  "/:transactionId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("transactionId"), isCommentValidator]),
  (req, res) => {
    const transactionId = stringField(req.params, "transactionId");
    const content = stringField(req.body, "content");

    createComments(required(req.user, "authenticated user").id, transactionId, content);

    res.sendStatus(200);
  }
);

export default router;
