import React from "react";
import { styled } from "@mui/material/styles";
import { useSharedActor } from "../utils/useSharedActor";
import type { ActorRefFrom } from "xstate";
import { Link } from "react-router";
import { Button, Container, CssBaseline, TextField, Grid, Box, Typography } from "@mui/material";
import type { FieldProps } from "formik";
import { Formik, Form, Field } from "formik";
import { string, object, ref } from "yup";

import rwaLogo from "../svgs/rwa-logo.svg";
import Footer from "./Footer";
import type { SignUpPayload } from "../models";
import type { authMachine } from "../machines/authMachine";

const PREFIX = "SignUpForm";

const classes = {
  paper: `${PREFIX}-paper`,
  logo: `${PREFIX}-logo`,
  form: `${PREFIX}-form`,
  submit: `${PREFIX}-submit`,
};

const StyledContainer = styled(
  (
    props: React.ComponentProps<typeof Container> & {
      component?: React.ElementType;
    }
  ) => <Container {...props} />
)(({ theme }) => ({
  [`& .${classes.paper}`]: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  [`& .${classes.logo}`]: {
    color: theme.palette.primary.main,
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
  firstName: string().required("First Name is required"),
  lastName: string().required("Last Name is required"),
  username: string().required("Username is required"),
  password: string()
    .min(4, "Password must contain at least 4 characters")
    .required("Enter your password"),
  confirmPassword: string()
    .required("Confirm your password")
    .oneOf([ref("password")], "Password does not match"),
});

export interface Props {
  authService: ActorRefFrom<typeof authMachine>;
}

type SignUpFieldConfig = {
  name: string;
  label: string;
  type: "text" | "password";
  dataTest: string;
  autoFocus?: boolean;
};

const SIGN_UP_FIELDS: ReadonlyArray<SignUpFieldConfig> = [
  {
    name: "firstName",
    label: "First Name",
    type: "text",
    dataTest: "signup-first-name",
    autoFocus: true,
  },
  {
    name: "lastName",
    label: "Last Name",
    type: "text",
    dataTest: "signup-last-name",
  },
  {
    name: "username",
    label: "Username",
    type: "text",
    dataTest: "signup-username",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    dataTest: "signup-password",
  },
  {
    name: "confirmPassword",
    label: "Confirm Password",
    type: "password",
    dataTest: "signup-confirmPassword",
  },
];

const SignUpField: React.FC<SignUpFieldConfig> = ({ name, label, type, dataTest, autoFocus }) => (
  <Field name={name}>
    {({ field, meta: { error, value, initialValue, touched } }: FieldProps) => (
      <TextField
        variant="outlined"
        margin="normal"
        required
        fullWidth
        id={name}
        label={label}
        type={type}
        autoFocus={autoFocus}
        data-test={dataTest}
        error={(touched || value !== initialValue) && Boolean(error)}
        // reserve the helper line so a validation message doesn't shift the link below
        helperText={((touched || value !== initialValue) && error) || " "}
        {...field}
      />
    )}
  </Field>
);

type SignUpValues = SignUpPayload & { confirmPassword: string };

const SignUpFields: React.FC<{ disabled: boolean }> = ({ disabled }) => (
  <Form className={classes.form}>
    {SIGN_UP_FIELDS.map((fieldConfig) => (
      <SignUpField key={fieldConfig.name} {...fieldConfig} />
    ))}
    <Button
      type="submit"
      fullWidth
      variant="contained"
      color="primary"
      className={classes.submit}
      data-test="signup-submit"
      disabled={disabled}
    >
      Sign Up
    </Button>
    <Grid container>
      <Grid>
        <Link to="/signin">{"Have an account? Sign In"}</Link>
      </Grid>
    </Grid>
  </Form>
);

const SignUpView: React.FC<{
  initialValues: SignUpValues;
  onSubmit: (values: SignUpValues) => void;
}> = ({ initialValues, onSubmit }) => (
  <StyledContainer component="main" maxWidth="xs">
    <CssBaseline />
    <div className={classes.paper}>
      <div>
        <img src={rwaLogo} alt="" className={classes.logo} />
      </div>
      <Typography component="h1" variant="h5" data-test="signup-title">
        Sign Up
      </Typography>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(values, { setSubmitting }) => {
          setSubmitting(true);
          onSubmit(values);
        }}
      >
        {({ isValid, isSubmitting }) => <SignUpFields disabled={!isValid || isSubmitting} />}
      </Formik>
    </div>
    <Box sx={{ mt: 8 }}>
      <Footer />
    </Box>
  </StyledContainer>
);

const SignUpForm: React.FC<Props> = ({ authService }) => {
  const [, sendAuth] = useSharedActor(authService);
  const initialValues: SignUpValues = {
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    confirmPassword: "",
  };

  return (
    <SignUpView
      initialValues={initialValues}
      onSubmit={(values) => {
        sendAuth({ type: "SIGNUP", ...values });
      }}
    />
  );
};

export default SignUpForm;
