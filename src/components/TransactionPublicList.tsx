import type { ReactNode } from "react";
import React, { useEffect } from "react";
import { useMachine } from "@xstate/react";
import type { TransactionDateRangePayload, TransactionAmountRangePayload } from "../models";
import TransactionList from "./TransactionList";
import { publicTransactionsMachine } from "../machines/publicTransactionsMachine";

export interface TransactionPublicListProps {
  filterComponent: ReactNode;
  dateRangeFilters: TransactionDateRangePayload;
  amountRangeFilters: TransactionAmountRangePayload;
}

const TransactionPublicList: React.FC<TransactionPublicListProps> = ({
  filterComponent,
  dateRangeFilters,
  amountRangeFilters,
}) => {
  const [current, send] = useMachine(publicTransactionsMachine);
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
        header="Public"
        transactions={results}
        isLoading={current.matches("loading")}
        loadNextPage={loadNextPage}
        pagination={pageData}
        showCreateButton
      />
    </>
  );
};

export default TransactionPublicList;
