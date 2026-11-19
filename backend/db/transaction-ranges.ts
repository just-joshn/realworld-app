import { curry, filter, inRange } from "lodash/fp";
import { isWithinInterval } from "date-fns";
import type { Transaction } from "../../src/models";

export const transactionsWithinAmountRange = curry(
  (
    amountMin: number | string | undefined,
    amountMax: number | string | undefined,
    transactions: Transaction[]
  ) => {
    if (amountMin === undefined || amountMax === undefined) {
      return transactions;
    }

    return filter(
      (transaction: Transaction) =>
        inRange(Number(amountMin), Number(amountMax), transaction.amount),
      transactions
    );
  }
);

export const transactionsWithinDateRange = curry(
  (
    dateRangeStart: string | undefined,
    dateRangeEnd: string | undefined,
    transactions: Transaction[]
  ) => {
    if (dateRangeStart === undefined || dateRangeEnd === undefined) {
      return transactions;
    }

    return filter(
      (transaction: Transaction) =>
        isWithinInterval(new Date(transaction.createdAt), {
          start: new Date(dateRangeStart),
          end: new Date(dateRangeEnd),
        }),
      transactions
    );
  }
);
