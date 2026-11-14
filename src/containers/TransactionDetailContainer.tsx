import React, { useEffect } from "react";
import { useMachine, useActor } from "@xstate/react";
import { useParams } from "react-router-dom";
import TransactionDetail from "../components/TransactionDetail";
import type { Transaction, Comment, TransactionUpdateActionPayload } from "../models";
import { transactionDetailMachine } from "../machines/transactionDetailMachine";
import { first } from "lodash/fp";
import type { InterpreterFrom } from "xstate";
import { isAppUser, type authMachine } from "../machines/authMachine";

export interface Props {
  authService: InterpreterFrom<typeof authMachine>;
}
interface Params {
  transactionId: string;
}

const TransactionDetailsContainer: React.FC<Props> = ({ authService }) => {
  const { transactionId }: Params = useParams();
  const [authState] = useActor(authService);
  const [transactionDetailState, sendTransactionDetail] = useMachine(transactionDetailMachine);
  useEffect(() => {
    sendTransactionDetail("FETCH", { transactionId });
  }, [sendTransactionDetail, transactionId]);

  const transactionLike = (transactionId: Transaction["id"]) =>
    sendTransactionDetail("CREATE", { entity: "LIKE", transactionId });

  const transactionComment = (payload: Pick<Comment, "transactionId" | "content">) =>
    sendTransactionDetail("CREATE", { entity: "COMMENT", ...payload });

  const transactionUpdate = (payload: TransactionUpdateActionPayload) =>
    sendTransactionDetail("UPDATE", payload);

  const transaction = first(transactionDetailState.context.results);
  const currentUser =
    authState.context.user && isAppUser(authState.context.user)
      ? authState.context.user
      : undefined;

  return (
    <>
      {transactionDetailState.matches("idle") && (
        <div>
          Loading...
          <br />
        </div>
      )}
      {currentUser && transaction && transactionDetailState.matches("success") && (
        <TransactionDetail
          transaction={transaction}
          transactionLike={transactionLike}
          transactionComment={transactionComment}
          transactionUpdate={transactionUpdate}
          currentUser={currentUser}
        />
      )}
    </>
  );
};

export default TransactionDetailsContainer;
