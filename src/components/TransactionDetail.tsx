import React from "react";
import { styled } from "@mui/material/styles";
import { Button, Typography, Grid, Avatar, Paper, IconButton } from "@mui/material";
import { AvatarGroup } from "@mui/material";
import { ThumbUpAltOutlined as LikeIcon, CommentRounded as CommentIcon } from "@mui/icons-material";
import type { TransactionResponseItem, User } from "../models";
import { TransactionRequestStatus } from "../models";
import CommentForm from "./CommentForm";
import {
  isPendingRequestTransaction,
  receiverIsCurrentUser,
  currentUserLikesTransaction,
} from "../utils/transactionUtils";
import CommentsList from "./CommentList";
import TransactionTitle from "./TransactionTitle";
import TransactionAmount from "./TransactionAmount";

const PREFIX = "TransactionDetail";

const classes = {
  paper: `${PREFIX}-paper`,
  paperComments: `${PREFIX}-paperComments`,
  avatar: `${PREFIX}-avatar`,
  headline: `${PREFIX}-headline`,
  avatarLarge: `${PREFIX}-avatarLarge`,
  avatarGroup: `${PREFIX}-avatarGroup`,
  redButton: `${PREFIX}-redButton`,
  greenButton: `${PREFIX}-greenButton`,
};

const StyledPaper = styled(Paper)(({ theme }) => ({
  [`&.${classes.paper}`]: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },

  [`& .${classes.paperComments}`]: {
    marginTop: theme.spacing(6),
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },

  [`& .${classes.avatar}`]: {
    width: theme.spacing(2),
  },

  [`& .${classes.headline}`]: {
    marginTop: theme.spacing(4),
  },

  [`& .${classes.avatarLarge}`]: {
    width: theme.spacing(7),
    height: theme.spacing(7),
  },

  [`& .${classes.avatarGroup}`]: {
    margin: 10,
  },

  [`& .${classes.redButton}`]: {
    backgrounColor: "red",
    color: "#ffffff",
    backgroundColor: "red",
    paddingTop: 5,
    paddingBottom: 5,
    paddingRight: 20,
    fontWeight: "bold",
    "&:hover": {
      backgroundColor: "red",
      borderColor: "red",
      boxShadow: "none",
    },
  },

  [`& .${classes.greenButton}`]: {
    marginRight: theme.spacing(2),
    color: "#ffffff",
    backgroundColor: "#00C853",
    paddingTop: 5,
    paddingBottom: 5,
    paddingRight: 20,
    fontWeight: "bold",
    "&:hover": {
      backgroundColor: "#4CAF50",
      borderColor: "#00C853",
      boxShadow: "none",
    },
  },
}));

type TransactionProps = {
  transaction: TransactionResponseItem;
  transactionLike: (id: string) => void;
  transactionComment: React.ComponentProps<typeof CommentForm>["transactionComment"];
  transactionUpdate: (payload: { id: string; requestStatus: TransactionRequestStatus }) => void;
  currentUser: User;
};

const TransactionDetail: React.FC<TransactionProps> = ({
  transaction,
  transactionLike,
  transactionComment,
  transactionUpdate,
  currentUser,
}) => {
  return (
    <StyledPaper className={classes.paper}>
      <Typography
        component="h2"
        variant="h6"
        color="primary"
        gutterBottom
        data-test="transaction-detail-header"
      >
        Transaction Detail
      </Typography>
      <Grid
        container
        direction="row"
        data-test={`transaction-item-${transaction.id}`}
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Grid className={classes.headline}>
          <Grid container direction="row">
            <AvatarGroup className={classes.avatarGroup} max={2}>
              <Avatar
                data-test="transaction-sender-avatar"
                className={classes.avatarLarge}
                src={transaction.senderAvatar}
              />
              <Avatar
                data-test="transaction-receiver-avatar"
                className={classes.avatarLarge}
                src={transaction.receiverAvatar}
              />
            </AvatarGroup>
            <Grid sx={{ width: "100%" }} />
          </Grid>
          <Grid
            container
            sx={{ justifyContent: "flex-start", alignItems: "flex-start", flexDirection: "column" }}
          >
            <Grid></Grid>
            <Grid>
              <TransactionTitle transaction={transaction} />
            </Grid>
            <Grid>
              <Typography
                variant="body2"
                color="textSecondary"
                gutterBottom
                data-test="transaction-description"
              >
                {transaction.description}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid>
          <TransactionAmount transaction={transaction} />
        </Grid>
      </Grid>
      <Grid
        container
        direction="row"
        spacing={2}
        sx={{ justifyContent: "flex-start", alignItems: "center" }}
      >
        <Grid>
          <Grid
            container
            direction="row"
            spacing={2}
            sx={{ justifyContent: "flex-start", alignItems: "center" }}
          >
            <Grid data-test={`transaction-like-count-${transaction.id}`}>
              {transaction.likes.length}{" "}
            </Grid>
            <Grid>
              <IconButton
                color="primary"
                disabled={currentUserLikesTransaction(currentUser, transaction)}
                onClick={() => {
                  transactionLike(transaction.id);
                }}
                data-test={`transaction-like-button-${transaction.id}`}
                aria-label="Like"
                size="large"
              >
                <LikeIcon />
              </IconButton>
            </Grid>
            <Grid>
              {receiverIsCurrentUser(currentUser, transaction) &&
                isPendingRequestTransaction(transaction) && (
                  <Grid>
                    <Button
                      className={classes.greenButton}
                      variant="contained"
                      size="small"
                      onClick={() => {
                        transactionUpdate({
                          id: transaction.id,
                          requestStatus: TransactionRequestStatus.accepted,
                        });
                      }}
                      data-test={`transaction-accept-request-${transaction.id}`}
                    >
                      Accept Request
                    </Button>
                    <Button
                      variant="contained"
                      className={classes.redButton}
                      size="small"
                      onClick={() => {
                        transactionUpdate({
                          id: transaction.id,
                          requestStatus: TransactionRequestStatus.rejected,
                        });
                      }}
                      data-test={`transaction-reject-request-${transaction.id}`}
                    >
                      Reject Request
                    </Button>
                  </Grid>
                )}
            </Grid>
          </Grid>
          <Grid>
            <CommentForm
              transactionId={transaction.id}
              transactionComment={(payload) => {
                transactionComment(payload);
              }}
            />
          </Grid>
        </Grid>
      </Grid>
      {transaction.comments.length > 0 && (
        <Paper className={classes.paperComments}>
          <Typography component="h2" variant="h6" color="primary" gutterBottom>
            <CommentIcon /> Comments
          </Typography>
          <CommentsList comments={transaction.comments} />
        </Paper>
      )}
    </StyledPaper>
  );
};

export default TransactionDetail;
