import { Machine, assign, interpret, State } from "xstate";
import { omit } from "lodash/fp";
import { httpClient } from "../utils/asyncUtils";
import { history } from "../utils/historyUtils";
import { User } from "../models";
import { getAuthTokenName } from "../utils/asyncUtils";
import { backendPort } from "../utils/portUtils";

export interface AuthMachineSchema {
  states: {
    unauthorized: Record<string, never>;
    signup: Record<string, never>;
    loading: Record<string, never>;
    updating: Record<string, never>;
    logout: Record<string, never>;
    refreshing: Record<string, never>;
    google: Record<string, never>;
    authorized: Record<string, never>;
    auth0: Record<string, never>;
    cognito: Record<string, never>;
    okta: Record<string, never>;
  };
}

export type AuthMachineEvents =
  | { type: "LOGIN" }
  | { type: "LOGOUT" }
  | ({ type: "UPDATE" } & Partial<User>)
  | { type: "REFRESH" }
  | ({ type: "AUTH0" } & {
      user: { sub: string; email: string; nickname: string; picture: string };
      token: string;
    })
  | ({ type: "COGNITO" } & { userSub: string; email: string; accessTokenJwtString: string })
  | ({ type: "OKTA" } & {
      user: {
        sub: string;
        email: string;
        given_name: string;
        family_name: string;
        preferred_username: string;
      };
      token: string;
    })
  | ({ type: "GOOGLE" } & {
      user: {
        googleId: string;
        email: string;
        givenName: string;
        familyName: string;
        imageUrl: string;
      };
      token: string;
    })
  | { type: "SIGNUP" }
  | {
      type: `done.invoke.${string}` | `error.platform.${string}`;
      data: { user?: User; message?: string };
    };

export interface AuthMachineContext {
  user?: User;
  message?: string;
}

export const authMachine = Machine<AuthMachineContext, AuthMachineSchema, AuthMachineEvents>(
  {
    id: "authentication",
    initial: "unauthorized",
    context: {
      user: undefined,
      message: undefined,
    },
    states: {
      unauthorized: {
        entry: "resetUser",
        on: {
          LOGIN: "loading",
          SIGNUP: "signup",
          GOOGLE: "google",
          AUTH0: "auth0",
          OKTA: "okta",
          COGNITO: "cognito",
        },
      },
      signup: {
        invoke: {
          src: "performSignup",
          onDone: { target: "unauthorized", actions: "onSuccess" },
          onError: { target: "unauthorized", actions: "onError" },
        },
      },
      loading: {
        invoke: {
          src: "performLogin",
          onDone: { target: "authorized", actions: "onSuccess" },
          onError: { target: "unauthorized", actions: "onError" },
        },
      },
      updating: {
        invoke: {
          src: "updateProfile",
          onDone: { target: "refreshing" },
          onError: { target: "unauthorized", actions: "onError" },
        },
      },
      refreshing: {
        invoke: {
          src: "getUserProfile",
          onDone: { target: "authorized", actions: "setUserProfile" },
          onError: { target: "unauthorized", actions: "onError" },
        },
        on: {
          LOGOUT: "logout",
        },
      },
      google: {
        invoke: {
          src: "getGoogleUserProfile",
          onDone: { target: "authorized", actions: "setUserProfile" },
          onError: { target: "unauthorized", actions: "onError" },
        },
        on: {
          LOGOUT: "logout",
        },
      },
      logout: {
        invoke: {
          src: "performLogout",
          onDone: { target: "unauthorized" },
          onError: { target: "unauthorized", actions: "onError" },
        },
      },
      authorized: {
        entry: "redirectHomeAfterLogin",
        on: {
          UPDATE: "updating",
          REFRESH: "refreshing",
          LOGOUT: "logout",
        },
      },
      auth0: {
        invoke: {
          src: "getAuth0UserProfile",
          onDone: { target: "authorized", actions: "setUserProfile" },
          onError: { target: "unauthorized", actions: "onError" },
        },
        on: {
          LOGOUT: "logout",
        },
      },
      okta: {
        invoke: {
          src: "getOktaUserProfile",
          onDone: { target: "authorized", actions: "setUserProfile" },
          onError: { target: "unauthorized", actions: "onError" },
        },
        on: {
          LOGOUT: "logout",
        },
      },
      cognito: {
        invoke: {
          src: "getCognitoUserProfile",
          onDone: { target: "authorized", actions: "setUserProfile" },
          onError: { target: "unauthorized", actions: "onError" },
        },
        on: {
          LOGOUT: "logout",
        },
      },
    },
  },
  {
    services: {
      performSignup: async (ctx, event) => {
        const payload = omit("type", event);
        const resp = await httpClient.post(`http://localhost:${backendPort}/users`, payload);
        history.push("/signin");
        return resp.data;
      },
      performLogin: async (ctx, event) => {
        return await httpClient
          .post(`http://localhost:${backendPort}/login`, event)
          .then(({ data }) => {
            history.push("/");
            return data;
          })
          .catch(() => {
            throw new Error("Username or password is invalid");
          });
      },
      getOktaUserProfile: /* istanbul ignore next */ (ctx, event: AuthMachineEvents) => {
        if (event.type !== "OKTA") throw new Error("Expected OKTA event");
        // Map Okta User fields to our User Model
        const user = {
          id: event.user.sub,
          email: event.user.email,
          firstName: event.user.given_name,
          lastName: event.user.family_name,
          username: event.user.preferred_username,
        };

        // Set Access Token in Local Storage for API calls
        localStorage.setItem(getAuthTokenName(), event.token);

        return Promise.resolve({ user });
      },
      getUserProfile: async () => {
        const resp = await httpClient.get(`http://localhost:${backendPort}/checkAuth`);
        return resp.data;
      },
      getGoogleUserProfile: /* istanbul ignore next */ (ctx, event: AuthMachineEvents) => {
        if (event.type !== "GOOGLE") throw new Error("Expected GOOGLE event");
        // Map Google User fields to our User Model
        const user = {
          id: event.user.googleId,
          email: event.user.email,
          firstName: event.user.givenName,
          lastName: event.user.familyName,
          avatar: event.user.imageUrl,
        };

        // Set Google Access Token in Local Storage for API calls
        localStorage.setItem(getAuthTokenName(), event.token);

        return Promise.resolve({ user });
      },
      getAuth0UserProfile: /* istanbul ignore next */ (ctx, event: AuthMachineEvents) => {
        if (event.type !== "AUTH0") throw new Error("Expected AUTH0 event");
        // Map Auth0 User fields to our User Model
        const user = {
          id: event.user.sub,
          email: event.user.email,
          firstName: event.user.nickname,
          avatar: event.user.picture,
        };

        // Set Auth0 Access Token in Local Storage for API calls
        localStorage.setItem(getAuthTokenName(), event.token);

        return Promise.resolve({ user });
      },
      updateProfile: async (ctx, event: AuthMachineEvents) => {
        if (event.type !== "UPDATE") throw new Error("Expected UPDATE event");
        const payload = omit("type", event);
        const resp = await httpClient.patch(
          `http://localhost:${backendPort}/users/${payload.id}`,
          payload
        );
        return resp.data;
      },
      performLogout: async () => {
        localStorage.removeItem("authState");
        return await httpClient.post(`http://localhost:${backendPort}/logout`);
      },
      getCognitoUserProfile: /* istanbul ignore next */ (ctx, event: AuthMachineEvents) => {
        if (event.type !== "COGNITO") throw new Error("Expected COGNITO event");
        // Map Cognito User fields to our User Model
        const ourUser = {
          id: event.userSub,
          email: event.email,
        };

        // Set Access Token in Local Storage for API calls
        localStorage.setItem(getAuthTokenName(), event.accessTokenJwtString);

        return Promise.resolve(ourUser);
      },
    },
    actions: {
      redirectHomeAfterLogin: async () => {
        if (history.location.pathname === "/signin") {
          /* istanbul ignore next */
          window.location.pathname = "/";
        }
      },
      resetUser: assign(() => ({
        user: undefined,
      })),
      setUserProfile: assign<AuthMachineContext, AuthMachineEvents>((ctx, event) => {
        if (!("data" in event)) throw new Error("Expected authentication service result");
        return {
          user: event.data.user,
        };
      }),
      onSuccess: assign<AuthMachineContext, AuthMachineEvents>((ctx, event) => {
        if (!("data" in event)) throw new Error("Expected authentication service result");
        return {
          user: event.data.user,
          message: undefined,
        };
      }),
      onError: assign<AuthMachineContext, AuthMachineEvents>((ctx, event) => {
        if (!("data" in event)) throw new Error("Expected authentication service result");
        return {
          message: event.data.message,
        };
      }),
    },
  }
);

const storedState = localStorage.getItem("authState");
const stateDefinition = storedState === null ? null : JSON.parse(storedState);

let resolvedState;
if (stateDefinition) {
  const previousState = State.create<AuthMachineContext, AuthMachineEvents>(stateDefinition);

  resolvedState = authMachine.resolveState(previousState);
}

export const authService = interpret(authMachine)
  .onTransition((state) => {
    if (state.changed) {
      localStorage.setItem("authState", JSON.stringify(state));
    }
  })
  .start(resolvedState);
