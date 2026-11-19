import { useMachine } from "@xstate/react";
import { Routes, Route } from "react-router";
import TransactionListFilters from "../components/TransactionListFilters";
import TransactionContactsList from "../components/TransactionContactsList";
import { transactionFiltersMachine } from "../machines/transactionFiltersMachine";
import { getDateQueryFields, getAmountQueryFields } from "../utils/transactionUtils";
import TransactionPersonalList from "../components/TransactionPersonalList";
import TransactionPublicList from "../components/TransactionPublicList";

type DateFields = ReturnType<typeof getDateQueryFields>;
type AmountFields = ReturnType<typeof getAmountQueryFields>;

function dateRangeQuery(fields: DateFields) {
  return {
    ...(fields.dateRangeStart !== undefined ? { dateRangeStart: fields.dateRangeStart } : {}),
    ...(fields.dateRangeEnd !== undefined ? { dateRangeEnd: fields.dateRangeEnd } : {}),
  };
}

function amountRangeQuery(fields: AmountFields) {
  return {
    ...(fields.amountMin !== undefined ? { amountMin: Number(fields.amountMin) } : {}),
    ...(fields.amountMax !== undefined ? { amountMax: Number(fields.amountMax) } : {}),
  };
}

function TransactionsContainer() {
  const [currentFilters, sendFilterEvent] = useMachine(transactionFiltersMachine);

  const dateRangeFilters = currentFilters.matches({ dateRange: "filter" })
    ? dateRangeQuery(getDateQueryFields(currentFilters.context))
    : {};
  const amountRangeFilters = currentFilters.matches({ amountRange: "filter" })
    ? amountRangeQuery(getAmountQueryFields(currentFilters.context))
    : {};

  const Filters = (
    <TransactionListFilters
      dateRangeFilters={dateRangeFilters}
      amountRangeFilters={amountRangeFilters}
      sendFilterEvent={sendFilterEvent}
    />
  );

  const listProps = { filterComponent: Filters, dateRangeFilters, amountRangeFilters };
  const publicList = <TransactionPublicList {...listProps} />;

  return (
    <Routes>
      <Route path="/contacts" element={<TransactionContactsList {...listProps} />} />
      <Route path="/personal" element={<TransactionPersonalList {...listProps} />} />
      <Route path="/public" element={publicList} />
      <Route path="/" element={publicList} />
    </Routes>
  );
}

export default TransactionsContainer;
