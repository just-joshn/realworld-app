import { expect, test } from "vitest";
import { required } from "./required";

test("returns a present value unchanged", () => {
  expect(required(0, "count")).toBe(0);
});

test.for([undefined, null])("throws a named error for %s", (value) => {
  expect(() => required(value, "authenticated user")).toThrow("Missing authenticated user");
});
