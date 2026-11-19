import type { authService } from "../src/machines/authMachine";

type AuthService = typeof authService;

const isSignedOut = (service: AuthService) => service.getSnapshot().matches("unauthorized");

/** Sends LOGOUT and resolves once the shared auth service reports `unauthorized`. */
export async function signOutAuthService(service: AuthService) {
  if (isSignedOut(service)) return;
  await new Promise<void>((resolve) => {
    const subscription = service.subscribe((state) => {
      if (!state.matches("unauthorized")) return;
      subscription.unsubscribe();
      resolve();
    });
    service.send({ type: "LOGOUT" });
  });
}
