import { test, expect } from "../fixtures/base";
import { readJson } from "../helpers/schemas";
import { addContact } from "../helpers/api";

test.describe("POST /contacts", { tag: ["@api", "@contacts"] }, () => {
  test("adds a contact for the signed-in user", async ({ createUser, apiAs }) => {
    const me = await createUser();
    const friend = await createUser();
    const api = await apiAs(me);

    const response = await api.post("/contacts", { data: { contactUserId: friend.id } });

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toMatchObject({
      contact: {
        id: expect.any(String),
        uuid: expect.any(String),
        userId: me.id,
        contactUserId: friend.id,
        createdAt: expect.any(String),
        modifiedAt: expect.any(String),
      },
    });
  });

  test("422 — malformed contact user id", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.post("/contacts", { data: { contactUserId: "not*a*short*id" } });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: [expect.objectContaining({ param: "contactUserId" })],
    });
  });

  test("401 — no session", async ({ request, createUser }) => {
    const friend = await createUser();

    const response = await request.post("/contacts", { data: { contactUserId: friend.id } });

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /contacts/:username", { tag: ["@api", "@contacts"] }, () => {
  test("lists a user's contacts without signing in", async ({ request, createUser, apiAs }) => {
    const me = await createUser();
    const friend = await createUser();
    const contact = await addContact(await apiAs(me), friend.id);

    const response = await request.get(`/contacts/${me.username}`);

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      contacts: [
        expect.objectContaining({ id: contact.id, userId: me.id, contactUserId: friend.id }),
      ],
    });
  });

  test("lists nothing for a user without contacts", async ({ request, createUser }) => {
    const loner = await createUser();

    const response = await request.get(`/contacts/${loner.username}`);

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({ contacts: [] });
  });
});

test.describe("DELETE /contacts/:contactId", { tag: ["@api", "@contacts"] }, () => {
  test("removes the contact", async ({ request, createUser, apiAs }) => {
    const me = await createUser();
    const friend = await createUser();
    const api = await apiAs(me);
    const contact = await addContact(api, friend.id);

    const response = await api.delete(`/contacts/${contact.id}`);

    expect(response.status()).toBe(200);
    const remaining = await request.get(`/contacts/${me.username}`);
    expect(await readJson(remaining)).toEqual({ contacts: [] });
  });

  test("422 — malformed contact id", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.delete("/contacts/not*a*short*id");

    expect(response.status()).toBe(422);
  });

  test("401 — no session", async ({ request, createUser, apiAs }) => {
    const me = await createUser();
    const contact = await addContact(await apiAs(me), (await createUser()).id);

    const response = await request.delete(`/contacts/${contact.id}`);

    expect(response.status()).toBe(401);
  });
});
