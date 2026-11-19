import { test, expect } from "../fixtures/base";
import { readBody, readJson, rowsSchema, userSchema } from "../helpers/schemas";
import * as yup from "yup";
import { buildUser } from "../helpers/data";

test.describe("POST /users", { tag: ["@api", "@users"] }, () => {
  test("creates a user with a hashed password", async ({ request, fake }) => {
    const details = buildUser(fake, { balance: 2_500 });

    const response = await request.post("/users", { data: details });

    expect(response.status()).toBe(201);
    expect(response.headers()["content-type"]).toContain("application/json");
    const { user } = await readBody(response, yup.object({ user: userSchema.defined() }));
    expect(user).toMatchObject({
      id: expect.any(String),
      uuid: expect.any(String),
      firstName: details.firstName,
      lastName: details.lastName,
      username: details.username,
      email: details.email,
      phoneNumber: details.phoneNumber,
      balance: 2_500,
      createdAt: expect.any(String),
      modifiedAt: expect.any(String),
    });
    expect(user.password).not.toBe(details.password);
    expect(user.password).toMatch(/^\$2[aby]\$10\$/);
  });

  test("422 — no user fields", async ({ request }) => {
    const response = await request.post("/users", { data: { username: "only-a-username" } });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: expect.arrayContaining([expect.objectContaining({ msg: "Invalid value(s)" })]),
    });
  });

  test("422 — invalid avatar URL and privacy level", async ({ request, fake }) => {
    const response = await request.post("/users", {
      data: { ...buildUser(fake), avatar: "not a url", defaultPrivacyLevel: "everyone" },
    });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: expect.arrayContaining([
        expect.objectContaining({ path: "avatar" }),
        expect.objectContaining({ path: "defaultPrivacyLevel" }),
      ]),
    });
  });
});

test.describe("GET /users", { tag: ["@api", "@users"] }, () => {
  test("lists every user except the signed-in one", async ({ createUser, apiAs }) => {
    const me = await createUser();
    const other = await createUser();
    const api = await apiAs(me);

    const response = await api.get("/users");

    expect(response.status()).toBe(200);
    const ids = (await readBody(response, rowsSchema)).results.map(({ id }) => id);
    expect(ids).toContain(other.id);
    expect(ids).not.toContain(me.id);
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/users");

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});

test.describe("GET /users/search", { tag: ["@api", "@users"] }, () => {
  test("finds users by username and leaves out the signed-in user", async ({
    createUser,
    apiAs,
  }) => {
    const me = await createUser();
    const other = await createUser();
    const api = await apiAs(me);

    const found = await api.get("/users/search", { params: { q: other.username } });
    const self = await api.get("/users/search", { params: { q: me.username } });

    // Search is fuzzy, so other users with similar names can match too.
    expect(found.status()).toBe(200);
    expect((await readBody(found, rowsSchema)).results).toContainEqual(
      expect.objectContaining({ id: other.id, username: other.username })
    );
    expect(self.status()).toBe(200);
    expect((await readBody(self, rowsSchema)).results).not.toContainEqual(
      expect.objectContaining({ id: me.id })
    );
  });

  test("422 — missing query", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.get("/users/search");

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({ errors: [expect.objectContaining({ path: "q" })] });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/users/search", { params: { q: "a" } });

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /users/:userId", { tag: ["@api", "@users"] }, () => {
  test("returns the signed-in user's own record", async ({ createUser, apiAs }) => {
    const me = await createUser();
    const api = await apiAs(me);

    const response = await api.get(`/users/${me.id}`);

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toMatchObject({ user: { id: me.id, username: me.username } });
  });

  test("401 — someone else's record", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());
    const other = await createUser();

    const response = await api.get(`/users/${other.id}`);

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  test("422 — malformed id", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.get("/users/not*a*short*id");

    expect(response.status()).toBe(422);
  });

  test("401 — no session", async ({ request, createUser }) => {
    const user = await createUser();

    const response = await request.get(`/users/${user.id}`);

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /users/profile/:username", { tag: ["@api", "@users"] }, () => {
  test("shows only the public profile, without signing in", async ({ request, createUser }) => {
    const user = await createUser();

    const response = await request.get(`/users/profile/${user.username}`);

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      user: { firstName: user.firstName, lastName: user.lastName, avatar: "" },
    });
  });
});

test.describe("PATCH /users/:userId", { tag: ["@api", "@users"] }, () => {
  test("updates the user's settings", async ({ createUser, apiAs, fake }) => {
    const me = await createUser();
    const api = await apiAs(me);
    const edits = {
      firstName: fake.person.firstName(),
      lastName: fake.person.lastName(),
      email: fake.internet.email(),
      phoneNumber: fake.helpers.replaceSymbols("###-###-####"),
      defaultPrivacyLevel: "private",
    };

    const response = await api.patch(`/users/${me.id}`, { data: edits });

    expect(response.status()).toBe(204);
    expect(await response.text()).toBe("");
    expect(await readJson(await api.get(`/users/${me.id}`))).toMatchObject({ user: edits });
  });

  test("422 — invalid privacy level", async ({ createUser, apiAs }) => {
    const me = await createUser();
    const api = await apiAs(me);

    const response = await api.patch(`/users/${me.id}`, {
      data: { defaultPrivacyLevel: "everyone" },
    });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: [expect.objectContaining({ path: "defaultPrivacyLevel" })],
    });
  });

  test("401 — someone else's settings", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());
    const victim = await createUser();

    const response = await api.patch(`/users/${victim.id}`, { data: { firstName: "Mallory" } });

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(await readJson(await api.get(`/users/profile/${victim.username}`))).toMatchObject({
      user: { firstName: victim.firstName },
    });
  });

  test("401 — no session", async ({ request, createUser }) => {
    const user = await createUser();

    const response = await request.patch(`/users/${user.id}`, { data: { firstName: "Mallory" } });

    expect(response.status()).toBe(401);
  });
});
