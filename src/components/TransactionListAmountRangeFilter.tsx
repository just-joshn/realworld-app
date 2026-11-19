import React from "react";
import {
  Grid,
  Popover,
  Typography,
  Slider,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  Drawer,
} from "@mui/material";
import { ArrowDropDown as ArrowDropDownIcon } from "@mui/icons-material";
import type { TransactionAmountRangePayload } from "../models";
import {
  formatAmountRangeValues,
  amountRangeValueText,
  amountRangeValueTextLabel,
  padAmountWithZeros,
} from "../utils/transactionUtils";

export type TransactionListAmountRangeFilterProps = {
  filterAmountRange: (payload: TransactionAmountRangePayload) => void;
  amountRangeFilters: TransactionAmountRangePayload;
  resetAmountRange: () => void;
};

type AmountRangePanelProps = {
  amountRangeValue: number[];
  onChange: (event: Event, amountRange: number | number[]) => void;
  onClear: () => void;
};

const AmountRangeHeader: React.FC<Pick<AmountRangePanelProps, "amountRangeValue" | "onClear">> = ({
  amountRangeValue,
  onClear,
}) => (
  <Grid
    container
    direction="row"
    sx={{
      width: "100%",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Grid sx={{ width: "225px" }}>
      <Typography color="textSecondary" data-test="transaction-list-filter-amount-range-text">
        Amount Range: {formatAmountRangeValues(amountRangeValue)}
      </Typography>
    </Grid>
    <Grid>
      <Button data-test="transaction-list-filter-amount-clear-button" onClick={onClear}>
        Clear
      </Button>
    </Grid>
  </Grid>
);

const AmountRangePanel: React.FC<AmountRangePanelProps> = ({
  amountRangeValue,
  onChange,
  onClear,
}) => (
  <Grid
    data-test="transaction-list-filter-amount-range"
    container
    spacing={1}
    sx={{
      width: "300px",
      margin: "30px",
      justifyContent: "flex-start",
      alignItems: "flex-start",
      flexDirection: "column",
    }}
  >
    <Grid>
      <AmountRangeHeader amountRangeValue={amountRangeValue} onClear={onClear} />
    </Grid>
    <Grid>
      <Slider
        data-test="transaction-list-filter-amount-range-slider"
        sx={{ width: "200px" }}
        value={amountRangeValue}
        min={0}
        max={100}
        onChange={onChange}
        valueLabelDisplay="auto"
        aria-labelledby="range-slider"
        getAriaValueText={amountRangeValueText}
        valueLabelFormat={amountRangeValueTextLabel}
      />
    </Grid>
  </Grid>
);

type AmountRangePickerProps = AmountRangePanelProps & {
  id: string | undefined;
  open: boolean;
  anchorEl: HTMLDivElement | null;
  xsBreakpoint: boolean;
  onClose: () => void;
};

const AmountRangePicker: React.FC<AmountRangePickerProps> = ({
  id,
  open,
  anchorEl,
  xsBreakpoint,
  onClose,
  ...panelProps
}) => {
  if (xsBreakpoint) {
    return (
      <Drawer
        id={id}
        open={open}
        ModalProps={{ onClose }}
        anchor="bottom"
        data-test="amount-range-filter-drawer"
      >
        <Button data-test="amount-range-filter-drawer-close" onClick={onClose}>
          Close
        </Button>
        <AmountRangePanel {...panelProps} />
      </Drawer>
    );
  }
  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
    >
      <AmountRangePanel {...panelProps} />
    </Popover>
  );
};

const INITIAL_AMOUNT_RANGE = [0, 100];

function useAmountRangeFilter({
  filterAmountRange,
  resetAmountRange,
}: Pick<TransactionListAmountRangeFilterProps, "filterAmountRange" | "resetAmountRange">) {
  const [value, setValue] = React.useState<number[]>(INITIAL_AMOUNT_RANGE);
  const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null);

  return {
    value,
    anchorEl,
    open: (event: React.MouseEvent<HTMLDivElement>) => {
      setAnchorEl(event.currentTarget);
    },
    close: () => {
      setAnchorEl(null);
    },
    clear: () => {
      setValue(INITIAL_AMOUNT_RANGE);
      resetAmountRange();
    },
    change: (_event: Event, amountRange: number | number[]) => {
      if (!Array.isArray(amountRange)) return;
      const minimum = amountRange[0];
      const maximum = amountRange.at(-1);
      if (minimum === undefined || maximum === undefined) return;
      filterAmountRange({
        amountMin: padAmountWithZeros(minimum),
        amountMax: padAmountWithZeros(maximum),
      });
      setValue(amountRange);
    },
  };
}

const TransactionListAmountRangeFilter: React.FC<TransactionListAmountRangeFilterProps> = ({
  filterAmountRange,
  resetAmountRange,
}) => {
  const theme = useTheme();
  const xsBreakpoint = useMediaQuery(theme.breakpoints.only("xs"));
  const range = useAmountRangeFilter({ filterAmountRange, resetAmountRange });
  const amountRangeOpen = Boolean(range.anchorEl);

  return (
    <div>
      <Chip
        color="primary"
        variant="outlined"
        onClick={range.open}
        data-test="transaction-list-filter-amount-range-button"
        label={`Amount: ${formatAmountRangeValues(range.value)}`}
        deleteIcon={<ArrowDropDownIcon />}
        onDelete={range.open}
      />
      <AmountRangePicker
        id={amountRangeOpen ? "amount-range-popover" : undefined}
        open={amountRangeOpen}
        anchorEl={range.anchorEl}
        xsBreakpoint={xsBreakpoint}
        onClose={range.close}
        amountRangeValue={range.value}
        onChange={range.change}
        onClear={range.clear}
      />
    </div>
  );
};

export default TransactionListAmountRangeFilter;
