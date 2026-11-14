import { expect } from "vitest";

export const objectContaining: (value: Record<string, unknown>) => unknown =
  expect.objectContaining;
export const anyString: unknown = expect.any(String);
export const anyDate: unknown = expect.any(Date);
