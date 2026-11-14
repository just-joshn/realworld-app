import { check } from "express-validator";
import { describe, expect, test, vi } from "vitest";
import { asResponse, buildNext, buildRequest, buildResponse } from "../test/express";
import { checkAuth0Jwt, ensureAuthenticated, validateMiddleware, verifyOktaToken } from "./helpers";

const okta = vi.hoisted(() => ({ verifyAccessToken: vi.fn() }));

vi.mock(import("@okta/jwt-verifier"), async (importOriginal) => {
  const { default: OktaJwtVerifier } = await importOriginal();
  return {
    default: class extends OktaJwtVerifier {
      override verifyAccessToken = okta.verifyAccessToken;
    },
  };
});

describe("ensureAuthenticated", () => {
  test("copies the token subject to the user id for an authenticated request", () => {
    const req = buildRequest({ user: { sub: "auth0|123" } });
    const next = buildNext();

    ensureAuthenticated(req, asResponse(buildResponse()), next);

    expect(req.user).toMatchObject({ id: "auth0|123" });
    expect(next).toHaveBeenCalledOnce();
  });

  test("leaves a session user without a subject unchanged", () => {
    const req = buildRequest({ user: { id: "user1" } });
    const next = buildNext();

    ensureAuthenticated(req, asResponse(buildResponse()), next);

    expect(req.user).toEqual({ id: "user1" });
    expect(next).toHaveBeenCalledOnce();
  });

  test("responds 401 for an unauthenticated request", () => {
    const res = buildResponse();
    const next = buildNext();

    ensureAuthenticated(buildRequest({ isAuthenticated: () => false }), asResponse(res), next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("validateMiddleware", () => {
  const middleware = validateMiddleware([check("username").exists()]);

  test("calls next when every validation passes", async () => {
    const next = buildNext();

    middleware(buildRequest({ body: { username: "ada" } }), asResponse(buildResponse()), next);

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledOnce();
    });
  });

  test("responds 422 with the validation errors when a validation fails", async () => {
    const res = buildResponse();
    const next = buildNext();

    middleware(buildRequest(), asResponse(res), next);

    await vi.waitFor(() => {
      expect(res.status).toHaveBeenCalledWith(422);
    });
    expect(res.json).toHaveBeenCalledWith({
      errors: [expect.objectContaining({ param: "username" })],
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("verifyOktaToken", () => {
  test("responds 401 without an Authorization header", () => {
    const res = buildResponse();

    verifyOktaToken(buildRequest(), asResponse(res), buildNext());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  test("sets the user subject from a verified token", async () => {
    okta.verifyAccessToken.mockResolvedValue({ sub: "okta-user" });
    const req = buildRequest({ headers: { authorization: "Bearer good-token" } });
    const next = buildNext();

    verifyOktaToken(req, asResponse(buildResponse()), next);

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledOnce();
    });
    expect(okta.verifyAccessToken).toHaveBeenCalledWith("good-token", "api://default");
    expect(req.user).toEqual({ sub: "okta-user" });
  });

  test("sets an undefined subject when the verified token has none", async () => {
    okta.verifyAccessToken.mockResolvedValue({});
    const req = buildRequest({ headers: { authorization: "Bearer good-token" } });
    const next = buildNext();

    verifyOktaToken(req, asResponse(buildResponse()), next);

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledOnce();
    });
    expect(req.user).toEqual({ sub: undefined });
  });

  test("logs and does not continue when verification fails", async () => {
    const error = new Error("expired");
    okta.verifyAccessToken.mockRejectedValue(error);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const next = buildNext();

    verifyOktaToken(
      buildRequest({ headers: { authorization: "Bearer bad-token" } }),
      asResponse(buildResponse()),
      next
    );

    await vi.waitFor(() => {
      expect(log).toHaveBeenCalledWith("error", error);
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("checkAuth0Jwt", () => {
  test("skips token verification for test data routes", () => {
    const next = buildNext();

    checkAuth0Jwt(
      buildRequest({ method: "POST", url: "/testData/seed", originalUrl: "/testData/seed" }),
      asResponse(buildResponse()),
      next
    );

    expect(next).toHaveBeenCalledExactlyOnceWith();
  });

  test("rejects a request that carries no token", () => {
    const next = buildNext();

    checkAuth0Jwt(
      buildRequest({ method: "GET", url: "/users", originalUrl: "/users" }),
      asResponse(buildResponse()),
      next
    );

    expect(next).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: "UnauthorizedError" })
    );
  });
});
