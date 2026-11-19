import React from "react";
import { styled } from "@mui/material/styles";
import { Link as RouterLink, useNavigate } from "react-router";
import { Paper, Typography, Grid, Avatar, Box, Button } from "@mui/material";
import type { ActorRefFrom } from "xstate";
import type { createTransactionMachine } from "../machines/createTransactionMachine";
import { useSharedActor } from "../utils/useSharedActor";
import { formatAmount } from "../utils/transactionUtils";

const PREFIX = "TransactionCreateStepThree";

const classes = {
  paper: `${PREFIX}-paper`,
};

const StyledPaper = styled(Paper)(() => ({
  [`&.${classes.paper}`]: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
}));

export interface TransactionCreateStepThreeProps {
  createTransactionService: ActorRefFrom<typeof createTransactionMachine>;
}

type Receiver = { avatar?: string | undefined; firstName: string; lastName: string };
type Details = {
  transactionType?: string | undefined;
  amount?: string | number | undefined;
  description?: string;
};

function ReceiverBox({ receiver }: { receiver: Receiver }) {
  return (
    <Box
      style={{ paddingTop: "5%" }}
      sx={{
        display: "flex",
        justifyContent: "center",
        width: "95%",
        minHeight: 200,
        height: 200,
      }}
    >
      <Grid
        container
        direction="row"
        spacing={4}
        sx={{ justifyContent: "space-around", alignItems: "center" }}
      >
        <Grid>
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
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

function SummaryBox({ details }: { details: Details }) {
  return (
    <Box
      style={{ paddingBottom: "5%" }}
      sx={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        height: "100",
      }}
    >
      <Grid container direction="row" sx={{ justifyContent: "center", alignItems: "center" }}>
        <Grid>
          <Typography component="h2" variant="h6" color="primary" gutterBottom>
            {details.transactionType === "payment" ? "Paid " : "Requested "}
            {details.amount && formatAmount(Math.round(Number(details.amount) * 100))} for{" "}
            {details.description}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

function ActionsBox({ onCreateAnother }: { onCreateAnother: () => void }) {
  return (
    <Box
      style={{ paddingBottom: "5%" }}
      sx={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        height: "100",
      }}
    >
      <Grid container direction="row" sx={{ justifyContent: "space-around", alignItems: "center" }}>
        <Grid>
          <Button
            variant="contained"
            size="small"
            component={RouterLink}
            to="/"
            data-test="new-transaction-return-to-transactions"
          >
            Return To Transactions
          </Button>
        </Grid>
        <Grid>
          <Button
            variant="contained"
            size="small"
            onClick={onCreateAnother}
            data-test="new-transaction-create-another-transaction"
          >
            Create Another Transaction
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

const TransactionCreateStepThree: React.FC<TransactionCreateStepThreeProps> = ({
  createTransactionService,
}) => {
  const navigate = useNavigate();

  const [createTransactionState, sendCreateTransaction] = useSharedActor(createTransactionService);

  const receiver = createTransactionState.context.receiver;
  const transactionDetails = createTransactionState.context.transactionDetails;

  if (!receiver || !transactionDetails) return null;

  return (
    <StyledPaper className={classes.paper} elevation={0}>
      <ReceiverBox receiver={receiver} />
      <SummaryBox details={transactionDetails} />
      <ActionsBox
        onCreateAnother={() => {
          sendCreateTransaction({ type: "RESET" });
          void navigate("/transaction/new");
        }}
      />
    </StyledPaper>
  );
};

export default TransactionCreateStepThree;
