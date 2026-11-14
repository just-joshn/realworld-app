import React from "react";
import { useMachine } from "@xstate/react";
import { Switch, Route } from "react-router";
import TransactionListFilters from "../components/TransactionListFilters";
import TransactionContactsList from "../components/TransactionContactsList";
import { transactionFiltersMachine } from "../machines/transactionFiltersMachine";
import { getDateQueryFields, getAmountQueryFields } from "../utils/transactionUtils";
import TransactionPersonalList from "../components/TransactionPersonalList";
import TransactionPublicList from "../components/TransactionPublicList";

const TransactionsContainer: React.FC = () => {
  const [currentFilters, sendFilterEvent] = useMachine(transactionFiltersMachine);

  const hasDateRangeFilter = currentFilters.matches({ dateRange: "filter" });
  const hasAmountRangeFilter = currentFilters.matches({
    amountRange: "filter",
  });

  const dateFields = getDateQueryFields(currentFilters.context);
  const amountFields = getAmountQueryFields(currentFilters.context);
  const dateRangeFilters = hasDateRangeFilter
    ? {
        ...(dateFields.dateRangeStart !== undefined
          ? { dateRangeStart: dateFields.dateRangeStart }
          : {}),
        ...(dateFields.dateRangeEnd !== undefined ? { dateRangeEnd: dateFields.dateRangeEnd } : {}),
      }
    : {};
  const amountRangeFilters = hasAmountRangeFilter
    ? {
        ...(amountFields.amountMin !== undefined
          ? { amountMin: Number(amountFields.amountMin) }
          : {}),
        ...(amountFields.amountMax !== undefined
          ? { amountMax: Number(amountFields.amountMax) }
          : {}),
      }
    : {};

  const Filters = (
    <TransactionListFilters
      dateRangeFilters={dateRangeFilters}
      amountRangeFilters={amountRangeFilters}
      sendFilterEvent={sendFilterEvent}
    />
  );

  return (
    <Switch>
      <Route exact path="/contacts">
        <TransactionContactsList
          filterComponent={Filters}
          dateRangeFilters={dateRangeFilters}
          amountRangeFilters={amountRangeFilters}
        />
      </Route>
      <Route exact path="/personal">
        <TransactionPersonalList
          filterComponent={Filters}
          dateRangeFilters={dateRangeFilters}
          amountRangeFilters={amountRangeFilters}
        />
      </Route>
      <Route exact path="/(public)?">
        <TransactionPublicList
          filterComponent={Filters}
          dateRangeFilters={dateRangeFilters}
          amountRangeFilters={amountRangeFilters}
        />
      </Route>
    </Switch>
  );
};

export default TransactionsContainer;
