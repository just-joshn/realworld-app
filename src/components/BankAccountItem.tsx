import React from "react";

import { Grid, Typography, Button, ListItem } from "@mui/material";
import type { BankAccount } from "../models";

export interface BankAccountListItemProps {
  bankAccount: BankAccount;
  deleteBankAccount: (payload: { id: BankAccount["id"] }) => void;
}

const BankAccountListItem: React.FC<BankAccountListItemProps> = ({
  bankAccount,
  deleteBankAccount,
}) => {
  return (
    <ListItem data-test={`bankaccount-list-item-${bankAccount.id}`}>
      <Grid container direction="row" justifyContent="space-between" alignItems="flex-start">
        <Grid item>
          <Typography variant="body1" color="primary" gutterBottom>
            {bankAccount.bankName} {bankAccount.isDeleted ? "(Deleted)" : undefined}
          </Typography>
        </Grid>
        {!bankAccount.isDeleted && (
          <Grid item>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              data-test="bankaccount-delete"
              onClick={() => {
                deleteBankAccount({ id: bankAccount.id });
              }}
            >
              Delete
            </Button>
          </Grid>
        )}
      </Grid>
    </ListItem>
  );
};

export default BankAccountListItem;
