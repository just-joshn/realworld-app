import { useMachine } from "@xstate/react";
import { snackbarMachine } from "../machines/snackbarMachine";
import { notificationsMachine } from "../machines/notificationsMachine";
import { bankAccountsMachine } from "../machines/bankAccountsMachine";

export function useAppServices() {
  const [, , notificationsService] = useMachine(notificationsMachine);
  const [, , snackbarService] = useMachine(snackbarMachine);
  const [, , bankAccountsService] = useMachine(bankAccountsMachine);
  return { notificationsService, snackbarService, bankAccountsService };
}
