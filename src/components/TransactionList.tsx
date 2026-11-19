import { object, number, boolean } from "yup";
import type { ReactNode } from "react";
import React from "react";
import { styled } from "@mui/material/styles";
import { Paper, Button, ListSubheader, Grid } from "@mui/material";
import { Link as RouterLink } from "react-router";
import { isEmpty } from "lodash/fp";

import SkeletonList from "./SkeletonList";
import type { TransactionResponseItem } from "../models";
import EmptyList from "./EmptyList";
import TransactionInfiniteList from "./TransactionInfiniteList";
import TransferMoneyIllustration from "./SvgUndrawTransferMoneyRywa";

const paginationSchema = object({
  page: number().required(),
  hasNextPages: boolean().required(),
});

const PREFIX = "TransactionList";

const classes = {
  paper: `${PREFIX}-paper`,
};

const StyledPaper = styled(Paper)(({ theme }) => ({
  [`&.${classes.paper}`]: {
    paddingLeft: theme.spacing(1),
  },
}));

export interface TransactionListProps {
  header: string;
  transactions: TransactionResponseItem[];
  isLoading: boolean;
  showCreateButton?: boolean;
  loadNextPage: (page: number) => void;
  pagination: object | undefined;
  filterComponent: ReactNode;
}

function EmptyTransactions({ showCreateButton }: { showCreateButton?: boolean | undefined }) {
  return (
    <EmptyList entity="Transactions">
      <Grid
        container
        style={{ width: "100%" }}
        spacing={2}
        sx={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <Grid>
          <TransferMoneyIllustration style={{ height: 200, width: 300, marginBottom: 30 }} />
        </Grid>
        <Grid>
          {showCreateButton && (
            <Button
              data-test="transaction-list-empty-create-transaction-button"
              variant="contained"
              color="primary"
              component={RouterLink}
              to="/transaction/new"
            >
              Create A Transaction
            </Button>
          )}
        </Grid>
      </Grid>
    </EmptyList>
  );
}

const TransactionList: React.FC<TransactionListProps> = ({
  header,
  transactions,
  isLoading,
  showCreateButton,
  loadNextPage,
  pagination,
  filterComponent,
}) => {
  const paginationData = isEmpty(pagination)
    ? undefined
    : paginationSchema.validateSync(pagination);
  const showEmptyList = !isLoading && transactions.length === 0;
  const showSkeleton = isLoading && isEmpty(pagination);

  return (
    <StyledPaper className={classes.paper}>
      {filterComponent}
      <ListSubheader component="div">{header}</ListSubheader>
      {showSkeleton && <SkeletonList />}
      {transactions.length > 0 && paginationData && (
        <TransactionInfiniteList
          transactions={transactions}
          loadNextPage={loadNextPage}
          pagination={paginationData}
        />
      )}
      {showEmptyList && <EmptyTransactions showCreateButton={showCreateButton} />}
    </StyledPaper>
  );
};

export default TransactionList;
