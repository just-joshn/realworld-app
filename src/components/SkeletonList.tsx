import React from "react";
import { styled } from "@mui/material/styles";
import { Skeleton } from "@mui/material";
const PREFIX = "ListSkeleton";

const classes = {
  root: `${PREFIX}-root`,
};

const Root = styled("div")(({ theme }) => ({
  [`&.${classes.root}`]: {
    minHeight: "100vh",
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    width: "95%",
  },
}));

const SKELETON_GROUPS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const ListSkeleton = () => {
  return (
    <Root className={classes.root} data-test="list-skeleton">
      <br />
      {SKELETON_GROUPS.map((group) => (
        <React.Fragment key={group}>
          {group > 0 && (
            <>
              <br />
              <br />
            </>
          )}
          <Skeleton />
          <Skeleton animation={false} />
          <Skeleton animation="wave" />
        </React.Fragment>
      ))}
    </Root>
  );
};

export default ListSkeleton;
