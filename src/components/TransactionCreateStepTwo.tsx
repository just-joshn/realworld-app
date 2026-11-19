import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import { NumericFormat } from "react-number-format";
import type { FieldProps } from "formik";
import { Formik, Form, Field } from "formik";
import { string, object, number } from "yup";
import {
  Paper,
  Typography,
  Button,
  Grid,
  Container,
  Avatar,
  Box,
  TextField,
} from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import type { User } from "../models";
import type { SnackbarContext } from "../machines/snackbarMachine";
import { Severities } from "../machines/snackbarMachine";

const PREFIX = "TransactionCreateStepTwo";

const classes = {
  paper: `${PREFIX}-paper`,
  form: `${PREFIX}-form`,
  submit: `${PREFIX}-submit`,
};

const StyledPaper = styled(Paper)(({ theme }) => ({
  [`&.${classes.paper}`]: {
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

const validationSchema = object({
  amount: number().required("Please enter a valid amount"),
  description: string().required("Please enter a note"),
  senderId: string(),
  receiverId: string(),
});

// Formik types field values as `any`; the amount field only ever holds what the input produced.
const amountFieldValue = (value: unknown): string | number =>
  typeof value === "string" || typeof value === "number" ? value : "";

export interface TransactionCreateStepTwoProps {
  receiver: User;
  sender: User;
  createTransaction: (
    payload: FormValues & { transactionType: string | undefined },
  ) => void;
  showSnackbar: (payload: SnackbarContext) => void;
}

interface FormValues {
  amount: number | "";
  description: string;
  senderId: string;
  receiverId: string;
}

const ReceiverHeader: React.FC<{
  receiver: User;
  transactionType: string | undefined;
}> = ({ receiver, transactionType }) => (
  <Box
    sx={{
      display: "flex",
      height: 200,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Grid
      container
      sx={{
        justifyContent: "flex-start",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <Grid>
        <Avatar src={receiver.avatar} />
      </Grid>
      <Grid>
        <Typography component="h2" variant="h6" color="primary" gutterBottom>
          {receiver.firstName} {receiver.lastName}
          {transactionType}
        </Typography>
      </Grid>
    </Grid>
  </Box>
);

const AmountField = () => (
  <Field name="amount">
    {({
      field,
      form,
      meta: { error, value, initialValue, touched },
    }: FieldProps) => (
      <NumericFormat<TextFieldProps>
        customInput={TextField}
        variant="outlined"
        margin="dense"
        fullWidth
        required
        autoFocus
        id={"transaction-create-amount-input"}
        type="text"
        placeholder="Amount"
        data-test={"transaction-create-amount-input"}
        error={(touched || value !== initialValue) && Boolean(error)}
        helperText={touched || value !== initialValue ? error : ""}
        slotProps={{ htmlInput: { id: "amount" } }}
        name={field.name}
        value={amountFieldValue(field.value)}
        onBlur={field.onBlur}
        onValueChange={(values) => {
          void form.setFieldValue(field.name, values.value);
        }}
        thousandSeparator
        valueIsNumericString
        prefix="$"
      />
    )}
  </Field>
);

const DescriptionField = () => (
  <Field name="description">
    {({ field, meta: { error, value, initialValue, touched } }: FieldProps) => (
      <TextField
        variant="outlined"
        margin="dense"
        fullWidth
        required
        id={"transaction-create-description-input"}
        type="text"
        placeholder="Add a note"
        data-test={"transaction-create-description-input"}
        error={(touched || value !== initialValue) && Boolean(error)}
        helperText={touched || value !== initialValue ? error : ""}
        {...field}
      />
    )}
  </Field>
);

const SUBMIT_ACTIONS = [
  {
    type: "request",
    dataTest: "transaction-create-submit-request",
    label: "Request",
  },
  {
    type: "payment",
    dataTest: "transaction-create-submit-payment",
    label: "Pay",
  },
];

const SubmitButtons: React.FC<{
  disabled: boolean;
  onSelectType: (type: string) => void;
}> = ({ disabled, onSelectType }) => (
  <Grid
    container
    spacing={2}
    direction="row"
    sx={{ justifyContent: "center", alignItems: "center" }}
  >
    {SUBMIT_ACTIONS.map(({ type, dataTest, label }) => (
      <Grid key={type}>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          className={classes.submit}
          data-test={dataTest}
          disabled={disabled}
          onClick={() => {
            onSelectType(type);
          }}
        >
          {label}
        </Button>
      </Grid>
    ))}
  </Grid>
);

const CreateStepTwoForm: React.FC<{
  initialValues: FormValues;
  onSelectType: (type: string) => void;
  onSubmit: (values: FormValues) => void;
}> = ({ initialValues, onSelectType, onSubmit }) => (
  <Formik
    initialValues={initialValues}
    validationSchema={validationSchema}
    validateOnMount={true}
    onSubmit={(values, { setSubmitting }) => {
      setSubmitting(true);
      onSubmit(values);
    }}
  >
    {({ isValid, isSubmitting }) => (
      <Form className={classes.form} data-test="transaction-create-form">
        <AmountField />
        <DescriptionField />
        <SubmitButtons
          disabled={!isValid || isSubmitting}
          onSelectType={onSelectType}
        />
      </Form>
    )}
  </Formik>
);

const TransactionCreateStepTwo: React.FC<TransactionCreateStepTwoProps> = ({
  receiver,
  sender,
  createTransaction,
  showSnackbar,
}) => {
  const [transactionType, setTransactionType] = useState<string>();
  const initialValues: FormValues = {
    amount: "",
    description: "",
    senderId: sender.id,
    receiverId: receiver.id,
  };

  return (
    <StyledPaper className={classes.paper} elevation={0}>
      <ReceiverHeader receiver={receiver} transactionType={transactionType} />
      <Container maxWidth="xs">
        <CreateStepTwoForm
          initialValues={initialValues}
          onSelectType={setTransactionType}
          onSubmit={(values) => {
            setTransactionType(undefined);
            createTransaction({ transactionType, ...values });
            showSnackbar({
              severity: Severities.success,
              message: "Transaction Submitted!",
            });
          }}
        />
      </Container>
    </StyledPaper>
  );
};

export default TransactionCreateStepTwo;
