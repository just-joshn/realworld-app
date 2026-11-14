import React from "react";
import { styled } from "@mui/material/styles";
import { useTheme, useMediaQuery, Divider } from "@mui/material";
import type { Index, ListRowProps } from "react-virtualized";
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

  const isRowLoaded = (params: Index) =>
    !pagination.hasNextPages || params.index < transactions.length;

  function rowRenderer({ key, index, style }: ListRowProps) {
    const transaction = transactions[index];

    if (transaction) {
      return (
        <div key={key} style={style}>
          <TransactionItem transaction={transaction} />
          <Divider variant={isMobile ? "fullWidth" : "inset"} />
        </div>
      );
    }
    return null;
  }

  const removePx = (str: string) => +str.slice(0, str.length - 2);

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
            height={isXsBreakpoint ? removePx(theme.spacing(74)) : removePx(theme.spacing(88))}
            width={isXsBreakpoint ? removePx(theme.spacing(38)) : removePx(theme.spacing(90))}
            rowHeight={isXsBreakpoint ? removePx(theme.spacing(28)) : removePx(theme.spacing(16))}
            rowRenderer={rowRenderer}
          />
        </div>
      )}
    </StyledInfiniteLoader>
  );
};

export default TransactionInfiniteList;
