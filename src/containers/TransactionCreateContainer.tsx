import React, { useEffect } from "react";
import { useMachine, useActor } from "@xstate/react";
import { User } from "../models";
import TransactionCreateStepOne from "../components/TransactionCreateStepOne";
import TransactionCreateStepTwo, {
  TransactionCreateStepTwoProps,
} from "../components/TransactionCreateStepTwo";
import TransactionCreateStepThree from "../components/TransactionCreateStepThree";
import { createTransactionMachine } from "../machines/createTransactionMachine";
import { usersMachine } from "../machines/usersMachine";
import { debounce } from "lodash/fp";
import { InterpreterFrom } from "xstate";
import { authMachine } from "../machines/authMachine";
import { snackbarMachine, SnackbarContext } from "../machines/snackbarMachine";
import { Stepper, Step, StepLabel } from "@mui/material";

export interface Props {
  authService: InterpreterFrom<typeof authMachine>;
  snackbarService: InterpreterFrom<typeof snackbarMachine>;
}

const TransactionCreateContainer: React.FC<Props> = ({ authService, snackbarService }) => {
  const [authState] = useActor(authService);
  const [, sendSnackbar] = useActor(snackbarService);

  const [createTransactionState, sendCreateTransaction, createTransactionService] =
    useMachine(createTransactionMachine);

  const [usersState, sendUsers] = useMachine(usersMachine);

  useEffect(() => {
    sendUsers({ type: "FETCH" });
  }, [sendUsers]);

  const sender = authState?.context?.user;
  const setReceiver = (receiver: User) => {
    if (!sender) return;
    sendCreateTransaction({ type: "SET_USERS", sender, receiver });
  };
  const createTransaction: TransactionCreateStepTwoProps["createTransaction"] = (payload) => {
    sendCreateTransaction("CREATE", payload);
  };
  const userListSearch = debounce(200, (payload: { q: string }) =>
    sendUsers({ type: "FETCH", ...payload })
  );

  const showSnackbar = (payload: SnackbarContext) => sendSnackbar({ type: "SHOW", ...payload });

  let activeStep;
  if (createTransactionState.matches("stepTwo")) {
    activeStep = 1;
  } else if (createTransactionState.matches("stepThree")) {
    activeStep = 3;
  } else {
    activeStep = 0;
  }

  return (
    <>
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
      {createTransactionState.matches("stepOne") && (
        <TransactionCreateStepOne
          setReceiver={setReceiver}
          users={usersState.context.results}
          userListSearch={userListSearch}
        />
      )}
      {sender && createTransactionState.matches("stepTwo") && (
        <TransactionCreateStepTwo
          receiver={createTransactionState.context.receiver}
          sender={sender}
          createTransaction={createTransaction}
          showSnackbar={showSnackbar}
        />
      )}
      {createTransactionState.matches("stepThree") && (
        <TransactionCreateStepThree createTransactionService={createTransactionService} />
      )}
    </>
  );
};

export default TransactionCreateContainer;
