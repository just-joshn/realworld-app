import React, { useEffect } from "react";
import { useMachine } from "@xstate/react";
import { useSharedActor } from "../utils/useSharedActor";
import { useParams } from "react-router-dom";
import TransactionDetail from "../components/TransactionDetail";
import type { Transaction, Comment, TransactionUpdateActionPayload } from "../models";
import { transactionDetailMachine } from "../machines/transactionDetailMachine";
import { first } from "lodash/fp";
import type { ActorRefFrom } from "xstate";
import { isAppUser, type authMachine } from "../machines/authMachine";

export interface Props {
  authService: ActorRefFrom<typeof authMachine>;
}
interface Params {
  transactionId: string;
}

const TransactionDetailsContainer: React.FC<Props> = ({ authService }) => {
  const { transactionId }: Params = useParams();
  const [authState] = useSharedActor(authService);
  const [transactionDetailState, sendTransactionDetail] = useMachine(transactionDetailMachine);
  useEffect(() => {
    sendTransactionDetail({ type: "FETCH", transactionId });
  }, [sendTransactionDetail, transactionId]);

  const transactionLike = (transactionId: Transaction["id"]) => {
    sendTransactionDetail({ type: "CREATE", entity: "LIKE", transactionId });
  };

  const transactionComment = (payload: Pick<Comment, "transactionId" | "content">) => {
    sendTransactionDetail({ type: "CREATE", entity: "COMMENT", ...payload });
  };

  const transactionUpdate = (payload: TransactionUpdateActionPayload) => {
    sendTransactionDetail({ type: "UPDATE", ...payload });
  };

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
