import React, { useEffect } from "react";
import { Routes, Route } from "react-router";
import type { ActorRefFrom } from "xstate";
import MainLayout from "../components/MainLayout";
import PrivateRoute from "../components/PrivateRoute";
import TransactionsContainer from "./TransactionsContainer";
import UserSettingsContainer from "./UserSettingsContainer";
import NotificationsContainer from "./NotificationsContainer";
import BankAccountsContainer from "./BankAccountsContainer";
import TransactionCreateContainer from "./TransactionCreateContainer";
import TransactionDetailContainer from "./TransactionDetailContainer";
import type { notificationsMachine } from "../machines/notificationsMachine";
import type { bankAccountsMachine } from "../machines/bankAccountsMachine";
import type { authMachine } from "../machines/authMachine";
import type { snackbarMachine } from "../machines/snackbarMachine";
import { useSharedActor } from "../utils/useSharedActor";
import UserOnboardingContainer from "./UserOnboardingContainer";

export interface Props {
  isLoggedIn: boolean;
  authService: ActorRefFrom<typeof authMachine>;
  notificationsService: ActorRefFrom<typeof notificationsMachine>;
  snackbarService: ActorRefFrom<typeof snackbarMachine>;
  bankAccountsService: ActorRefFrom<typeof bankAccountsMachine>;
}

function guard(path: string, isLoggedIn: boolean, element: React.ReactNode) {
  return (
    <Route
      key={path}
      path={path}
      element={<PrivateRoute isLoggedIn={isLoggedIn}>{element}</PrivateRoute>}
    />
  );
}

function accountRoutes(p: Props) {
  const { isLoggedIn, authService, notificationsService, bankAccountsService } =
    p;
  return [
    guard(
      "/user/settings",
      isLoggedIn,
      <UserSettingsContainer authService={authService} />,
    ),
    guard(
      "/notifications",
      isLoggedIn,
      <NotificationsContainer
        authService={authService}
        notificationsService={notificationsService}
      />,
    ),
    guard(
      "/bankaccounts/*",
      isLoggedIn,
      <BankAccountsContainer
        authService={authService}
        bankAccountsService={bankAccountsService}
      />,
    ),
  ];
}

function transactionRoutes(p: Props) {
  const { isLoggedIn, authService, snackbarService } = p;
  return [
    guard(
      "/transaction/new",
      isLoggedIn,
      <TransactionCreateContainer
        authService={authService}
        snackbarService={snackbarService}
      />,
    ),
    guard(
      "/transaction/:transactionId",
      isLoggedIn,
      <TransactionDetailContainer authService={authService} />,
    ),
    guard("/*", isLoggedIn, <TransactionsContainer />),
  ];
}

function PrivateRouteList(props: Props) {
  return (
    <Routes>
      {accountRoutes(props)}
      {transactionRoutes(props)}
    </Routes>
  );
}

const PrivateRoutesContainer: React.FC<Props> = ({
  isLoggedIn,
  authService,
  notificationsService,
  snackbarService,
  bankAccountsService,
}) => {
  const [, sendNotifications] = useSharedActor(notificationsService);

  useEffect(() => {
    sendNotifications({ type: "FETCH" });
  }, [sendNotifications]);

  return (
    <MainLayout
      notificationsService={notificationsService}
      authService={authService}
    >
      <UserOnboardingContainer
        authService={authService}
        bankAccountsService={bankAccountsService}
      />
      <PrivateRouteList
        isLoggedIn={isLoggedIn}
        authService={authService}
        notificationsService={notificationsService}
        snackbarService={snackbarService}
        bankAccountsService={bankAccountsService}
      />
    </MainLayout>
  );
};

export default PrivateRoutesContainer;
