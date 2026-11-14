import React from "react";
import { Tabs, Tab } from "@mui/material";
import { Link, useRouteMatch } from "react-router-dom";

export default function TransactionNavTabs() {
  const match = useRouteMatch();

  const navUrls: Record<string, number> = {
    "/": 0,
    "/public": 0,
    "/contacts": 1,
    "/personal": 2,
  };

  const [value, setValue] = React.useState(navUrls[match.url]);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Tabs
      value={value}
      onChange={handleChange}
      indicatorColor="secondary"
      textColor="inherit"
      centered
      data-test="nav-transaction-tabs"
    >
      <Tab label="Everyone" component={Link} to="/" data-test="nav-public-tab" />
      <Tab label="Friends" component={Link} to="/contacts" data-test="nav-contacts-tab" />
      <Tab label="Mine" component={Link} to="/personal" data-test="nav-personal-tab" />
    </Tabs>
  );
}
