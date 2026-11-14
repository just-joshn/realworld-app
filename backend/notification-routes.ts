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

// Routes

//GET /notifications/
router.get("/", ensureAuthenticated, (req, res) => {
  /* istanbul ignore next */
  const notifications = getUnreadNotificationsByUserId(required(req.user, "authenticated user").id);

  res.status(200);
  res.json({ results: notifications });
});

//POST /notifications/bulk
router.post(
  "/bulk",
  ensureAuthenticated,
  validateMiddleware([...isNotificationsBodyValidator]),
  (req, res) => {
    const { items } = req.body;
    /* istanbul ignore next */
    const notifications = createNotifications(required(req.user, "authenticated user").id, items);

    res.status(200);
    res.json({ results: notifications });
  }
);

//PATCH /notifications/:notificationId - scoped-user
router.patch(
  "/:notificationId",
  ensureAuthenticated,
  validateMiddleware([shortIdValidation("notificationId"), ...isNotificationPatchValidator]),
  (req, res) => {
    const { notificationId } = req.params;
    /* istanbul ignore next */
    updateNotificationById(required(req.user, "authenticated user").id, notificationId, req.body);

    res.sendStatus(204);
  }
);

export default router;
