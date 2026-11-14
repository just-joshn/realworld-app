import * as yup from "yup";
import type { identityProfileSchema } from "../models/schemas";
import { userSchema, authUserSchema, authResponseSchema } from "../models/schemas";
import { createMachine, assign, interpret, State } from "xstate";
import { omit } from "lodash/fp";
import { httpClient, getAuthTokenName } from "../utils/asyncUtils";
import { history } from "../utils/historyUtils";
import type { User } from "../models";
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
  | ({ type: "LOGIN" } & Partial<Pick<User, "username" | "password">>)
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
  | ({ type: "SIGNUP" } & Partial<Pick<User, "username" | "password" | "firstName" | "lastName">>)
  | {
      type: `done.invoke.${string}` | `error.platform.${string}`;
      data: { user?: AuthUser | undefined; message?: string };
    };

export type AuthUser = User | yup.InferType<typeof identityProfileSchema>;

export function isAppUser(user: AuthUser): user is User {
  return userSchema.isValidSync(user, { strict: true });
}

export interface AuthMachineContext {
  user?: AuthUser | undefined;
  message?: string | undefined;
}

export const authMachine = createMachine<AuthMachineContext, AuthMachineEvents>(
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
      performSignup: async (_ctx, event) => {
        const payload = omit("type", event);
        const resp = await httpClient.post<unknown>(
          `http://localhost:${String(backendPort)}/users`,
          payload
        );
        history.push("/signin");
        return authResponseSchema.validateSync(resp.data);
      },
      performLogin: async (_ctx, event) => {
        return await httpClient
          .post<unknown>(`http://localhost:${String(backendPort)}/login`, event)
          .then(({ data }) => {
            history.push("/");
            return authResponseSchema.validateSync(data);
          })
          .catch(() => {
            throw new Error("Username or password is invalid");
          });
      },
      getOktaUserProfile: (_ctx, event: AuthMachineEvents) => {
        if (event.type !== "OKTA") throw new Error("Expected OKTA event");
        const user = {
          id: event.user.sub,
          email: event.user.email,
          firstName: event.user.given_name,
          lastName: event.user.family_name,
          username: event.user.preferred_username,
        };

        localStorage.setItem(getAuthTokenName(), event.token);

        return Promise.resolve({ user });
      },
      getUserProfile: async () => {
        const resp = await httpClient.get<unknown>(
          `http://localhost:${String(backendPort)}/checkAuth`
        );
        return authResponseSchema.validateSync(resp.data);
      },
      getGoogleUserProfile: (_ctx, event: AuthMachineEvents) => {
        if (event.type !== "GOOGLE") throw new Error("Expected GOOGLE event");
        const user = {
          id: event.user.googleId,
          email: event.user.email,
          firstName: event.user.givenName,
          lastName: event.user.familyName,
          avatar: event.user.imageUrl,
        };

        localStorage.setItem(getAuthTokenName(), event.token);

        return Promise.resolve({ user });
      },
      getAuth0UserProfile: (_ctx, event: AuthMachineEvents) => {
        if (event.type !== "AUTH0") throw new Error("Expected AUTH0 event");
        const user = {
          id: event.user.sub,
          email: event.user.email,
          firstName: event.user.nickname,
          avatar: event.user.picture,
        };

        localStorage.setItem(getAuthTokenName(), event.token);

        return Promise.resolve({ user });
      },
      updateProfile: async (_ctx, event: AuthMachineEvents) => {
        if (event.type !== "UPDATE") throw new Error("Expected UPDATE event");
        const payload = omit("type", event);
        await httpClient.patch<unknown>(
          `http://localhost:${String(backendPort)}/users/${String(payload.id)}`,
          payload
        );
      },
      performLogout: async () => {
        localStorage.removeItem("authState");
        return await httpClient.post<unknown>(`http://localhost:${String(backendPort)}/logout`);
      },
      getCognitoUserProfile: (_ctx, event: AuthMachineEvents) => {
        if (event.type !== "COGNITO") throw new Error("Expected COGNITO event");
        const ourUser = {
          id: event.userSub,
          email: event.email,
        };

        localStorage.setItem(getAuthTokenName(), event.accessTokenJwtString);

        return Promise.resolve({ user: ourUser });
      },
    },
    actions: {
      redirectHomeAfterLogin: () => {
        if (history.location.pathname === "/signin") {
          window.location.pathname = "/";
        }
      },
      resetUser: assign(() => ({
        user: undefined,
      })),
      setUserProfile: assign<AuthMachineContext, AuthMachineEvents>((_ctx, event) => {
        if (!("data" in event)) throw new Error("Expected authentication service result");
        return {
          user: event.data.user,
        };
      }),
      onSuccess: assign<AuthMachineContext, AuthMachineEvents>((_ctx, event) => {
        if (!("data" in event)) throw new Error("Expected authentication service result");
        return {
          user: event.data.user,
          message: undefined,
        };
      }),
      onError: assign<AuthMachineContext, AuthMachineEvents>((_ctx, event) => {
        if (!("data" in event)) throw new Error("Expected authentication service result");
        return {
          message: event.data.message,
        };
      }),
    },
  }
);

const storedAuthSchema = yup
  .object({
    value: yup
      .string()
      .oneOf([
        "unauthorized",
        "signup",
        "loading",
        "updating",
        "logout",
        "refreshing",
        "google",
        "authorized",
        "auth0",
        "cognito",
        "okta",
      ])
      .required(),
    context: yup
      .object({
        user: authUserSchema,
        message: yup.string().optional(),
      })
      .required(),
  })
  .required();

function restoreAuthState() {
  const storedState = localStorage.getItem("authState");
  if (storedState === null) return undefined;
  try {
    const definition: unknown = JSON.parse(storedState);
    const { value, context } = storedAuthSchema.validateSync(definition);
    return authMachine.resolveState(
      State.from<AuthMachineContext, AuthMachineEvents>(value, {
        ...(context.user === undefined ? {} : { user: context.user }),
        ...(context.message === undefined ? {} : { message: context.message }),
      })
    );
  } catch {
    localStorage.removeItem("authState");
    return undefined;
  }
}

const resolvedState = restoreAuthState();

export const authService = interpret(authMachine)
  .onTransition((state) => {
    if (state.changed) {
      localStorage.setItem("authState", JSON.stringify(state));
    }
  })
  .start(resolvedState);
