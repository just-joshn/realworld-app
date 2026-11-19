import React from "react";
import { Snackbar } from "@mui/material";
import type { ActorRefFrom } from "xstate";
import type { snackbarMachine } from "../machines/snackbarMachine";
import { useSharedActor } from "../utils/useSharedActor";
import { Alert } from "@mui/material";

interface Props {
  snackbarService: ActorRefFrom<typeof snackbarMachine>;
}

const AlertBar: React.FC<Props> = ({ snackbarService }) => {
  const [snackbarState] = useSharedActor(snackbarService);

  return (
    <Snackbar
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      open={snackbarState.matches("visible")}
      autoHideDuration={3000}
    >
      <Alert
        data-test={`alert-bar-${snackbarState.context.severity ?? "success"}`}
        elevation={6}
        variant="filled"
        severity={snackbarState.context.severity ?? "success"}
      >
        {snackbarState.context.message}
      </Alert>
    </Snackbar>
  );
};

export default AlertBar;
