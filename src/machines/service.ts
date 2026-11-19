import { fromPromise } from "xstate";
import type { EventObject } from "xstate";

export interface ServiceInput<TContext, TEvent extends EventObject> {
  context: TContext;
  event: TEvent;
}

/** Wraps `(context, event) => result` as a promise actor; machines pass both through `input`. */
export function service<TContext, TEvent extends EventObject, TOutput>(
  run: (context: TContext, event: TEvent) => Promise<TOutput>
) {
  return fromPromise<TOutput, ServiceInput<TContext, TEvent>>(async ({ input }) =>
    run(input.context, input.event)
  );
}

export function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

/** A phantom value for `setup({ types })`: xstate reads its type and ignores the value. */
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters
export const typed = <T>(): T =>
  // oxlint-disable-next-line typescript/consistent-type-assertions
  ({}) as T;
