import React from "react";
import { styled } from "@mui/material/styles";
import { Paper, Grid } from "@mui/material";
import type { TransactionDateRangePayload, TransactionAmountRangePayload } from "../models";
import TransactionListDateRangeFilter from "./TransactionDateRangeFilter";
import TransactionListAmountRangeFilter from "./TransactionListAmountRangeFilter";
import { debounce } from "lodash/fp";
import type { FilterEvents } from "../machines/transactionFiltersMachine";

const PREFIX = "TransactionListFilters";

const classes = {
  paper: `${PREFIX}-paper`,
};

const StyledPaper = styled(Paper)(({ theme }) => ({
  [`&.${classes.paper}`]: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
}));

export type TransactionListFiltersProps = {
  sendFilterEvent: (event: FilterEvents) => void;
  dateRangeFilters: TransactionDateRangePayload;
  amountRangeFilters: TransactionAmountRangePayload;
};

const TransactionListFilters: React.FC<TransactionListFiltersProps> = ({
  sendFilterEvent,
  dateRangeFilters,
  amountRangeFilters,
}) => {
  const filterDateRange = (payload: TransactionDateRangePayload) => {
    sendFilterEvent({ type: "DATE_FILTER", ...payload });
  };
  const resetDateRange = () => {
    sendFilterEvent({ type: "DATE_RESET" });
  };

  const filterAmountRange = debounce(200, (payload: TransactionAmountRangePayload) => {
    sendFilterEvent({ type: "AMOUNT_FILTER", ...payload });
  });
  const resetAmountRange = () => {
    sendFilterEvent({ type: "AMOUNT_RESET" });
  };

  return (
    <StyledPaper className={classes.paper} elevation={0}>
      <Grid
        container
        direction="row"
        spacing={1}
        sx={{ justifyContent: "flex-start", alignItems: "flex-start" }}
      >
        <Grid>
          <TransactionListDateRangeFilter
            filterDateRange={filterDateRange}
            dateRangeFilters={dateRangeFilters}
            resetDateRange={resetDateRange}
          />
        </Grid>
        <Grid>
          <TransactionListAmountRangeFilter
            filterAmountRange={filterAmountRange}
            amountRangeFilters={amountRangeFilters}
            resetAmountRange={resetAmountRange}
          />
        </Grid>
      </Grid>
    </StyledPaper>
  );
};

export default TransactionListFilters;
