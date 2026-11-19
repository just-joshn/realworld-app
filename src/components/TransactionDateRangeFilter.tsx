import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import { format as formatDate } from "date-fns";
import { Popover, Chip, useTheme, Drawer, Button, useMediaQuery, colors } from "@mui/material";
import { ArrowDropDown as ArrowDropDownIcon, Cancel as CancelIcon } from "@mui/icons-material";
import Calendar from "react-calendar";

import "react-calendar/dist/Calendar.css";
import type { TransactionDateRangePayload, Value } from "../models";
import { hasDateQueryFields, localDateToUTCISOString } from "../utils/transactionUtils";

const PREFIX = "TransactionListDateRangeFilter";

const classes = {
  popover: `${PREFIX}-popover`,
};

const Root = styled("div")(({ theme }) => ({
  [`& .${classes.popover}`]: {
    [theme.breakpoints.down("md")]: {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
  },
}));

const { indigo } = colors;

export type TransactionListDateRangeFilterProps = {
  filterDateRange: (payload: TransactionDateRangePayload) => void;
  dateRangeFilters: TransactionDateRangePayload;
  resetDateRange: () => void;
};

const formatButtonDate = (date: Date) => {
  return formatDate(date, "MMM, d yyyy");
};

const dateRangeLabel = (dateRangeFields: Value) => {
  if (dateRangeFields && !(dateRangeFields instanceof Date)) {
    const [dateRangeStart, dateRangeEnd] = dateRangeFields;
    if (!dateRangeStart || !dateRangeEnd) {
      throw new Error("A complete date range is required to format the label");
    }
    const label = `${formatButtonDate(dateRangeStart)} - ${formatButtonDate(dateRangeEnd)}`;
    return label;
  }
  return "ALL";
};

const DateRangeChip: React.FC<{
  queryHasDateFields: boolean;
  label: string;
  onOpen: (event: React.MouseEvent<HTMLDivElement>) => void;
  onClear: () => void;
}> = ({ queryHasDateFields, label, onOpen, onClear }) =>
  queryHasDateFields ? (
    <Chip
      color="primary"
      variant="outlined"
      onClick={onOpen}
      data-test="transaction-list-filter-date-range-button"
      label={`Date: ${label}`}
      deleteIcon={<CancelIcon data-test="transaction-list-filter-date-clear-button" />}
      onDelete={onClear}
    />
  ) : (
    <Chip
      color="primary"
      variant="outlined"
      onClick={onOpen}
      data-test="transaction-list-filter-date-range-button"
      label={"Date: ALL"}
      deleteIcon={<ArrowDropDownIcon />}
      onDelete={onOpen}
    />
  );

type DateRangePickerProps = {
  id: string | undefined;
  open: boolean;
  anchorEl: HTMLDivElement | null;
  xsBreakpoint: boolean;
  onClose: () => void;
  onCalendarSelect: (value: Value) => void;
  calendarValue: Value;
};

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  id,
  open,
  anchorEl,
  xsBreakpoint,
  onClose,
  onCalendarSelect,
  calendarValue,
}) => {
  const calendar = (
    <RangeCalendar
      onCalendarSelect={onCalendarSelect}
      xsBreakpoint={xsBreakpoint}
      color={indigo}
      dataTest="transaction-list-filter-date-range"
      defaultValue={calendarValue}
    />
  );
  if (xsBreakpoint) {
    return (
      <Drawer
        id={id}
        open={open}
        ModalProps={{ onClose }}
        anchor="bottom"
        data-test="date-range-filter-drawer"
      >
        <Button data-test="date-range-filter-drawer-close" onClick={onClose}>
          Close
        </Button>
        {calendar}
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
      className={classes.popover}
    >
      {calendar}
    </Popover>
  );
};

const TransactionListDateRangeFilter: React.FC<TransactionListDateRangeFilterProps> = ({
  filterDateRange,
  dateRangeFilters,
  resetDateRange,
}) => {
  const theme = useTheme();
  const xsBreakpoint = useMediaQuery(theme.breakpoints.only("xs"));
  const queryHasDateFields = hasDateQueryFields(dateRangeFilters);
  const [calendarValue, setCalendarValue] = useState<Value>(null);

  const [dateRangeAnchorEl, setDateRangeAnchorEl] = React.useState<HTMLDivElement | null>(null);

  const onCalendarSelect = (val: Value) => {
    if (val && !(val instanceof Date)) {
      const [rangeStart, rangeEnd] = val;
      const calValue = {
        dateRangeStart: localDateToUTCISOString(rangeStart),
        dateRangeEnd: localDateToUTCISOString(rangeEnd),
      };
      setCalendarValue(val);
      filterDateRange(calValue);
      setDateRangeAnchorEl(null);
    }
  };

  const handleDateRangeClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setDateRangeAnchorEl(event.currentTarget);
  };

  const handleDateRangeClose = () => {
    setDateRangeAnchorEl(null);
  };

  const dateRangeOpen = Boolean(dateRangeAnchorEl);
  const dateRangeId = dateRangeOpen ? "date-range-popover" : undefined;

  return (
    <Root>
      <DateRangeChip
        queryHasDateFields={queryHasDateFields}
        label={dateRangeLabel(calendarValue)}
        onOpen={handleDateRangeClick}
        onClear={() => {
          setCalendarValue(null);
          resetDateRange();
        }}
      />
      <DateRangePicker
        id={dateRangeId}
        open={dateRangeOpen}
        anchorEl={dateRangeAnchorEl}
        xsBreakpoint={xsBreakpoint}
        onClose={handleDateRangeClose}
        onCalendarSelect={onCalendarSelect}
        calendarValue={calendarValue}
      />
    </Root>
  );
};

export function RangeCalendar({
  onCalendarSelect,
  xsBreakpoint,
  color,
  dataTest,
  defaultValue,
}: {
  onCalendarSelect: (value: Value) => void;
  xsBreakpoint: boolean;
  color: Record<string, string>;
  dataTest: string;
  defaultValue: Value;
}) {
  const [value, setValue] = useState<Value>(defaultValue);

  const width = xsBreakpoint ? window.innerWidth : 350;

  const handleChange = (val: Value) => {
    setValue(val);
    onCalendarSelect(val);
  };

  return (
    <div
      data-test={dataTest}
      style={{
        width,
        maxWidth: "100%",
        background: color["400"],
        padding: 8,
        borderRadius: 8,
      }}
    >
      <Calendar onChange={handleChange} value={value} selectRange={true} />
    </div>
  );
}

export default TransactionListDateRangeFilter;
