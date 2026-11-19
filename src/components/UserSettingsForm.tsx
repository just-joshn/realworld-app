import React from "react";
import { styled } from "@mui/material/styles";
import { TextField, Button, Grid } from "@mui/material";
import type { FieldProps } from "formik";
import { Formik, Form, Field } from "formik";
import { string, object, mixed } from "yup";
import type { User, UserSettingsPayload } from "../models";
import { DefaultPrivacyLevel } from "../models";

const PREFIX = "UserSettingsForm";

const classes = {
  paper: `${PREFIX}-paper`,
  form: `${PREFIX}-form`,
};

const StyledFormik = styled(Formik<UserSettingsPayload>)(({ theme }) => ({
  [`& .${classes.paper}`]: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
}));

const MarginHonoringDiv = styled("div")(({ theme }) => ({
  width: "100%",
  marginTop: theme.spacing(1),
}));

const phoneRegExp =
  /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;

const DefaultPrivacyLevelValues = Object.values(DefaultPrivacyLevel);

const validationSchema = object({
  firstName: string().required("Enter a first name"),
  lastName: string().required("Enter a last name"),
  email: string().email("Must contain a valid email address").required("Enter an email address"),
  phoneNumber: string()
    .matches(phoneRegExp, "Phone number is not valid")
    .required("Enter a phone number"),
  defaultPrivacyLevel: mixed<DefaultPrivacyLevel>().oneOf(DefaultPrivacyLevelValues),
});

export interface UserSettingsProps {
  userProfile: User;
  updateUser: (payload: UserSettingsPayload & { id: User["id"] }) => void;
}

function SettingsField({ name, placeholder }: { name: string; placeholder: string }) {
  return (
    <Field name={name}>
      {({ field, meta: { error, value, initialValue, touched } }: FieldProps) => (
        <TextField
          variant="outlined"
          margin="dense"
          fullWidth
          required
          id={`user-settings-${name}-input`}
          type="text"
          placeholder={placeholder}
          slotProps={{ htmlInput: { "data-test": `user-settings-${name}-input` } }}
          error={(touched || value !== initialValue) && Boolean(error)}
          helperText={touched || value !== initialValue ? error : ""}
          {...field}
        />
      )}
    </Field>
  );
}

function SettingsSubmit({ disabled }: { disabled: boolean }) {
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
          sx={{ marginTop: 3, marginLeft: 0, marginBottom: 2 }}
          data-test="user-settings-submit"
          disabled={disabled}
        >
          Save
        </Button>
      </Grid>
    </Grid>
  );
}

const UserSettingsForm: React.FC<UserSettingsProps> = ({ userProfile, updateUser }) => {
  const initialValues: UserSettingsPayload = {
    firstName: userProfile.firstName,
    lastName: userProfile.lastName,
    email: userProfile.email,
    phoneNumber: userProfile.phoneNumber,
    defaultPrivacyLevel: userProfile.defaultPrivacyLevel,
  };

  return (
    <StyledFormik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values, { setSubmitting }) => {
        setSubmitting(true);
        updateUser({ id: userProfile.id, ...values });
        setSubmitting(false);
      }}
    >
      {({ isValid, isSubmitting }) => (
        <MarginHonoringDiv>
          <Form data-test="user-settings-form">
            <SettingsField name="firstName" placeholder="First Name" />
            <SettingsField name="lastName" placeholder="Last Name" />
            <SettingsField name="email" placeholder="Email" />
            <SettingsField name="phoneNumber" placeholder="Phone Number" />
            <SettingsSubmit disabled={!isValid || isSubmitting} />
          </Form>
        </MarginHonoringDiv>
      )}
    </StyledFormik>
  );
};

export default UserSettingsForm;
