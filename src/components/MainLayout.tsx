import React, { useEffect } from "react";
import { styled } from "@mui/material/styles";
import { useMachine } from "@xstate/react";
import type { ActorRefFrom } from "xstate";
import { Container, Grid, useMediaQuery, useTheme } from "@mui/material";

import Footer from "./Footer";
import NavBar from "./NavBar";
import NavDrawer from "./NavDrawer";
import type { notificationsMachine } from "../machines/notificationsMachine";
import type { authMachine } from "../machines/authMachine";
import { drawerMachine } from "../machines/drawerMachine";

const PREFIX = "MainLayout";

const classes = {
  toolbar: `${PREFIX}-toolbar`,
  appBarSpacer: `${PREFIX}-appBarSpacer`,
  content: `${PREFIX}-content`,
  container: `${PREFIX}-container`,
};
const Root = styled("div")(({ theme }) => ({
  [`&`]: { display: "flex", flexGrow: 1 },

  [`& .${classes.toolbar}`]: {
    paddingRight: 24,
  },

  [`& .${classes.appBarSpacer}`]: {
    minHeight: theme.spacing(13),
    [theme.breakpoints.up("sm")]: {
      minHeight: theme.spacing(14),
    },
  },

  [`& .${classes.content}`]: {
    flexGrow: 1,
    height: "100vh",
    overflow: "auto",
  },

  [`& .${classes.container}`]: {
    minHeight: "77vh",
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    [theme.breakpoints.up("sm")]: {
      paddingTop: theme.spacing(4),
      padding: theme.spacing(4),
    },
  },
}));

interface Props {
  children: React.ReactNode;
  authService: ActorRefFrom<typeof authMachine>;
  notificationsService: ActorRefFrom<typeof notificationsMachine>;
}

function useDrawer() {
  const theme = useTheme();
  const [drawerState, sendDrawer] = useMachine(drawerMachine);

  const aboveSmallBreakpoint = useMediaQuery(theme.breakpoints.up("sm"));
  const xsBreakpoint = useMediaQuery(theme.breakpoints.only("xs"));

  const desktopDrawerOpen = drawerState.matches({ desktop: "open" });
  const mobileDrawerOpen = drawerState.matches({ mobile: "open" });

  useEffect(() => {
    if (!desktopDrawerOpen && aboveSmallBreakpoint) {
      sendDrawer({ type: "OPEN_DESKTOP", aboveSmallBreakpoint });
    }
  }, [aboveSmallBreakpoint, desktopDrawerOpen, sendDrawer]);

  return {
    drawerOpen: xsBreakpoint ? mobileDrawerOpen : desktopDrawerOpen,
    toggleDrawer: () => {
      sendDrawer({ type: xsBreakpoint ? "TOGGLE_MOBILE" : "TOGGLE_DESKTOP" });
    },
    closeMobileDrawer: () => {
      sendDrawer({ type: "CLOSE_MOBILE" });
    },
  };
}

const MainLayout: React.FC<Props> = ({ children, notificationsService, authService }) => {
  const { drawerOpen, toggleDrawer, closeMobileDrawer } = useDrawer();

  return (
    <Root>
      <NavBar
        toggleDrawer={toggleDrawer}
        drawerOpen={drawerOpen}
        notificationsService={notificationsService}
      />
      <NavDrawer
        toggleDrawer={toggleDrawer}
        drawerOpen={drawerOpen}
        closeMobileDrawer={closeMobileDrawer}
        authService={authService}
      />
      <main className={classes.content} data-test="main">
        <div className={classes.appBarSpacer} />
        <Container maxWidth="md" className={classes.container}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>{children}</Grid>
          </Grid>
        </Container>
        <footer>
          <Footer />
        </footer>
      </main>
    </Root>
  );
};

export default MainLayout;
