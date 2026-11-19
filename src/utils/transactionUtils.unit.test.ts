import { afterEach, describe, expect, test, vi } from "vitest";
import { TransactionRequestStatus } from "../models";
import {
  buildCommentNotification,
  buildLike,
  buildLikeNotification,
  buildPaymentNotification,
  buildTransaction,
  buildTransactionResponseItem,
  buildUser,
} from "../../test/factories";
import { PaymentNotificationStatus } from "../models";
import {
  amountRangeValueText,
  amountRangeValueTextLabel,
  currentUserLikesTransaction,
  formatAmount,
  formatAmountRangeValues,
  formatAmountSlider,
  formatFullName,
  getChargeAmount,
  getFakeAmount,
  getPaginatedItems,
  getPayAppCreditedAmount,
  getQueryWithoutAmountFields,
  getQueryWithoutDateFields,
  getQueryWithoutFilterFields,
  getTransferAmount,
  hasAmountQueryFields,
  hasDateQueryFields,
  hasPaginationQueryFields,
  hasSufficientFunds,
  isAcceptedRequestTransaction,
  isCommentNotification,
  isLikeNotification,
  isPayment,
  isPaymentNotification,
  isPaymentReceivedNotification,
  isPaymentRequestedNotification,
  isPendingRequestTransaction,
  isRejectedRequestTransaction,
  isRequestTransaction,
  isoStringToLocalDateFull,
  isoStringToLocalMidnightEnd,
  isoStringToLocalMidnightStart,
  localDateToIsoString,
  localDateToUTCISOString,
  receiverIsCurrentUser,
} from "./transactionUtils";

describe("transaction type predicates", () => {
  test("a transaction without a requestStatus is a payment", () => {
    const payment = buildTransaction();

    expect(isRequestTransaction(payment)).toBe(false);
    expect(isPayment(payment)).toBe(true);
  });

  test.for([
    {
      requestStatus: TransactionRequestStatus.pending,
      pending: true,
      accepted: false,
      rejected: false,
    },
    {
      requestStatus: TransactionRequestStatus.accepted,
      pending: false,
      accepted: true,
      rejected: false,
    },
    {
      requestStatus: TransactionRequestStatus.rejected,
      pending: false,
      accepted: false,
      rejected: true,
    },
  ])("a $requestStatus request is classified by its status", (scenario) => {
    const request = buildTransaction({ requestStatus: scenario.requestStatus });

    expect(isRequestTransaction(request)).toBe(true);
    expect(isPayment(request)).toBe(false);
    expect(isPendingRequestTransaction(request)).toBe(scenario.pending);
    expect(isAcceptedRequestTransaction(request)).toBe(scenario.accepted);
    expect(isRejectedRequestTransaction(request)).toBe(scenario.rejected);
  });
});

describe("amount formatting", () => {
  test("formatAmount renders cents as USD with two decimals", () => {
    expect(formatAmount(123456)).toBe("$1,234.56");
  });

  test("formatAmountSlider renders cents as whole USD", () => {
    expect(formatAmountSlider(250000)).toBe("$2,500");
  });

  test("amountRangeValueText pads a slider value to cents and formats with decimals", () => {
    expect(amountRangeValueText(25)).toBe("$250.00");
  });

  test("amountRangeValueTextLabel pads a slider value to cents and formats as whole USD", () => {
    expect(amountRangeValueTextLabel(25)).toBe("$250");
  });

  test("formatAmountRangeValues joins the formatted min and max", () => {
    expect(formatAmountRangeValues([0, 100])).toBe("$0 - $1,000");
  });

  test("getFakeAmount returns an integer inside the requested range", () => {
    const amount = getFakeAmount(10, 20);

    expect(Number.isInteger(amount)).toBe(true);
    expect(amount).toBeGreaterThanOrEqual(10);
    expect(amount).toBeLessThanOrEqual(20);
  });

  test("getFakeAmount defaults to the 1000-50000 range", () => {
    const amount = getFakeAmount();

    expect(amount).toBeGreaterThanOrEqual(1000);
    expect(amount).toBeLessThanOrEqual(50000);
  });
});

describe("balance arithmetic", () => {
  test("getChargeAmount is the sender balance left after the transaction", () => {
    const sender = buildUser({ balance: 10000 });
    const transaction = buildTransaction({ amount: 2500 });

    expect(getChargeAmount(sender, transaction)).toBe(7500);
  });

  test("getTransferAmount is the shortfall when the balance does not cover the amount", () => {
    const sender = buildUser({ balance: 1000 });
    const transaction = buildTransaction({ amount: 2500 });

    expect(getTransferAmount(sender, transaction)).toBe(1500);
  });

  test("getPayAppCreditedAmount adds the amount to the receiver balance", () => {
    const receiver = buildUser({ balance: 1000 });
    const transaction = buildTransaction({ amount: 2500 });

    expect(getPayAppCreditedAmount(receiver, transaction)).toBe(3500);
  });

  test.for([
    { balance: 10000, amount: 2500, expected: true },
    { balance: 1000, amount: 2500, expected: false },
  ])("hasSufficientFunds($balance, $amount) -> $expected", ({ balance, amount, expected }) => {
    expect(hasSufficientFunds(buildUser({ balance }), buildTransaction({ amount }))).toBe(expected);
  });
});

describe("user helpers", () => {
  test("receiverIsCurrentUser matches the receiver id against the user id", () => {
    const transaction = buildTransaction({ receiverId: "user2" });

    expect(receiverIsCurrentUser(buildUser({ id: "user2" }), transaction)).toBe(true);
    expect(receiverIsCurrentUser(buildUser({ id: "user1" }), transaction)).toBe(false);
  });

  test("formatFullName joins first and last name", () => {
    expect(formatFullName(buildUser({ firstName: "Grace", lastName: "Hopper" }))).toBe(
      "Grace Hopper"
    );
  });

  test("currentUserLikesTransaction is true only when the user has a like on it", () => {
    const transaction = buildTransactionResponseItem({ likes: [buildLike({ userId: "user3" })] });

    expect(currentUserLikesTransaction(buildUser({ id: "user3" }), transaction)).toBe(true);
    expect(currentUserLikesTransaction(buildUser({ id: "user1" }), transaction)).toBe(false);
  });
});

describe("notification predicates", () => {
  test("a comment notification is identified by its commentId", () => {
    const notification = buildCommentNotification();

    expect(isCommentNotification(notification)).toBe(true);
    expect(isLikeNotification(notification)).toBe(false);
    expect(isPaymentNotification(notification)).toBe(false);
  });

  test("a like notification is identified by its likeId", () => {
    const notification = buildLikeNotification();

    expect(isLikeNotification(notification)).toBe(true);
    expect(isCommentNotification(notification)).toBe(false);
  });

  test("a requested payment notification is a payment request", () => {
    const notification = buildPaymentNotification({
      status: PaymentNotificationStatus.requested,
    });

    expect(isPaymentNotification(notification)).toBe(true);
    expect(isPaymentRequestedNotification(notification)).toBe(true);
    expect(isPaymentReceivedNotification(notification)).toBe(false);
  });

  test("a received payment notification is a payment receipt", () => {
    const notification = buildPaymentNotification({ status: PaymentNotificationStatus.received });

    expect(isPaymentReceivedNotification(notification)).toBe(true);
    expect(isPaymentRequestedNotification(notification)).toBe(false);
  });
});

const fullQuery = {
  dateRangeStart: "2026-01-01",
  dateRangeEnd: "2026-01-31",
  amountMin: 10,
  amountMax: 100,
  page: 2,
  limit: 10,
  status: undefined,
};

describe("query helpers", () => {
  test("detects complete date, amount, and pagination field pairs", () => {
    expect(hasDateQueryFields(fullQuery)).toBe(true);
    expect(hasAmountQueryFields(fullQuery)).toBe(true);
    expect(hasPaginationQueryFields(fullQuery)).toBe(true);
  });

  test("a half-specified range does not count as a range", () => {
    expect(hasDateQueryFields({ dateRangeStart: "2026-01-01" })).toBe(false);
    expect(hasAmountQueryFields({ amountMax: 100 })).toBe(false);
    expect(hasPaginationQueryFields({ amountMin: 1 })).toBe(false);
  });

  test("getQueryWithoutDateFields drops the date range when both ends are present", () => {
    expect(getQueryWithoutDateFields(fullQuery)).not.toHaveProperty("dateRangeStart");
    expect(getQueryWithoutDateFields(fullQuery)).toHaveProperty("amountMin", 10);
  });

  test("getQueryWithoutDateFields returns the query unchanged without a full date range", () => {
    const query = { dateRangeStart: "2026-01-01" };

    expect(getQueryWithoutDateFields(query)).toBe(query);
  });
});

describe("query helpers: amount and filter fields", () => {
  test("getQueryWithoutAmountFields drops the amount range when both ends are present", () => {
    expect(getQueryWithoutAmountFields(fullQuery)).not.toHaveProperty("amountMin");
    expect(getQueryWithoutAmountFields(fullQuery)).toHaveProperty("dateRangeStart");
  });

  test("getQueryWithoutAmountFields returns the query unchanged without a full amount range", () => {
    const query = { amountMin: 10 };

    expect(getQueryWithoutAmountFields(query)).toBe(query);
  });

  test("getQueryWithoutFilterFields keeps only non-filter fields", () => {
    expect(getQueryWithoutFilterFields({ ...fullQuery, status: undefined })).toEqual({
      status: undefined,
    });
  });
});

describe("getPaginatedItems", () => {
  test("returns the requested page and the total page count", () => {
    expect(getPaginatedItems(2, 2, ["a", "b", "c", "d", "e"])).toEqual({
      totalPages: 3,
      data: ["c", "d"],
    });
  });

  test("throws when no items are given", () => {
    expect(() => getPaginatedItems(1, 10, undefined)).toThrow("Paginated items are required");
  });
});

describe("date conversion", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("isoStringToLocalMidnightStart is local midnight on the UTC calendar day", () => {
    expect(isoStringToLocalMidnightStart("2026-03-15T18:30:00.000Z")).toEqual(
      new Date(2026, 2, 15, 0, 0, 0, 0)
    );
  });

  test("isoStringToLocalMidnightEnd is the last local millisecond of the UTC calendar day", () => {
    expect(isoStringToLocalMidnightEnd("2026-03-15T18:30:00.000Z")).toEqual(
      new Date(2026, 2, 15, 23, 59, 59, 999)
    );
  });

  test("isoStringToLocalDateFull keeps the UTC wall-clock time in local time", () => {
    expect(isoStringToLocalDateFull("2026-03-15T18:30:45.123Z")).toEqual(
      new Date(2026, 2, 15, 18, 30, 45, 123)
    );
  });

  test("localDateToIsoString reads the local wall-clock time as UTC", () => {
    expect(localDateToIsoString(new Date(2026, 2, 15, 18, 30, 45, 123))).toBe(
      "2026-03-15T18:30:45.123Z"
    );
  });

  test("localDateToUTCISOString reads the local wall-clock time as UTC", () => {
    expect(localDateToUTCISOString(new Date(2026, 2, 15, 18, 30, 45, 123))).toBe(
      "2026-03-15T18:30:45.123Z"
    );
  });

  test("localDateToUTCISOString falls back to now when no date is given", () => {
    vi.useFakeTimers({ now: new Date("2026-05-01T12:00:00.000Z") });

    expect(localDateToUTCISOString(null)).toBe("2026-05-01T12:00:00.000Z");
  });
});
