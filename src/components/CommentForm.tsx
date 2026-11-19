import React from "react";
import { styled } from "@mui/material/styles";
import { TextField } from "@mui/material";
import type { FieldProps } from "formik";
import { Formik, Form, Field } from "formik";
import { string, object } from "yup";
import type { Comment } from "../models";

const validationSchema = object({
  content: string(),
});

const PREFIX = "CommentForm";

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

export interface CommentFormProps {
  transactionId: string;
  transactionComment: (payload: Pick<Comment, "transactionId" | "content">) => void;
}

const CommentField: React.FC<{ transactionId: string }> = ({ transactionId }) => (
  <Field name="content">
    {({ field, meta }: FieldProps) => (
      <TextField
        variant="outlined"
        margin="dense"
        fullWidth
        id={`transaction-comment-input-${transactionId}`}
        type="text"
        placeholder="Write a comment..."
        slotProps={{
          htmlInput: {
            "data-test": `transaction-comment-input-${transactionId}`,
          },
        }}
        error={meta.touched && Boolean(meta.error)}
        helperText={meta.touched ? meta.error : ""}
        {...field}
      />
    )}
  </Field>
);

const CommentForm: React.FC<CommentFormProps> = ({ transactionId, transactionComment }) => {
  const initialValues = { content: "" };

  return (
    <Root>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(values, { setSubmitting }) => {
          setSubmitting(true);
          transactionComment({ transactionId, ...values });
        }}
      >
        {() => (
          <Form className={classes.form}>
            <CommentField transactionId={transactionId} />
          </Form>
        )}
      </Formik>
    </Root>
  );
};

export default CommentForm;
