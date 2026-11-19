import { expect, onTestFinished, test } from "vitest";
import { render } from "vitest-browser-react";
import { createActor } from "xstate";
import { Severities, snackbarMachine } from "../machines/snackbarMachine";
import AlertBar from "./AlertBar";

test("shows a notification supplied by the application", async () => {
  const service = createActor(snackbarMachine).start();
  onTestFinished(() => {
    service.stop();
  });
  const screen = await render(
    <>
      <button
        onClick={() => {
          service.send({ type: "SHOW", message: "Payment sent", severity: Severities.success });
        }}
      >
        Send payment
      </button>
      <AlertBar snackbarService={service} />
    </>
  );
  await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
  await screen.getByRole("button", { name: "Send payment" }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Payment sent");
});
