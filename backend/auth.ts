import bcrypt from "bcryptjs";
import passport from "passport";
import * as yup from "yup";
import type { NextFunction, RequestHandler, Request, Response } from "express";
import express from "express";
import type { User } from "../src/models/user";
import { getAllUsers, getUserById } from "./database";

import { Strategy as LocalStrategy } from "passport-local";
const router = express.Router();

passport.use(
  new LocalStrategy(function (username: string, password: string, done) {
    const user = getAllUsers().find((candidate) => candidate.username === username);

    const failureMessage = "Incorrect username or password.";
    if (!user) {
      done(null, false, { message: failureMessage });
      return;
    }

    if (!bcrypt.compareSync(password, user.password)) {
      done(null, false, { message: failureMessage });
      return;
    }

    done(null, user);
  })
);

passport.serializeUser(function (user: User, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id: string, done) {
  const user = getUserById(id);
  done(null, user);
});

const typedPassport: passport.Authenticator<RequestHandler, RequestHandler> = passport;
const authenticate = typedPassport.authenticate("local");
router.post("/login", authenticate, (req: Request, res: Response): void => {
  if (yup.object({ remember: yup.boolean().default(false) }).validateSync(req.body).remember) {
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000 * 30;
  } else {
    req.session.cookie.maxAge = undefined;
  }

  res.send({ user: req.user });
});

router.post("/logout", (req: Request, res: Response, next: NextFunction): void => {
  // passport 0.7 regenerates the session during logout, so destroy it only after that finishes.
  req.logout((error) => {
    if (error) {
      next(error);
      return;
    }
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });
});

router.get("/checkAuth", (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "User is unauthorized" });
  } else {
    res.status(200).json({ user: req.user });
  }
});

export default router;
