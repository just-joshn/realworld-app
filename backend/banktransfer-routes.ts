import { required } from "./required";
import "./types";

import express from "express";

import { getBankTransfersByUserId } from "./database";
import { ensureAuthenticated } from "./helpers";
const router = express.Router();

router.get("/", ensureAuthenticated, (req, res) => {
  const transfers = getBankTransfersByUserId(required(req.user, "authenticated user").id);

  res.status(200);
  res.json({ transfers });
});

export default router;
