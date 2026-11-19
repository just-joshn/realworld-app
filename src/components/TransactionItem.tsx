import React from "react";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router";
import type { Theme } from "@mui/material";
import { ListItem, Typography, Grid, Avatar, ListItemAvatar, Paper, Badge } from "@mui/material";
import { ThumbUpAltOutlined as LikeIcon, CommentRounded as CommentIcon } from "@mui/icons-material";
import type { TransactionResponseItem } from "../models";
import TransactionTitle from "./TransactionTitle";
import TransactionAmount from "./TransactionAmount";

const PREFIX = "TransactionItem";

const classes = {
  root: `${PREFIX}-root`,
  paper: `${PREFIX}-paper`,
  avatar: `${PREFIX}-avatar`,
  socialStats: `${PREFIX}-socialStats`,
  countIcons: `${PREFIX}-countIcons`,
  countText: `${PREFIX}-countText`,
};

const StyledListItem = styled(ListItem)(({ theme }) => ({
  [`& .${classes.root}`]: {
    flexGrow: 1,
  },

  [`& .${classes.paper}`]: {
    padding: theme.spacing(0),
    margin: "auto",
    width: "100%",
  },

  [`& .${classes.avatar}`]: {
    width: theme.spacing(2),
  },

  [`& .${classes.socialStats}`]: {
    [theme.breakpoints.down("md")]: {
      marginTop: theme.spacing(2),
    },
  },

  [`& .${classes.countIcons}`]: {
    color: theme.palette.grey[400],
  },

  [`& .${classes.countText}`]: {
    color: theme.palette.grey[400],
    marginTop: 2,
    height: theme.spacing(2),
    width: theme.spacing(2),
  },
}));

type TransactionProps = {
  transaction: TransactionResponseItem;
};

const SmallAvatar = styled(Avatar)(({ theme }: { theme: Theme }) => {
  return {
    width: 22,
    height: 22,
    border: `2px solid ${theme.palette.background.paper}`,
  };
});

const ItemAvatars: React.FC<TransactionProps> = ({ transaction }) => (
  <ListItemAvatar>
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      badgeContent={
        <SmallAvatar src={transaction.receiverAvatar} classes={{ root: classes.root }} />
      }
    >
      <Avatar src={transaction.senderAvatar} />
    </Badge>
  </ListItemAvatar>
);

const SocialStats: React.FC<TransactionProps> = ({ transaction }) => (
  <Grid
    container
    direction="row"
    spacing={1}
    className={classes.socialStats}
    sx={{ justifyContent: "flex-start", alignItems: "flex-start" }}
  >
    <Grid>
      <LikeIcon className={classes.countIcons} />
    </Grid>
    <Grid>
      <Typography data-test="transaction-like-count" className={classes.countText}>
        {transaction.likes.length}
      </Typography>
    </Grid>
    <Grid>
      <CommentIcon className={classes.countIcons} />
    </Grid>
    <Grid>
      <Typography data-test="transaction-comment-count" className={classes.countText}>
        {transaction.comments.length}
      </Typography>
    </Grid>
  </Grid>
);

const TransactionItem: React.FC<TransactionProps> = ({ transaction }) => {
  const navigate = useNavigate();

  const showTransactionDetail = (transactionId: string) => {
    void navigate(`/transaction/${transactionId}`);
  };

  return (
    <StyledListItem
      data-test={`transaction-item-${transaction.id}`}
      alignItems="flex-start"
      onClick={() => {
        showTransactionDetail(transaction.id);
      }}
    >
      <Paper className={classes.paper} elevation={0}>
        <Grid container spacing={2}>
          <Grid>
            <ItemAvatars transaction={transaction} />
          </Grid>
          <Grid container size={{ xs: 12, sm: "grow" }}>
            <Grid container spacing={2} size={{ xs: "grow" }} sx={{ flexDirection: "column" }}>
              <Grid size={{ xs: "grow" }}>
                <TransactionTitle transaction={transaction} />
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {transaction.description}
                </Typography>
                <SocialStats transaction={transaction} />
              </Grid>
            </Grid>
            <Grid>
              <TransactionAmount transaction={transaction} />
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </StyledListItem>
  );
};

export default TransactionItem;
