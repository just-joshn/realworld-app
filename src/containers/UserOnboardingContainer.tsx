import React, { useEffect } from "react";
import {
  Button,
  Box,
  useTheme,
  useMediaQuery,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import type { ActorRefFrom } from "xstate";
import { isEmpty } from "lodash/fp";
import { useMachine } from "@xstate/react";
import { useSharedActor } from "../utils/useSharedActor";

import { userOnboardingMachine } from "../machines/userOnboardingMachine";
import type { BankAccountPayload } from "../models";
import BankAccountForm from "../components/BankAccountForm";
import type { bankAccountsMachine } from "../machines/bankAccountsMachine";
import type { authMachine, AuthMachineContext } from "../machines/authMachine";
import navigatorIllustration from "../svgs/undraw_navigator_a479.svg";
import personalFinanceIllustration from "../svgs/undraw_personal_finance_tqcd.svg";

export interface Props {
  authService: ActorRefFrom<typeof authMachine>;
  bankAccountsService: ActorRefFrom<typeof bankAccountsMachine>;
}

// Matches the intrinsic height of each svg so the artwork shrinks in width but keeps its box height.
const illustrationStyle = (height: number) => ({ minWidth: 0, maxWidth: "100%", height }) as const;

type OnboardingState = ReturnType<typeof useMachine<typeof userOnboardingMachine>>[0];

function isDialogOpen(state: OnboardingState, noBankAccounts: boolean) {
  return (
    (state.matches("stepTwo") && !noBankAccounts) ||
    (state.matches("stepThree") && !noBankAccounts) ||
    (!state.matches("done") && noBankAccounts)
  );
}

function onboardingTitle(state: OnboardingState) {
  if (state.matches("stepOne")) return "Get Started with Real World App";
  if (state.matches("stepTwo")) return "Create Bank Account";
  if (state.matches("stepThree")) return "Finished";
  return null;
}

const UserOnboardingContainer: React.FC<Props> = ({ authService, bankAccountsService }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [bankAccountsState, sendBankAccounts] = useSharedActor(bankAccountsService);
  const [authState, sendAuth] = useSharedActor(authService);
  const [userOnboardingState, sendUserOnboarding] = useMachine(userOnboardingMachine);

  const currentUser = authState.context.user;

  useEffect(() => {
    sendBankAccounts({ type: "FETCH" });
  }, [sendBankAccounts]);

  const noBankAccounts =
    bankAccountsState.matches({ success: "withoutData" }) &&
    isEmpty(bankAccountsState.context.results);

  const dialogIsOpen = isDialogOpen(userOnboardingState, noBankAccounts);

  const nextStep = () => {
    sendUserOnboarding({ type: "NEXT" });
  };

  const createBankAccountWithNextStep = (payload: BankAccountPayload) => {
    sendBankAccounts({ type: "CREATE", ...payload });
    nextStep();
  };

  return (
    <Dialog data-test="user-onboarding-dialog" fullScreen={fullScreen} open={dialogIsOpen}>
      <DialogTitle data-test="user-onboarding-dialog-title">
        {onboardingTitle(userOnboardingState)}
      </DialogTitle>
      <OnboardingContent
        step={userOnboardingState}
        currentUser={currentUser}
        createBankAccount={createBankAccountWithNextStep}
      />
      <OnboardingActions
        isStepTwo={userOnboardingState.matches("stepTwo")}
        isStepThree={userOnboardingState.matches("stepThree")}
        onLogout={() => {
          sendAuth({ type: "LOGOUT" });
        }}
        onNext={nextStep}
      />
    </Dialog>
  );
};

interface ContentProps {
  step: OnboardingState;
  currentUser: AuthMachineContext["user"];
  createBankAccount: (payload: BankAccountPayload) => void;
}

function OnboardingContent({ step, currentUser, createBankAccount }: ContentProps) {
  return (
    <DialogContent data-test="user-onboarding-dialog-content">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {step.matches("stepOne") && (
          <>
            <img src={navigatorIllustration} alt="" style={illustrationStyle(491.63114)} />
            <br />
            <DialogContentText style={{ paddingLeft: 20 }}>
              Real World App requires a Bank Account to perform transactions.
              <br />
              <br />
              Click <b>Next</b> to begin setup of your Bank Account.
            </DialogContentText>
          </>
        )}
        {step.matches("stepTwo") && currentUser && (
          <BankAccountForm
            userId={currentUser.id}
            createBankAccount={createBankAccount}
            onboarding
          />
        )}
        {step.matches("stepThree") && (
          <>
            <img src={personalFinanceIllustration} alt="" style={illustrationStyle(733.6066)} />
            <br />
            <DialogContentText style={{ paddingLeft: 20 }}>
              You're all set!
              <br />
              <br />
              We're excited to have you aboard the Real World App!
            </DialogContentText>
          </>
        )}
      </Box>
    </DialogContent>
  );
}

interface ActionsProps {
  isStepTwo: boolean;
  isStepThree: boolean;
  onLogout: () => void;
  onNext: () => void;
}

function OnboardingActions({ isStepTwo, isStepThree, onLogout, onNext }: ActionsProps) {
  return (
    <DialogActions>
      <Grid container sx={{ justifyContent: "space-between" }}>
        <Grid>
          <Button
            style={{ paddingRight: "80%" }}
            onClick={onLogout}
            color="secondary"
            data-test="user-onboarding-logout"
          >
            Logout
          </Button>
        </Grid>
        <Grid>
          {!isStepTwo && (
            <Button onClick={onNext} color="primary" data-test="user-onboarding-next">
              {isStepThree ? "Done" : "Next"}
            </Button>
          )}
        </Grid>
      </Grid>
    </DialogActions>
  );
}

export default UserOnboardingContainer;
