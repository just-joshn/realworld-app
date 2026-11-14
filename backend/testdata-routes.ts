import "./types";

import express from "express";
import { getAllForEntity, seedDatabase } from "./database";
import { validateMiddleware } from "./helpers";
import { isValidEntityValidator } from "./validators";
import * as yup from "yup";
const entitySchema = yup
  .mixed<
    | "users"
    | "contacts"
    | "bankaccounts"
    | "notifications"
    | "transactions"
    | "likes"
    | "comments"
    | "banktransfers"
  >()
  .oneOf([
    "users",
    "contacts",
    "bankaccounts",
    "notifications",
    "transactions",
    "likes",
    "comments",
    "banktransfers",
  ])
  .defined();
const router = express.Router();

router.post("/seed", (_req, res) => {
  seedDatabase();
  res.sendStatus(200);
});

router.get("/:entity", validateMiddleware([...isValidEntityValidator]), (req, res) => {
  const { entity } = req.params;
  const results = getAllForEntity(entitySchema.validateSync(entity));

  res.status(200);
  res.json({ results });
});

export default router;
