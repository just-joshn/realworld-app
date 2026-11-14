import bcrypt from "bcryptjs";
import passport from "passport";
import express, { Request, Response } from "express";
import { User } from "../src/models/user";
import { getUserBy, getUserById } from "./database";

import { Strategy as LocalStrategy } from "passport-local";
const router = express.Router();

passport.use(
  new LocalStrategy(function (username: string, password: string, done) {
    const user = getUserBy("username", username);

    const failureMessage = "Incorrect username or password.";
    if (!user) {
      return done(null, false, { message: failureMessage });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return done(null, false, { message: failureMessage });
    }

    return done(null, user);
  })
);

passport.serializeUser(function (user: User, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id: string, done) {
  const user = getUserById(id);
  done(null, user);
});

router.post("/login", passport.authenticate("local"), (req: Request, res: Response): void => {
  if (req.body.remember) {
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000 * 30;
  } else {
    req.session.cookie.expires = undefined;
  }

  res.send({ user: req.user });
});

router.post("/logout", (req: Request, res: Response): void => {
  res.clearCookie("connect.sid");
  req.logout(() => res.redirect("/"));
  req.session.destroy(function () {
    res.redirect("/");
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
