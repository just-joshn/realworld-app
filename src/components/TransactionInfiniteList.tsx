import React from "react";
import { styled, type Theme } from "@mui/material/styles";
import { useTheme, useMediaQuery, Divider } from "@mui/material";
import type { RowRendererParams } from "react-virtualized";
import { InfiniteLoader, List } from "react-virtualized";
import "react-virtualized/styles.css";

import TransactionItem from "./TransactionItem";
import type { TransactionResponseItem, TransactionPagination } from "../models";

const PREFIX = "TransactionInfiniteList";

const classes = {
  transactionList: `${PREFIX}-transactionList`,
};

const StyledInfiniteLoader = styled(InfiniteLoader)(() => ({
  [`& .${classes.transactionList}`]: {
    width: "100%",
    minHeight: "80vh",
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
}));

export interface TransactionListProps {
  transactions: TransactionResponseItem[];
  loadNextPage: (page: number) => void;
  pagination: Pick<TransactionPagination, "page" | "hasNextPages"> & Partial<TransactionPagination>;
}

const removePx = (str: string) => +str.slice(0, str.length - 2);

function listDimensions(theme: Theme, isXs: boolean) {
  return {
    height: removePx(theme.spacing(isXs ? 74 : 88)),
    width: removePx(theme.spacing(isXs ? 38 : 90)),
    rowHeight: removePx(theme.spacing(isXs ? 28 : 16)),
  };
}

function TransactionRow({
  transaction,
  style,
  isMobile,
}: {
  transaction: TransactionResponseItem;
  style: React.CSSProperties;
  isMobile: boolean;
}) {
  return (
    <div style={style}>
      <TransactionItem transaction={transaction} />
      <Divider variant={isMobile ? "fullWidth" : "inset"} />
    </div>
  );
}

const TransactionInfiniteList: React.FC<TransactionListProps> = ({
  transactions,
  loadNextPage,
  pagination,
}) => {
  const theme = useTheme();
  const isXsBreakpoint = useMediaQuery(theme.breakpoints.down("sm"));
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const itemCount = pagination.hasNextPages ? transactions.length + 1 : transactions.length;

  const loadMoreItems = () => {
    if (pagination.hasNextPages) loadNextPage(pagination.page + 1);
    return Promise.resolve();
  };

  const isRowLoaded = (params: { index: number }) =>
    !pagination.hasNextPages || params.index < transactions.length;

  const rowRenderer = ({ key, index, style }: RowRendererParams) => {
    const transaction = transactions[index];
    return transaction ? (
      <TransactionRow key={key} transaction={transaction} style={style} isMobile={isMobile} />
    ) : null;
  };

  return (
    <StyledInfiniteLoader
      isRowLoaded={isRowLoaded}
      loadMoreRows={loadMoreItems}
      rowCount={itemCount}
      threshold={2}
    >
      {({ onRowsRendered, registerChild }) => (
        <div data-test="transaction-list" className={classes.transactionList}>
          <List
            rowCount={itemCount}
            ref={registerChild}
            onRowsRendered={onRowsRendered}
            {...listDimensions(theme, isXsBreakpoint)}
            rowRenderer={rowRenderer}
            role="grid"
          />
        </div>
      )}
    </StyledInfiniteLoader>
  );
};

export default TransactionInfiniteList;
