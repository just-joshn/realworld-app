import { describe, expect, it } from "vitest";
import { isTransactionPayloadValidator } from "../../backend/validators";

describe("Validators", () => {
  it("should keep cents in a transaction amount", async () => {
    const req = {
      body: { transactionType: "payment", receiverId: "abc", description: "note", amount: "12.34" },
    };

    for (const validator of isTransactionPayloadValidator) {
      await validator.run(req);
    }

    expect(req.body.amount).toBe(12.34);
  });
});
