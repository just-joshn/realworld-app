import { useEffect } from "react";
import { useOktaAuth } from "@okta/okta-react";
import { toRelativeUrl } from "@okta/okta-auth-js";

// okta-react's own SecureRoute only supports react-router 5, so this sends signed-out visitors to Okta.
function SecureRoute() {
  const { authState, oktaAuth } = useOktaAuth();

  useEffect(() => {
    if (authState && !authState.isAuthenticated) {
      oktaAuth.setOriginalUri(toRelativeUrl(window.location.href, window.location.origin));
      void oktaAuth.signInWithRedirect();
    }
  }, [authState, oktaAuth]);

  return null;
}

export default SecureRoute;
