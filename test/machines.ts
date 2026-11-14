import { onTestFinished } from "vitest";
import { interpret } from "xstate";
import type { EventObject, StateMachine, StateSchema } from "xstate";

export function startService<TContext, TSchema extends StateSchema, TEvent extends EventObject>(
  machine: StateMachine<TContext, TSchema, TEvent>
) {
  const service = interpret(machine).start();
  onTestFinished(() => {
    service.stop();
  });
  return service;
}
