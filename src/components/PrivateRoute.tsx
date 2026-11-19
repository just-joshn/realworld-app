import React from "react";
import { Navigate, useLocation } from "react-router";

interface IPrivateRouteProps {
  isLoggedIn: boolean;
  children: React.ReactNode;
}

function PrivateRoute({ isLoggedIn, children }: IPrivateRouteProps) {
  const location = useLocation();

  return isLoggedIn ? children : <Navigate to="/signin" state={{ from: location }} replace />;
}

export default PrivateRoute;
