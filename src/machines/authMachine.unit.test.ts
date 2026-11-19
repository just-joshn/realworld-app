import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, onTestFinished, test, vi } from "vitest";
import { server } from "../../test/msw";
import { startService } from "../../test/machines";
import { buildUser } from "../../test/factories";
import { createMemoryStorage } from "../../test/memoryStorage";
import { history } from "../utils/historyUtils";
import { apiUrl } from "../utils/apiConfig";
import { authMachine } from "./authMachine";

// authMachine reads localStorage while it is imported.
await vi.hoisted(async () => {
  const { createMemoryStorage } = await import("../../test/memoryStorage");
  vi.stubGlobal("localStorage", createMemoryStorage());
});

vi.mock(import("../utils/historyUtils"), async () => {
  const { UNSAFE_createMemoryHistory } = await import("react-router");
  return { history: UNSAFE_createMemoryHistory({ v5Compat: true }) };
});

const api = apiUrl("");
const ada = buildUser({ id: "user1" });

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
  vi.stubGlobal("window", { location: { pathname: "/", assign: vi.fn() } });
  vi.stubEnv("VITE_AUTH_TOKEN_NAME", "authAccessToken");
  history.replace("/");
});

describe("LOGIN", () => {
  test("valid credentials authorize the user and go home", async () => {
    const credentials = vi.fn();
    server.use(
      http.post(`${api}/login`, async ({ request }) => {
        credentials(await request.json());
        return HttpResponse.json({ user: ada });
      })
    );
    history.replace("/signin");
    const service = startService(authMachine);

    service.send({ type: "LOGIN", username: "ada", password: "s3cret" });

    await expect.poll(() => service.getSnapshot().value).toBe("authorized");
    expect(service.getSnapshot().context).toEqual({ user: ada, message: undefined });
    expect(credentials).toHaveBeenCalledWith(
      expect.objectContaining({ username: "ada", password: "s3cret" })
    );
    expect(history.location.pathname).toBe("/");
  });

  test("rejected credentials stay unauthorized with an error message", async () => {
    server.use(http.post(`${api}/login`, () => new HttpResponse(null, { status: 401 })));
    const service = startService(authMachine);

    service.send({ type: "LOGIN" });

    await expect
      .poll(() => service.getSnapshot().context.message)
      .toBe("Username or password is invalid");
    expect(service.getSnapshot().value).toBe("unauthorized");
  });
});

describe("SIGNUP", () => {
  test("creates the account and sends the user to sign in", async () => {
    const payload = vi.fn();
    server.use(
      http.post(`${api}/users`, async ({ request }) => {
        payload(await request.json());
        return HttpResponse.json({ user: ada }, { status: 201 });
      })
    );
    const service = startService(authMachine);

    service.send({ type: "SIGNUP", username: "ada", password: "s3cret" });

    await expect.poll(() => history.location.pathname).toBe("/signin");
    expect(service.getSnapshot().value).toBe("unauthorized");
    expect(payload).toHaveBeenCalledWith({ username: "ada", password: "s3cret" });
  });

  test("a failed signup records the error message", async () => {
    server.use(http.post(`${api}/users`, () => new HttpResponse(null, { status: 422 })));
    const service = startService(authMachine);

    service.send({ type: "SIGNUP" });

    await expect.poll(() => service.getSnapshot().context.message).toMatch(/422/);
  });
});

async function authorizedService() {
  server.use(http.post(`${api}/login`, () => HttpResponse.json({ user: ada })));
  const service = startService(authMachine);
  service.send({ type: "LOGIN" });
  await expect.poll(() => service.getSnapshot().value).toBe("authorized");
  return service;
}

describe("when authorized: profile", () => {
  test("UPDATE saves the profile and reloads the user", async () => {
    const updated = vi.fn();
    server.use(
      http.patch(`${api}/users/:id`, async ({ request, params }) => {
        updated({ id: params["id"], body: await request.json() });
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${api}/checkAuth`, () =>
        HttpResponse.json({ user: { ...ada, firstName: "Augusta" } })
      )
    );
    const service = await authorizedService();

    service.send({ type: "UPDATE", id: "user1", firstName: "Augusta" });

    await expect.poll(() => service.getSnapshot().context.user?.firstName).toBe("Augusta");
    expect(service.getSnapshot().value).toBe("authorized");
    expect(updated).toHaveBeenCalledWith({
      id: "user1",
      body: { id: "user1", firstName: "Augusta" },
    });
  });

  test("a failed UPDATE signs the user out with the error message", async () => {
    server.use(http.patch(`${api}/users/:id`, () => new HttpResponse(null, { status: 500 })));
    const service = await authorizedService();

    service.send({ type: "UPDATE", id: "user1" });

    await expect.poll(() => service.getSnapshot().value).toBe("unauthorized");
    expect(service.getSnapshot().context.message).toMatch(/500/);
  });

  test("a failed REFRESH signs the user out", async () => {
    server.use(http.get(`${api}/checkAuth`, () => new HttpResponse(null, { status: 401 })));
    const service = await authorizedService();

    service.send({ type: "REFRESH" });

    await expect.poll(() => service.getSnapshot().value).toBe("unauthorized");
    expect(service.getSnapshot().context.user).toBeUndefined();
  });
});

describe("when authorized: logout", () => {
  test("LOGOUT ends the session and clears the saved auth state", async () => {
    const loggedOut = vi.fn();
    server.use(
      http.post(`${api}/logout`, () => {
        loggedOut();
        return new HttpResponse(null, { status: 200 });
      })
    );
    localStorage.setItem("authState", "{}");
    const service = await authorizedService();

    service.send({ type: "LOGOUT" });

    await expect.poll(() => service.getSnapshot().value).toBe("unauthorized");
    expect(loggedOut).toHaveBeenCalledOnce();
    expect(localStorage.getItem("authState")).toBeNull();
  });

  test("a failed LOGOUT still ends unauthorized with the error message", async () => {
    server.use(http.post(`${api}/logout`, () => new HttpResponse(null, { status: 500 })));
    const service = await authorizedService();

    service.send({ type: "LOGOUT" });

    await expect.poll(() => service.getSnapshot().context.message).toMatch(/500/);
    expect(service.getSnapshot().value).toBe("unauthorized");
  });
});

const providerEvents = {
  AUTH0: {
    type: "AUTH0",
    user: { sub: "auth0|1", email: "ada@example.com", nickname: "ada", picture: "pic.png" },
    token: "auth0-token",
  },
  OKTA: {
    type: "OKTA",
    user: {
      sub: "okta-1",
      email: "ada@example.com",
      given_name: "Ada",
      family_name: "Lovelace",
      preferred_username: "ada",
    },
    token: "okta-token",
  },
  GOOGLE: {
    type: "GOOGLE",
    user: {
      googleId: "google-1",
      email: "ada@example.com",
      givenName: "Ada",
      familyName: "Lovelace",
      imageUrl: "pic.png",
    },
    token: "google-token",
  },
  COGNITO: {
    type: "COGNITO",
    userSub: "cognito-1",
    email: "ada@example.com",
    accessTokenJwtString: "cognito-token",
  },
} as const;

describe("identity provider sign-in", () => {
  test("AUTH0 stores the token and maps the profile", async () => {
    const service = startService(authMachine);

    service.send(providerEvents.AUTH0);

    await expect.poll(() => service.getSnapshot().value).toBe("authorized");
    expect(service.getSnapshot().context.user).toEqual({
      id: "auth0|1",
      email: "ada@example.com",
      firstName: "ada",
      avatar: "pic.png",
    });
    expect(localStorage.getItem("authAccessToken")).toBe("auth0-token");
  });

  test("OKTA stores the token and maps the profile", async () => {
    const service = startService(authMachine);

    service.send(providerEvents.OKTA);

    await expect.poll(() => service.getSnapshot().value).toBe("authorized");
    expect(service.getSnapshot().context.user).toEqual({
      id: "okta-1",
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      username: "ada",
    });
    expect(localStorage.getItem("authAccessToken")).toBe("okta-token");
  });

  test("GOOGLE stores the token and maps the profile", async () => {
    const service = startService(authMachine);

    service.send(providerEvents.GOOGLE);

    await expect.poll(() => service.getSnapshot().value).toBe("authorized");
    expect(service.getSnapshot().context.user).toEqual({
      id: "google-1",
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      avatar: "pic.png",
    });
    expect(localStorage.getItem("authAccessToken")).toBe("google-token");
  });
});

describe("identity provider sign-in: cognito and logout", () => {
  test("COGNITO stores the access token", async () => {
    const service = startService(authMachine);

    service.send(providerEvents.COGNITO);

    await expect.poll(() => service.getSnapshot().value).toBe("authorized");
    expect(localStorage.getItem("authAccessToken")).toBe("cognito-token");
  });

  test("COGNITO maps the profile", async () => {
    const service = startService(authMachine);

    service.send(providerEvents.COGNITO);

    await expect.poll(() => service.getSnapshot().value).toBe("authorized");
    expect(service.getSnapshot().context.user).toEqual({
      id: "cognito-1",
      email: "ada@example.com",
    });
  });

  test("a provider sign-in fails without a configured token name", async () => {
    vi.stubEnv("VITE_AUTH_TOKEN_NAME", undefined);
    const service = startService(authMachine);

    service.send(providerEvents.AUTH0);

    await expect
      .poll(() => service.getSnapshot().context.message)
      .toBe("VITE_AUTH_TOKEN_NAME is required");
    expect(service.getSnapshot().value).toBe("unauthorized");
  });

  test.for(["AUTH0", "OKTA", "GOOGLE", "COGNITO"] as const)(
    "LOGOUT during %s sign-in logs out",
    async (provider) => {
      server.use(http.post(`${api}/logout`, () => new HttpResponse(null, { status: 200 })));
      const service = startService(authMachine);
      service.send(providerEvents[provider]);

      service.send({ type: "LOGOUT" });

      await expect.poll(() => service.getSnapshot().value).toBe("unauthorized");
    }
  );
});

test("reaching authorized on the sign-in page redirects home", async () => {
  const assign = vi.fn();
  vi.stubGlobal("window", { location: { pathname: "/signin", assign } });
  history.replace("/signin");
  const service = startService(authMachine);

  service.send(providerEvents.AUTH0);

  await expect.poll(() => assign).toHaveBeenCalledWith("/");
});

describe("authService", () => {
  test("persists each state change to localStorage", async () => {
    vi.resetModules();
    const { authService } = await import("./authMachine");
    onTestFinished(() => {
      authService.stop();
    });
    server.use(http.post(`${api}/login`, () => HttpResponse.json({ user: ada })));

    authService.send({ type: "LOGIN" });

    await expect
      .poll(() => {
        const stored: unknown = JSON.parse(localStorage.getItem("authState") ?? "{}");
        return typeof stored === "object" && stored !== null && "value" in stored
          ? stored.value
          : undefined;
      })
      .toBe("authorized");
  });

  test("resumes from the saved auth state", async () => {
    server.use(http.post(`${api}/login`, () => HttpResponse.json({ user: ada })));
    const previous = startService(authMachine);
    previous.send({ type: "LOGIN" });
    await expect.poll(() => previous.getSnapshot().value).toBe("authorized");
    localStorage.setItem("authState", JSON.stringify(previous.getSnapshot()));
    vi.resetModules();

    const { authService } = await import("./authMachine");
    onTestFinished(() => {
      authService.stop();
    });

    expect(authService.getSnapshot().value).toBe("authorized");
    expect(authService.getSnapshot().context.user).toEqual(ada);
  });
});
