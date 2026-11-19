import React from "react";
import { styled } from "@mui/material/styles";
import { TextField, Button, Grid } from "@mui/material";
import type { FieldProps } from "formik";
import { Formik, Form, Field } from "formik";
import { string, object } from "yup";
import type { BankAccountPayload, User } from "../models";
import { useNavigate } from "react-router";

const validationSchema = object({
  bankName: string().min(5, "Must contain at least 5 characters").required("Enter a bank name"),
  routingNumber: string()
    .length(9, "Must contain a valid routing number")
    .required("Enter a valid bank routing number"),
  accountNumber: string()
    .min(9, "Must contain at least 9 digits")
    .max(12, "Must contain no more than 12 digits")
    .required("Enter a valid bank account number"),
});

const PREFIX = "BankAccountForm";

const classes = {
  paper: `${PREFIX}-paper`,
  form: `${PREFIX}-form`,
  submit: `${PREFIX}-submit`,
};

const StyledFormik = styled(Formik<BankAccountPayload>)(({ theme }) => ({
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

  [`& .${classes.submit}`]: {
    margin: theme.spacing(3, 0, 2),
  },
}));

export interface BankAccountFormProps {
  userId: User["id"];
  createBankAccount: (payload: BankAccountPayload) => void;
  onboarding?: boolean;
}

function BankField({ name, placeholder }: { name: string; placeholder: string }) {
  return (
    <Field name={name}>
      {({ field, meta: { error, value, initialValue, touched } }: FieldProps) => (
        <TextField
          variant="outlined"
          margin="dense"
          fullWidth
          required
          id={`bankaccount-${name}-input`}
          type="text"
          placeholder={placeholder}
          data-test={`bankaccount-${name}-input`}
          error={(touched || value !== initialValue) && Boolean(error)}
          helperText={touched || value !== initialValue ? error : ""}
          {...field}
        />
      )}
    </Field>
  );
}

function BankSubmit({ disabled }: { disabled: boolean }) {
  return (
    <Grid
      container
      spacing={2}
      direction="row"
      sx={{ justifyContent: "flex-start", alignItems: "flex-start" }}
    >
      <Grid>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          className={classes.submit}
          data-test="bankaccount-submit"
          disabled={disabled}
        >
          Save
        </Button>
      </Grid>
    </Grid>
  );
}

const BankAccountForm: React.FC<BankAccountFormProps> = ({
  userId,
  createBankAccount,
  onboarding,
}) => {
  const navigate = useNavigate();

  const initialValues: BankAccountPayload = {
    userId,
    bankName: "",
    accountNumber: "",
    routingNumber: "",
  };

  return (
    <StyledFormik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values, { setSubmitting }) => {
        setSubmitting(true);

        createBankAccount({ ...values, userId });

        if (!onboarding) {
          void navigate("/bankaccounts");
        }
      }}
    >
      {({ isValid, isSubmitting }) => (
        <Form className={classes.form} data-test="bankaccount-form">
          <BankField name="bankName" placeholder="Bank Name" />
          <BankField name="routingNumber" placeholder="Routing Number" />
          <BankField name="accountNumber" placeholder="Account Number" />
          <BankSubmit disabled={!isValid || isSubmitting} />
        </Form>
      )}
    </StyledFormik>
  );
};

export default BankAccountForm;
