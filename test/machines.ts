import { onTestFinished } from "vitest";
import { createActor } from "xstate";
import type { AnyStateMachine } from "xstate";

export function startService<TMachine extends AnyStateMachine>(machine: TMachine) {
  const service = createActor(machine).start();
  onTestFinished(() => {
    service.stop();
  });
  return service;
}
