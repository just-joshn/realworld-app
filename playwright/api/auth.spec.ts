import { test, expect } from "../fixtures/base";

test.describe("POST /login", { tag: ["@api", "@auth"] }, () => {
  test("signs a user in and starts a session cookie", async ({ request, createUser }) => {
    const user = await createUser();

    const response = await request.post("/login", {
      data: { username: user.username, password: user.password },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toEqual({
      user: expect.objectContaining({ id: user.id, username: user.username }),
    });
    const cookie = response.headersArray().find(({ name }) => name.toLowerCase() === "set-cookie");
    expect(cookie?.value).toMatch(/^connect\.sid=.+; Path=\/; HttpOnly$/);
  });

  test("keeps the session for 30 days when asked to remember the user", async ({
    request,
    createUser,
  }) => {
    const user = await createUser();

    const response = await request.post("/login", {
      data: { username: user.username, password: user.password, remember: true },
    });

    expect(response.status()).toBe(200);
    const cookie = response.headersArray().find(({ name }) => name.toLowerCase() === "set-cookie");
    const expires = new Date(cookie?.value.match(/Expires=([^;]+)/)?.[1] ?? "").getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect(expires - Date.now()).toBeGreaterThan(thirtyDays - 60_000);
    expect(expires - Date.now()).toBeLessThanOrEqual(thirtyDays);
  });

  test("401 — wrong password", async ({ request, createUser }) => {
    const user = await createUser();

    const response = await request.post("/login", {
      data: { username: user.username, password: `${user.password}-wrong` },
    });

    expect(response.status()).toBe(401);
  });

  test("401 — unknown username", async ({ request, fake }) => {
    const response = await request.post("/login", {
      data: { username: `nobody-${fake.string.uuid()}`, password: "s3cret" },
    });

    expect(response.status()).toBe(401);
  });

  test("400 — missing credentials", async ({ request }) => {
    const response = await request.post("/login", { data: {} });

    expect(response.status()).toBe(400);
  });
});

test.describe("GET /checkAuth", { tag: ["@api", "@auth"] }, () => {
  test("returns the signed-in user", async ({ createUser, apiAs }) => {
    const user = await createUser();
    const api = await apiAs(user);

    const response = await api.get("/checkAuth");

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      user: expect.objectContaining({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      }),
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/checkAuth");

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "User is unauthorized" });
  });
});

test.describe("POST /logout", { tag: ["@api", "@auth"] }, () => {
  test("ends the session and redirects home", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.post("/logout", { maxRedirects: 0 });

    expect(response.status()).toBe(302);
    expect(response.headers()["location"]).toBe("/");
    expect((await api.get("/checkAuth")).status()).toBe(401);
  });
});
