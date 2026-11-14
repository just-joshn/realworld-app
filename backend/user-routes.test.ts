import { describe, expect, test, vi } from "vitest";
import { buildUser } from "../test/factories";
import { resetDatabase, seedPeople } from "../test/database";
import { dispatch } from "../test/router";
import { getUserById, getUserByUsername } from "./database";
import router from "./user-routes";

vi.mock(import("lowdb/adapters/FileSync"), async () => ({
  default: (await import("lowdb/adapters/Memory")).default,
}));

const resultIds = (body: unknown) =>
  (body as { results: { id: string }[] }).results.map((item) => item.id);

test("GET / lists every user except the current one", async () => {
  seedPeople();

  const { status, body } = await dispatch(router, {
    method: "GET",
    url: "/",
    user: { id: "user1" },
  });

  expect(status).toBe(200);
  expect(resultIds(body)).toEqual(["user2", "user3"]);
});

test("GET /search finds users matching q, excluding the current user", async () => {
  seedPeople();

  const { body } = await dispatch(router, {
    method: "GET",
    url: "/search",
    user: { id: "user1" },
    query: { q: "grace" },
  });

  expect(resultIds(body)[0]).toBe("user2");
  expect(resultIds(body)).not.toContain("user1");
});

test("POST / creates a user", async () => {
  resetDatabase();

  const { status, body } = await dispatch(router, {
    method: "POST",
    url: "/",
    body: { firstName: "Edsger", lastName: "Dijkstra", username: "edsger", password: "s3cret" },
  });

  expect(status).toBe(201);
  expect(body).toEqual({ user: expect.objectContaining({ username: "edsger" }) });
  expect(getUserByUsername("edsger")).toMatchObject({ firstName: "Edsger" });
});

describe("GET /:userId", () => {
  test("returns the current user's own record", async () => {
    resetDatabase({ users: [buildUser({ id: "t45AiwidW" })] });

    const { body } = await dispatch(router, {
      method: "GET",
      url: "/t45AiwidW",
      user: { id: "t45AiwidW" },
    });

    expect(body).toEqual({ user: expect.objectContaining({ id: "t45AiwidW" }) });
  });

  test("refuses to return another user's record", async () => {
    resetDatabase({ users: [buildUser({ id: "t45AiwidW" })] });

    const result = await dispatch(router, {
      method: "GET",
      url: "/t45AiwidW",
      user: { id: "someoneElse" },
    });

    expect(result).toEqual({ status: 401, body: { error: "Unauthorized" } });
  });
});

test("GET /profile/:username returns only public profile fields", async () => {
  seedPeople();

  const { body } = await dispatch(router, { method: "GET", url: "/profile/grace" });

  expect(body).toEqual({
    user: { firstName: "Grace", lastName: "Hopper", avatar: "https://example.com/grace.png" },
  });
});

test("PATCH /:userId updates the user", async () => {
  resetDatabase({ users: [buildUser({ id: "t45AiwidW" })] });

  const result = await dispatch(router, {
    method: "PATCH",
    url: "/t45AiwidW",
    user: { id: "t45AiwidW" },
    body: { firstName: "Augusta" },
  });

  expect(result).toEqual({ status: 204 });
  expect(getUserById("t45AiwidW").firstName).toBe("Augusta");
});
