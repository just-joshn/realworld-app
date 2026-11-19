import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import { TextField } from "@mui/material";

const PREFIX = "UserListSearchForm";

const classes = {
  paper: `${PREFIX}-paper`,
  form: `${PREFIX}-form`,
};

const Root = styled("div")(({ theme }) => ({
  [`& .${classes.paper}`]: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  [`& .${classes.form}`]: {
    width: "100%",
    marginTop: theme.spacing(1),
  },
}));

export interface UserListSearchFormProps {
  userListSearch: (payload: { q: string }) => void;
}

const UserListSearchForm: React.FC<UserListSearchFormProps> = ({ userListSearch }) => {
  const [query, setQuery] = useState("");

  return (
    <Root>
      <form className={classes.form}>
        <TextField
          variant="outlined"
          margin="dense"
          fullWidth
          name="q"
          type="text"
          placeholder="Search..."
          id="user-list-search-input"
          value={query}
          slotProps={{ htmlInput: { "data-test": "user-list-search-input" } }}
          onFocus={() => {
            setQuery("");
          }}
          onChange={({ target: { value: q } }) => {
            setQuery(q);
            userListSearch({ q });
          }}
        />
      </form>
    </Root>
  );
};

export default UserListSearchForm;
