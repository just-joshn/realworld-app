import React from "react";
import type { RouteProps } from "react-router-dom";
import { Route, Redirect } from "react-router-dom";

interface IPrivateRouteProps extends Omit<RouteProps, "children" | "render"> {
  isLoggedIn: boolean;
  children: React.ReactNode;
}

function PrivateRoute({ isLoggedIn, children, ...rest }: IPrivateRouteProps) {
  return (
    <Route
      {...rest}
      render={({ location }) =>
        isLoggedIn ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: "/signin",
              state: { from: location },
            }}
          />
        )
      }
    />
  );
}

export default PrivateRoute;
