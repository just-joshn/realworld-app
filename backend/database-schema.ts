import type { DbSchema } from "../src/models/db-schema";
import { databaseSchema } from "./database-schema-entities";

export const parseDatabase = (input: unknown): DbSchema => {
  const parsed = databaseSchema.validateSync(input, { stripUnknown: true });
  return {
    ...parsed,
    transactions: parsed.transactions.map(
      ({ balanceAtCompletion, requestStatus, requestResolvedAt, ...item }) => ({
        ...item,
        ...(balanceAtCompletion === undefined ? {} : { balanceAtCompletion }),
        ...(requestStatus === undefined ? {} : { requestStatus }),
        ...(requestResolvedAt === undefined ? {} : { requestResolvedAt }),
      }),
    ),
  };
};
