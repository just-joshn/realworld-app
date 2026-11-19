import { objectContaining } from "./test-matchers";
import * as yup from "yup";
import { describe, expect, test } from "vitest";
import { buildUser } from "../test/factories";
import { resetDatabase, seedPeople } from "../test/database";
import { dispatch } from "../test/router";
import { getUserById, getUserByUsername } from "./database";
import router from "./user-routes";
import { required } from "./required";

const resultIds = (body: unknown) =>
  yup
    .object({ results: yup.array(yup.object({ id: yup.string().defined() })).defined() })
    .validateSync(body)
    .results.map((item) => item.id);

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
  expect(body).toEqual({ user: objectContaining({ username: "edsger" }) });
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

    expect(body).toEqual({ user: objectContaining({ id: "t45AiwidW" }) });
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
  expect(required(getUserById("t45AiwidW"), "t45AiwidW").firstName).toBe("Augusta");
});

test("PATCH /:userId retains a zero balance instead of omitting the edit", async () => {
  resetDatabase({ users: [buildUser({ id: "t45AiwidW", balance: 1000 })] });

  const result = await dispatch(router, {
    method: "PATCH",
    url: "/t45AiwidW",
    user: { id: "t45AiwidW" },
    body: { balance: "0" },
  });

  expect(result.status).toBe(204);
  expect(required(getUserById("t45AiwidW"), "t45AiwidW").balance).toBe(0);
});

test("PATCH /:userId refuses to update another user", async () => {
  resetDatabase({ users: [buildUser({ id: "t45AiwidW", firstName: "Ada" })] });

  const result = await dispatch(router, {
    method: "PATCH",
    url: "/t45AiwidW",
    user: { id: "someoneElse" },
    body: { firstName: "Mallory" },
  });

  expect(result).toEqual({ status: 401, body: { error: "Unauthorized" } });
  expect(required(getUserById("t45AiwidW"), "t45AiwidW").firstName).toBe("Ada");
});
