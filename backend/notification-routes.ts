import { stringField, notificationsBody, notificationPatch } from "./request-data";
import { required } from "./required";
import "./types";

import express from "express";
import {
  createNotifications,
  updateNotificationById,
  getUnreadNotificationsByUserId,
} from "./database";
import { ensureAuthenticated, validateMiddleware } from "./helpers";
import {
  isNotificationsBodyValidator,
  shortIdValidation,
  isNotificationPatchValidator,
} from "./validators";
const router = express.Router();

router.get("/", ensureAuthenticated, (req, res) => {
  const notifications = getUnreadNotificationsByUserId(required(req.user, "authenticated user").id);

  res.status(200);
  res.json({ results: notifications });
});

router.post(
  "/bulk",
  ensureAuthenticated,
  validateMiddleware([...isNotificationsBodyValidator]),
  (req, res) => {
    const { items } = notificationsBody.validateSync(req.body);
    const notifications = createNotifications(required(req.user, "authenticated user").id, items);

    res.status(200);
    res.json({ results: notifications });
  }
);

router.patch(
  "/:notificationId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("notificationId"), ...isNotificationPatchValidator]),
  (req, res) => {
    const notificationId = stringField(req.params, "notificationId");
    updateNotificationById(
      required(req.user, "authenticated user").id,
      notificationId,
      notificationPatch.validateSync(req.body)
    );

    res.sendStatus(204);
  }
);

export default router;
