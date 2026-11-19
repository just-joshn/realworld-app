import type { ReactNode } from "react";
import React, { useEffect } from "react";
import { useMachine } from "@xstate/react";
import type { TransactionDateRangePayload, TransactionAmountRangePayload } from "../models";
import TransactionList from "./TransactionList";
import { personalTransactionsMachine } from "../machines/personalTransactionsMachine";

export interface TransactionPersonalListProps {
  filterComponent: ReactNode;
  dateRangeFilters: TransactionDateRangePayload;
  amountRangeFilters: TransactionAmountRangePayload;
}

const TransactionPersonalList: React.FC<TransactionPersonalListProps> = ({
  filterComponent,
  dateRangeFilters,
  amountRangeFilters,
}) => {
  const [current, send] = useMachine(personalTransactionsMachine);
  const { pageData, results } = current.context;

  useEffect(() => {
    send({ type: "FETCH", ...dateRangeFilters, ...amountRangeFilters });
  }, [send, dateRangeFilters, amountRangeFilters]);

  const loadNextPage = (page: number) => {
    send({ type: "FETCH", page, ...dateRangeFilters, ...amountRangeFilters });
  };

  return (
    <>
      <TransactionList
        filterComponent={filterComponent}
        header="Personal"
        transactions={results}
        isLoading={current.matches("loading")}
        loadNextPage={loadNextPage}
        pagination={pageData}
        showCreateButton={true}
      />
    </>
  );
};

export default TransactionPersonalList;
