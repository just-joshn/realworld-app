import { stringField } from "./request-data";
import { required } from "./required";
import "./types";

import express from "express";
import { getLikesByTransactionId, createLikes } from "./database";
import { ensureAuthenticated, validateMiddleware } from "./helpers";
import { shortIdValidation } from "./validators";
const router = express.Router();

router.get(
  "/:transactionId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("transactionId")]),
  (req, res) => {
    const transactionId = stringField(req.params, "transactionId");
    const likes = getLikesByTransactionId(transactionId);

    res.status(200);
    res.json({ likes });
  }
);

router.post(
  "/:transactionId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("transactionId")]),
  (req, res) => {
    const transactionId = stringField(req.params, "transactionId");
    createLikes(required(req.user, "authenticated user").id, transactionId);

    res.sendStatus(200);
  }
);

export default router;
