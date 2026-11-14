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

    expect(service.state.value).toBe("visible");
    expect(service.state.context).toEqual({ severity: "success", message: "Saved" });
  });

  test("HIDE clears the message", () => {
    const service = startService(snackbarMachine);
    service.send({ type: "SHOW", severity: Severities.error, message: "Failed" });

    service.send({ type: "HIDE" });

    expect(service.state.value).toBe("invisible");
    expect(service.state.context).toEqual({ severity: undefined, message: undefined });
  });

  test("hides itself after three seconds", () => {
    vi.useFakeTimers();
    const service = startService(snackbarMachine);
    service.send({ type: "SHOW", severity: Severities.info, message: "Hello" });

    vi.advanceTimersByTime(2999);
    expect(service.state.value).toBe("visible");

    vi.advanceTimersByTime(1);
    expect(service.state.value).toBe("invisible");
  });
});

describe("drawerMachine", () => {
  test("starts with the desktop drawer open and the mobile drawer closed", () => {
    const service = startService(drawerMachine);

    expect(service.state.value).toEqual({ desktop: "open", mobile: "closed" });
  });

  test("toggles and closes the desktop drawer", () => {
    const service = startService(drawerMachine);

    service.send("TOGGLE_DESKTOP");
    expect(service.state.value).toMatchObject({ desktop: "closed" });

    service.send("TOGGLE_DESKTOP");
    service.send("CLOSE_DESKTOP");
    expect(service.state.value).toMatchObject({ desktop: "closed" });
  });

  test("OPEN_DESKTOP leaves a drawer the user closed closed when the breakpoint is unchanged", () => {
    const service = startService(drawerMachine);
    service.send("TOGGLE_DESKTOP");

    service.send({ type: "OPEN_DESKTOP", aboveSmallBreakpoint: true });

    expect(service.state.value).toMatchObject({ desktop: "closed" });
  });

  test("toggles, opens, and closes the mobile drawer", () => {
    const service = startService(drawerMachine);

    service.send("TOGGLE_MOBILE");
    expect(service.state.value).toMatchObject({ mobile: "open" });

    service.send("CLOSE_MOBILE");
    expect(service.state.value).toMatchObject({ mobile: "closed" });

    service.send("OPEN_MOBILE");
    service.send("TOGGLE_MOBILE");
    expect(service.state.value).toMatchObject({ mobile: "closed" });
  });
});

describe("userOnboardingMachine", () => {
  test("NEXT walks through every step to done", () => {
    const service = startService(userOnboardingMachine);
    const visited = [service.state.value];

    for (let step = 0; step < 3; step++) {
      service.send("NEXT");
      visited.push(service.state.value);
    }

    expect(visited).toEqual(["stepOne", "stepTwo", "stepThree", "done"]);
    expect(service.state.done).toBe(true);
  });

  test("PREV goes back a step", () => {
    const service = startService(userOnboardingMachine);
    service.send("NEXT");
    service.send("NEXT");

    service.send("PREV");
    expect(service.state.value).toBe("stepTwo");

    service.send("PREV");
    expect(service.state.value).toBe("stepOne");
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
    expect(service.state.value).toMatchObject({ dateRange: "filter" });
    expect(service.state.context).toMatchObject({
      dateRangeStart: "2026-01-01T00:00:00.000Z",
      dateRangeEnd: "2026-01-31T23:59:59.999Z",
    });

    service.send({ type: "DATE_RESET" });
    expect(service.state.value).toMatchObject({ dateRange: "none" });
    expect(service.state.context.dateRangeStart).toBeUndefined();
  });

  test("AMOUNT_FILTER replaces the amount range and AMOUNT_RESET clears it", () => {
    const service = startService(transactionFiltersMachine);

    service.send({ type: "AMOUNT_FILTER", amountMin: "0", amountMax: "100" });
    service.send({ type: "AMOUNT_FILTER", amountMin: "10", amountMax: "50" });
    expect(service.state.context).toMatchObject({ amountMin: "10", amountMax: "50" });

    service.send({ type: "AMOUNT_RESET" });
    expect(service.state.value).toMatchObject({ amountRange: "none" });
    expect(service.state.context.amountMax).toBeUndefined();
  });
});
