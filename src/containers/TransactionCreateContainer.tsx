import React, { useEffect } from "react";
import { useMachine } from "@xstate/react";
import { useSharedActor } from "../utils/useSharedActor";
import type { User } from "../models";
import TransactionCreateStepOne from "../components/TransactionCreateStepOne";
import TransactionCreateStepTwo from "../components/TransactionCreateStepTwo";
import TransactionCreateStepThree from "../components/TransactionCreateStepThree";
import { createTransactionMachine } from "../machines/createTransactionMachine";
import { usersMachine } from "../machines/usersMachine";
import { debounce } from "lodash/fp";
import type { ActorRefFrom } from "xstate";
import { isAppUser, type AuthMachineContext, type authMachine } from "../machines/authMachine";
import type { snackbarMachine, SnackbarContext } from "../machines/snackbarMachine";
import { Stepper, Step, StepLabel } from "@mui/material";

export interface Props {
  authService: ActorRefFrom<typeof authMachine>;
  snackbarService: ActorRefFrom<typeof snackbarMachine>;
}

type CreateTransactionState = ReturnType<typeof useMachine<typeof createTransactionMachine>>[0];

function appUserOrUndefined(user: AuthMachineContext["user"]) {
  return user && isAppUser(user) ? user : undefined;
}

function activeStepIndex(state: CreateTransactionState) {
  if (state.matches("stepTwo")) return 1;
  if (state.matches("stepThree")) return 3;
  return 0;
}

function CreateTransactionStepper({ activeStep }: { activeStep: number }) {
  return (
    <Stepper activeStep={activeStep}>
      <Step key={"stepOne"}>
        <StepLabel>Select Contact</StepLabel>
      </Step>
      <Step key={"stepTwo"}>
        <StepLabel>Payment</StepLabel>
      </Step>
      <Step key={"stepThree"}>
        <StepLabel>Complete</StepLabel>
      </Step>
    </Stepper>
  );
}

const TransactionCreateContainer: React.FC<Props> = ({ authService, snackbarService }) => {
  const [authState] = useSharedActor(authService);
  const [, sendSnackbar] = useSharedActor(snackbarService);

  const [createTransactionState, sendCreateTransaction, createTransactionService] =
    useMachine(createTransactionMachine);

  const [usersState, sendUsers] = useMachine(usersMachine);

  useEffect(() => {
    sendUsers({ type: "FETCH" });
  }, [sendUsers]);

  const sender = appUserOrUndefined(authState.context.user);
  const receiver = createTransactionState.context.receiver;
  const setReceiver = (receiver: User) => {
    if (!sender) return;
    sendCreateTransaction({ type: "SET_USERS", sender, receiver });
  };
  const userListSearch = debounce(200, (payload: { q: string }) => {
    sendUsers({ type: "FETCH", ...payload });
  });

  return (
    <>
      <CreateTransactionStepper activeStep={activeStepIndex(createTransactionState)} />
      {createTransactionState.matches("stepOne") && (
        <TransactionCreateStepOne
          setReceiver={setReceiver}
          users={usersState.context.results}
          userListSearch={userListSearch}
        />
      )}
      {sender && receiver && createTransactionState.matches("stepTwo") && (
        <TransactionCreateStepTwo
          receiver={receiver}
          sender={sender}
          createTransaction={(payload) => {
            sendCreateTransaction({ type: "CREATE", ...payload });
          }}
          showSnackbar={(payload: SnackbarContext) => {
            sendSnackbar({ type: "SHOW", ...payload });
          }}
        />
      )}
      {createTransactionState.matches("stepThree") && (
        <TransactionCreateStepThree createTransactionService={createTransactionService} />
      )}
    </>
  );
};

export default TransactionCreateContainer;
