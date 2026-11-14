import { required } from "./required";
import "./types";

import express from "express";
import { isEqual, pick } from "lodash/fp";

import {
  getAllUsers,
  createUser,
  updateUserById,
  getUserById,
  getUserByUsername,
  searchUsers,
  removeUserFromResults,
} from "./database";
import { User } from "../src/models/user";
import { ensureAuthenticated, validateMiddleware } from "./helpers";
import {
  shortIdValidation,
  searchValidation,
  userFieldsValidator,
  isUserValidator,
} from "./validators";
const router = express.Router();

router.get("/", ensureAuthenticated, (req, res) => {
  const users = removeUserFromResults(required(req.user, "authenticated user").id, getAllUsers());
  res.status(200).json({ results: users });
});

router.get("/search", ensureAuthenticated, validateMiddleware([searchValidation]), (req, res) => {
  const { q } = req.query;

  const users = removeUserFromResults(
    required(req.user, "authenticated user").id,
    searchUsers(q as string)
  );

  res.status(200).json({ results: users });
});

router.post("/", userFieldsValidator, validateMiddleware(isUserValidator), (req, res) => {
  const userDetails: User = req.body;

  const user = createUser(userDetails);

  res.status(201);
  res.json({ user: user });
});

router.get(
  "/:userId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("userId")]),
  (req, res) => {
    const { userId } = req.params;

    if (!isEqual(userId, required(req.user, "authenticated user").id)) {
      return res.status(401).send({
        error: "Unauthorized",
      });
    }

    const user = getUserById(userId);

    res.status(200);
    res.json({ user });
  }
);

router.get("/profile/:username", (req, res) => {
  const { username } = req.params;

  const user = pick(["firstName", "lastName", "avatar"], getUserByUsername(username));

  res.status(200);
  res.json({ user });
});

router.patch(
  "/:userId",
  ensureAuthenticated,
  userFieldsValidator,
  validateMiddleware([shortIdValidation("userId"), ...isUserValidator]),
  (req, res) => {
    const { userId } = req.params;

    if (!isEqual(userId, required(req.user, "authenticated user").id)) {
      return res.status(401).send({
        error: "Unauthorized",
      });
    }

    const edits: User = req.body;

    updateUserById(userId, edits);

    res.sendStatus(204);
  }
);

export default router;
