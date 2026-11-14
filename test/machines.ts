import { onTestFinished } from "vitest";
import { AnyStateMachine, interpret } from "xstate";

export function startService<TMachine extends AnyStateMachine>(machine: TMachine) {
  const service = interpret(machine).start();
  onTestFinished(() => {
    service.stop();
  });
  return service;
}
