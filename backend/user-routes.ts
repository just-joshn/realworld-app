import { stringField, userBody, userPatchBody } from "./request-data";
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
  const q = stringField(req.query, "q");

  const users = removeUserFromResults(required(req.user, "authenticated user").id, searchUsers(q));

  res.status(200).json({ results: users });
});

router.post("/", userFieldsValidator, validateMiddleware(isUserValidator), (req, res) => {
  const userDetails = userBody.validateSync(req.body);

  const user = createUser(userDetails);

  res.status(201);
  res.json({ user: user });
});

router.get(
  "/:userId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("userId")]),
  (req, res) => {
    const userId = stringField(req.params, "userId");

    if (!isEqual(userId, required(req.user, "authenticated user").id)) {
      res.status(401).send({
        error: "Unauthorized",
      });
      return;
    }

    const user = getUserById(userId);

    res.status(200);
    res.json({ user });
  }
);

router.get("/profile/:username", (req, res) => {
  const username = stringField(req.params, "username");

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
    const userId = stringField(req.params, "userId");

    if (!isEqual(userId, required(req.user, "authenticated user").id)) {
      res.status(401).send({
        error: "Unauthorized",
      });
      return;
    }

    const edits = userPatchBody.validateSync(req.body, { stripUnknown: true });

    updateUserById(userId, {
      ...(edits.firstName === undefined ? {} : { firstName: edits.firstName }),
      ...(edits.lastName === undefined ? {} : { lastName: edits.lastName }),
      ...(edits.username === undefined ? {} : { username: edits.username }),
      ...(edits.password === undefined ? {} : { password: edits.password }),
      ...(edits.balance === undefined ? {} : { balance: edits.balance }),
      ...(edits.email === undefined ? {} : { email: edits.email }),
      ...(edits.phoneNumber === undefined ? {} : { phoneNumber: edits.phoneNumber }),
      ...(edits.avatar === undefined ? {} : { avatar: edits.avatar }),
      ...(edits.defaultPrivacyLevel === undefined
        ? {}
        : { defaultPrivacyLevel: edits.defaultPrivacyLevel }),
    });

    res.sendStatus(204);
  }
);

export default router;
