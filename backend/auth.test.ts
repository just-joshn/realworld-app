import bcrypt from "bcryptjs";
import passport from "passport";
import { describe, expect, test, vi } from "vitest";
import { buildUser } from "../test/factories";
import { resetDatabase } from "../test/database";
import { dispatch } from "../test/router";
import router from "./auth";

vi.mock(import("lowdb/adapters/FileSync"), async () => ({
  default: (await import("lowdb/adapters/Memory")).default,
}));

const thirtyDays = 30 * 24 * 60 * 60 * 1000;

function seedAda() {
  const user = buildUser({ id: "user1", username: "ada", password: bcrypt.hashSync("s3cret", 4) });
  resetDatabase({ users: [user] });
  return user;
}

function loginRequest() {
  return {
    session: { cookie: { maxAge: undefined as number | undefined, expires: new Date() } },
    logIn(this: { user?: unknown }, user: unknown, _options: unknown, done: () => void) {
      this.user = user;
      done();
    },
  };
}

describe("POST /login", () => {
  test("logs in with valid credentials for the browser session", async () => {
    const ada = seedAda();
    const request = loginRequest();

    const result = await dispatch(router, {
      method: "POST",
      url: "/login",
      body: { username: "ada", password: "s3cret" },
      request,
    });

    expect(result).toEqual({ status: 200, body: { user: ada } });
    expect(request.session.cookie.expires).toBeUndefined();
  });

  test("keeps the session for thirty days when asked to remember the user", async () => {
    seedAda();
    const request = loginRequest();

    await dispatch(router, {
      method: "POST",
      url: "/login",
      body: { username: "ada", password: "s3cret", remember: true },
      request,
    });

    expect(request.session.cookie.maxAge).toBe(thirtyDays);
  });

  test.for([
    { username: "nobody", password: "s3cret" },
    { username: "ada", password: "wrong" },
  ])("rejects $username with password $password", async (body) => {
    seedAda();

    const result = await dispatch(router, {
      method: "POST",
      url: "/login",
      body,
      request: loginRequest(),
    });

    expect(result).toEqual({ status: 401, body: "Unauthorized" });
  });
});

test("POST /logout ends the session and redirects home", async () => {
  const destroy = vi.fn();

  const result = await dispatch(router, {
    method: "POST",
    url: "/logout",
    request: {
      logout: (done: () => void) => done(),
      session: { destroy },
    },
  });

  expect(result).toEqual({ status: 302, redirect: "/" });
  expect(destroy).toHaveBeenCalledOnce();
});

describe("GET /checkAuth", () => {
  test("returns the session user", async () => {
    const result = await dispatch(router, {
      method: "GET",
      url: "/checkAuth",
      user: { id: "user1" },
    });

    expect(result).toEqual({ status: 200, body: { user: { id: "user1" } } });
  });

  test("responds 401 without a session user", async () => {
    const result = await dispatch(router, { method: "GET", url: "/checkAuth" });

    expect(result).toEqual({ status: 401, body: { error: "User is unauthorized" } });
  });
});

describe("session serialization", () => {
  test("stores only the user id in the session and loads the user back from it", () => {
    const ada = seedAda();
    const serialized = vi.fn();
    const deserialized = vi.fn();

    passport.serializeUser(ada, serialized);
    passport.deserializeUser("user1", deserialized);

    expect(serialized).toHaveBeenCalledWith(null, "user1");
    expect(deserialized).toHaveBeenCalledWith(null, ada);
  });
});
