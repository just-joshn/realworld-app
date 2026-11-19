import type { ActorRefFrom } from "xstate";
import type { authMachine } from "../machines/authMachine";

type AuthService = Pick<ActorRefFrom<typeof authMachine>, "send" | "subscribe">;
type AuthEvent = Parameters<AuthService["send"]>[0];
type AuthStateName = "authorized" | "unauthorized";

// Sends the event and resolves once the auth machine reaches the named state.
export function sendUntilAuthState(
  service: AuthService,
  event: AuthEvent,
  stateName: AuthStateName
) {
  return new Promise<void>((resolve) => {
    const subscription = service.subscribe((state) => {
      if (state.matches(stateName)) {
        subscription.unsubscribe();
        resolve();
      }
    });
    service.send(event);
  });
}
