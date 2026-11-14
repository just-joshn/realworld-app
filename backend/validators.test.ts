import type { Request } from "express";
import { validationResult } from "express-validator";
import { describe, expect, test } from "vitest";
import { buildRequest } from "../test/express";
import {
  isNotificationsBodyValidator,
  isTransactionPayloadValidator,
  isUserValidator,
  isValidEntityValidator,
  sanitizeRequestStatus,
  sanitizeTransactionStatus,
  searchValidation,
  shortIdValidation,
  userFieldsValidator,
} from "./validators";

type Runnable = { run: (req: Request) => Promise<unknown> };

async function validate(validations: Runnable[], request: Record<string, unknown>) {
  const req = buildRequest(request);
  for (const validation of validations) {
    await validation.run(req);
  }
  return { req, errors: validationResult(req).array() };
}

describe("shortIdValidation", () => {
  test("accepts a shortid", async () => {
    const { errors } = await validate([shortIdValidation("userId")], {
      params: { userId: "t45AiwidW" },
    });

    expect(errors).toEqual([]);
  });

  test("rejects a value that is not a shortid", async () => {
    const { errors } = await validate([shortIdValidation("userId")], {
      params: { userId: "not a short id!" },
    });

    expect(errors).toEqual([expect.objectContaining({ param: "userId" })]);
  });
});

test("searchValidation requires a q parameter", async () => {
  const missing = await validate([searchValidation], { query: {} });
  const present = await validate([searchValidation], { query: { q: "ada" } });

  expect(missing.errors).toHaveLength(1);
  expect(present.errors).toEqual([]);
});

test("userFieldsValidator passes when any one editable field is present", async () => {
  const empty = await validate([userFieldsValidator], { body: {} });
  const withName = await validate([userFieldsValidator], { body: { firstName: "Ada" } });

  expect(empty.errors).toHaveLength(1);
  expect(withName.errors).toEqual([]);
});

describe("isUserValidator", () => {
  test("accepts a complete valid user payload", async () => {
    const { errors } = await validate(isUserValidator, {
      body: {
        firstName: "Ada",
        balance: "100",
        avatar: "https://example.com/a.png",
        defaultPrivacyLevel: "private",
      },
    });

    expect(errors).toEqual([]);
  });

  test("rejects an unknown privacy level and a non-URL avatar", async () => {
    const { errors } = await validate(isUserValidator, {
      body: { avatar: "not-a-url", defaultPrivacyLevel: "everyone" },
    });

    expect(errors.map((error) => error.param)).toEqual(["avatar", "defaultPrivacyLevel"]);
  });
});

describe("status sanitizers", () => {
  test.for([
    { status: "complete", expected: "complete" },
    { status: "bogus", expected: undefined },
  ])("sanitizeTransactionStatus maps $status to $expected", async ({ status, expected }) => {
    const { req } = await validate([sanitizeTransactionStatus], { query: { status } });

    expect(req.query.status).toBe(expected);
  });

  test.for([
    { requestStatus: "accepted", expected: "accepted" },
    { requestStatus: "bogus", expected: undefined },
  ])(
    "sanitizeRequestStatus maps $requestStatus to $expected",
    async ({ requestStatus, expected }) => {
      const { req } = await validate([sanitizeRequestStatus], { query: { requestStatus } });

      expect(req.query.requestStatus).toBe(expected);
    }
  );
});

test("isTransactionPayloadValidator converts the amount to a number", async () => {
  const { req, errors } = await validate(isTransactionPayloadValidator, {
    body: {
      transactionType: "payment",
      receiverId: "user2",
      description: "Lunch",
      amount: "12.5",
    },
  });

  expect(errors).toEqual([]);
  expect(req.body.amount).toBe(12.5);
});

test("isNotificationsBodyValidator requires a known type and a shortid transaction", async () => {
  const valid = await validate(isNotificationsBodyValidator, {
    body: { items: [{ type: "like", transactionId: "t45AiwidW" }] },
  });
  const invalid = await validate(isNotificationsBodyValidator, {
    body: { items: [{ type: "poke", transactionId: "bad id!" }] },
  });

  expect(valid.errors).toEqual([]);
  expect(invalid.errors).toHaveLength(2);
});

test.for([
  { entity: "users", valid: true },
  { entity: "passwords", valid: false },
])("isValidEntityValidator: $entity valid=$valid", async ({ entity, valid }) => {
  const { errors } = await validate(isValidEntityValidator, { params: { entity } });

  expect(errors.length === 0).toBe(valid);
});
