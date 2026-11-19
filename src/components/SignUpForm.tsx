import React from "react";
import { styled } from "@mui/material/styles";
import { useSharedActor } from "../utils/useSharedActor";
import type { ActorRefFrom } from "xstate";
import { Link } from "react-router-dom";
import { Button, Container, CssBaseline, TextField, Grid, Box, Typography } from "@mui/material";
import type { FieldProps } from "formik";
import { Formik, Form, Field } from "formik";
import { string, object, ref } from "yup";

import RWALogo from "./SvgRwaLogo";
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
  (props: React.ComponentProps<typeof Container> & { component?: React.ElementType }) => (
    <Container {...props} />
  )
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

const SignUpForm: React.FC<Props> = ({ authService }) => {
  const [, sendAuth] = useSharedActor(authService);
  const initialValues: SignUpPayload & { confirmPassword: string } = {
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    confirmPassword: "",
  };

  const signUpPending = (payload: SignUpPayload) => {
    sendAuth({ type: "SIGNUP", ...payload });
  };

  return (
    <StyledContainer component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <div>
          <RWALogo className={classes.logo} />
        </div>
        <Typography component="h1" variant="h5" data-test="signup-title">
          Sign Up
        </Typography>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={(values, { setSubmitting }) => {
            setSubmitting(true);

            signUpPending(values);
          }}
        >
          {({ isValid, isSubmitting }) => (
            <Form className={classes.form}>
              <Field name="firstName">
                {({ field, meta: { error, value, initialValue, touched } }: FieldProps) => (
                  <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    id="firstName"
                    label="First Name"
                    type="text"
                    autoFocus
                    data-test="signup-first-name"
                    error={(touched || value !== initialValue) && Boolean(error)}
                    // reserve the helper line so a validation message doesn't shift the link below
                    helperText={((touched || value !== initialValue) && error) || " "}
                    {...field}
                  />
                )}
              </Field>
              <Field name="lastName">
                {({ field, meta: { error, value, initialValue, touched } }: FieldProps) => (
                  <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    id="lastName"
                    label="Last Name"
                    type="text"
                    data-test="signup-last-name"
                    error={(touched || value !== initialValue) && Boolean(error)}
                    helperText={((touched || value !== initialValue) && error) || " "}
                    {...field}
                  />
                )}
              </Field>
              <Field name="username">
                {({ field, meta: { error, value, initialValue, touched } }: FieldProps) => (
                  <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    id="username"
                    label="Username"
                    type="text"
                    data-test="signup-username"
                    error={(touched || value !== initialValue) && Boolean(error)}
                    helperText={((touched || value !== initialValue) && error) || " "}
                    {...field}
                  />
                )}
              </Field>
              <Field name="password">
                {({ field, meta: { error, value, initialValue, touched } }: FieldProps) => (
                  <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="Password"
                    type="password"
                    id="password"
                    data-test="signup-password"
                    error={(touched || value !== initialValue) && Boolean(error)}
                    helperText={((touched || value !== initialValue) && error) || " "}
                    {...field}
                  />
                )}
              </Field>
              <Field name="confirmPassword">
                {({ field, meta: { error, value, initialValue, touched } }: FieldProps) => (
                  <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="Confirm Password"
                    id="confirmPassword"
                    data-test="signup-confirmPassword"
                    type="password"
                    error={(touched || value !== initialValue) && Boolean(error)}
                    helperText={((touched || value !== initialValue) && error) || " "}
                    {...field}
                  />
                )}
              </Field>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                className={classes.submit}
                data-test="signup-submit"
                disabled={!isValid || isSubmitting}
              >
                Sign Up
              </Button>
              <Grid container>
                <Grid>
                  <Link to="/signin">{"Have an account? Sign In"}</Link>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </div>
      <Box sx={{ mt: 8 }}>
        <Footer />
      </Box>
    </StyledContainer>
  );
};

export default SignUpForm;
