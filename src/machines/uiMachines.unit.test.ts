import { afterEach, describe, expect, test, vi } from "vitest";
import { startService } from "../../test/machines";
import { drawerMachine } from "./drawerMachine";
import { Severities, snackbarMachine } from "./snackbarMachine";
import { transactionFiltersMachine } from "./transactionFiltersMachine";
import { userOnboardingMachine } from "./userOnboardingMachine";

describe("snackbarMachine", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("SHOW displays the given message and severity", () => {
    const service = startService(snackbarMachine);

    service.send({ type: "SHOW", severity: Severities.success, message: "Saved" });

    expect(service.getSnapshot().value).toBe("visible");
    expect(service.getSnapshot().context).toEqual({ severity: "success", message: "Saved" });
  });

  test("HIDE clears the message", () => {
    const service = startService(snackbarMachine);
    service.send({ type: "SHOW", severity: Severities.error, message: "Failed" });

    service.send({ type: "HIDE" });

    expect(service.getSnapshot().value).toBe("invisible");
    expect(service.getSnapshot().context).toEqual({ severity: undefined, message: undefined });
  });

  test("hides itself after three seconds", () => {
    vi.useFakeTimers();
    const service = startService(snackbarMachine);
    service.send({ type: "SHOW", severity: Severities.info, message: "Hello" });

    vi.advanceTimersByTime(2999);
    expect(service.getSnapshot().value).toBe("visible");

    vi.advanceTimersByTime(1);
    expect(service.getSnapshot().value).toBe("invisible");
  });
});

describe("drawerMachine", () => {
  test("starts with the desktop drawer open and the mobile drawer closed", () => {
    const service = startService(drawerMachine);

    expect(service.getSnapshot().value).toEqual({ desktop: "open", mobile: "closed" });
  });

  test("toggles and closes the desktop drawer", () => {
    const service = startService(drawerMachine);

    service.send({ type: "TOGGLE_DESKTOP" });
    expect(service.getSnapshot().value).toMatchObject({ desktop: "closed" });

    service.send({ type: "TOGGLE_DESKTOP" });
    service.send({ type: "CLOSE_DESKTOP" });
    expect(service.getSnapshot().value).toMatchObject({ desktop: "closed" });
  });

  test("OPEN_DESKTOP leaves a drawer the user closed closed when the breakpoint is unchanged", () => {
    const service = startService(drawerMachine);
    service.send({ type: "TOGGLE_DESKTOP" });

    service.send({ type: "OPEN_DESKTOP", aboveSmallBreakpoint: true });

    expect(service.getSnapshot().value).toMatchObject({ desktop: "closed" });
  });

  test("toggles, opens, and closes the mobile drawer", () => {
    const service = startService(drawerMachine);

    service.send({ type: "TOGGLE_MOBILE" });
    expect(service.getSnapshot().value).toMatchObject({ mobile: "open" });

    service.send({ type: "CLOSE_MOBILE" });
    expect(service.getSnapshot().value).toMatchObject({ mobile: "closed" });

    service.send({ type: "OPEN_MOBILE" });
    service.send({ type: "TOGGLE_MOBILE" });
    expect(service.getSnapshot().value).toMatchObject({ mobile: "closed" });
  });
});

describe("userOnboardingMachine", () => {
  test("NEXT walks through every step to done", () => {
    const service = startService(userOnboardingMachine);
    const visited = [service.getSnapshot().value];

    for (let step = 0; step < 3; step++) {
      service.send({ type: "NEXT" });
      visited.push(service.getSnapshot().value);
    }

    expect(visited).toEqual(["stepOne", "stepTwo", "stepThree", "done"]);
    expect(service.getSnapshot().status).toBe("done");
  });

  test("PREV goes back a step", () => {
    const service = startService(userOnboardingMachine);
    service.send({ type: "NEXT" });
    service.send({ type: "NEXT" });

    service.send({ type: "PREV" });
    expect(service.getSnapshot().value).toBe("stepTwo");

    service.send({ type: "PREV" });
    expect(service.getSnapshot().value).toBe("stepOne");
  });
});

describe("transactionFiltersMachine", () => {
  test("DATE_FILTER stores the range and DATE_RESET clears it", () => {
    const service = startService(transactionFiltersMachine);

    service.send({
      type: "DATE_FILTER",
      dateRangeStart: "2026-01-01T00:00:00.000Z",
      dateRangeEnd: "2026-01-31T23:59:59.999Z",
    });
    expect(service.getSnapshot().value).toMatchObject({ dateRange: "filter" });
    expect(service.getSnapshot().context).toMatchObject({
      dateRangeStart: "2026-01-01T00:00:00.000Z",
      dateRangeEnd: "2026-01-31T23:59:59.999Z",
    });

    service.send({ type: "DATE_RESET" });
    expect(service.getSnapshot().value).toMatchObject({ dateRange: "none" });
    expect(service.getSnapshot().context.dateRangeStart).toBeUndefined();
  });

  test("AMOUNT_FILTER replaces the amount range and AMOUNT_RESET clears it", () => {
    const service = startService(transactionFiltersMachine);

    service.send({ type: "AMOUNT_FILTER", amountMin: "0", amountMax: "100" });
    service.send({ type: "AMOUNT_FILTER", amountMin: "10", amountMax: "50" });
    expect(service.getSnapshot().context).toMatchObject({ amountMin: "10", amountMax: "50" });

    service.send({ type: "AMOUNT_RESET" });
    expect(service.getSnapshot().value).toMatchObject({ amountRange: "none" });
    expect(service.getSnapshot().context.amountMax).toBeUndefined();
  });
});
