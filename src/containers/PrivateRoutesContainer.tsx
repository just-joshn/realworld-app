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
    <MainLayout notificationsService={notificationsService} authService={authService}>
      <UserOnboardingContainer
        authService={authService}
        bankAccountsService={bankAccountsService}
      />
      <Routes>
        <Route
          path="/user/settings"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <UserSettingsContainer authService={authService} />
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <NotificationsContainer
                authService={authService}
                notificationsService={notificationsService}
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/bankaccounts/*"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <BankAccountsContainer
                authService={authService}
                bankAccountsService={bankAccountsService}
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/transaction/new"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <TransactionCreateContainer
                authService={authService}
                snackbarService={snackbarService}
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/transaction/:transactionId"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <TransactionDetailContainer authService={authService} />
            </PrivateRoute>
          }
        />
        <Route
          path="/*"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <TransactionsContainer />
            </PrivateRoute>
          }
        />
      </Routes>
    </MainLayout>
  );
};

export default PrivateRoutesContainer;
