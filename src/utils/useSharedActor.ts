import { useSelector } from "@xstate/react";
import type { AnyActorRef } from "xstate";

/** Subscribes to an actor that something else owns, like `useActor` did in @xstate/react 3. */
export function useSharedActor<TActor extends AnyActorRef>(actor: TActor) {
  const snapshot = useSelector(actor, (state) => state);
  return [snapshot, actor.send] as const;
}
