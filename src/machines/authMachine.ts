import * as yup from "yup";
import {
  userSchema,
  authUserSchema,
  authResponseSchema,
  identityProfileSchema as identityProfileValidator,
} from "../models/schemas";
import { assign, createActor, emit, fromPromise, setup } from "xstate";
import type { DoneActorEvent, ErrorActorEvent } from "xstate";
import { errorMessage, typed } from "./service";
import { omit } from "lodash/fp";
import { httpClient, getAuthTokenName } from "../utils/asyncUtils";
import { history } from "../utils/historyUtils";
import type { User } from "../models";
import { backendPort } from "../utils/portUtils";

export type AuthMachineEvents =
  | ({ type: "LOGIN" } & Partial<Pick<User, "username" | "password">>)
  | { type: "LOGOUT" }
  | ({ type: "UPDATE" } & Partial<User>)
  | { type: "REFRESH" }
  | ({ type: "AUTH0" } & {
      user: {
        sub?: string | undefined;
        email?: string | undefined;
        nickname?: string | undefined;
        picture?: string | undefined;
      };
      token: string;
    })
  | ({ type: "COGNITO" } & { userSub: string; email: string; accessTokenJwtString: string })
  | ({ type: "OKTA" } & {
      user: {
        sub?: string | undefined;
        email?: string | undefined;
        given_name?: string | undefined;
        family_name?: string | undefined;
        preferred_username?: string | undefined;
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
  | ({ type: "SIGNUP" } & Partial<Pick<User, "username" | "password" | "firstName" | "lastName">>);

export type AuthUser = User | yup.InferType<typeof identityProfileValidator>;

export function isAppUser(user: AuthUser): user is User {
  return userSchema.isValidSync(user, { strict: true });
}

export interface AuthMachineContext {
  user?: AuthUser | undefined;
  message?: string | undefined;
}

interface ProfileResult {
  user?: AuthUser | undefined;
}

/** Promise actors receive the event that entered their state as `input`. */
const fromEvent = <TOutput>(run: (event: AuthMachineEvents) => Promise<TOutput>) =>
  fromPromise<TOutput, AuthMachineEvents>(async ({ input }) => run(input));

const performSignup = fromEvent<ProfileResult>(async (event) => {
  const payload = omit("type", event);
  const resp = await httpClient.post<unknown>(
    `http://localhost:${String(backendPort)}/users`,
    payload
  );
  history.push("/signin");
  return authResponseSchema.validateSync(resp.data);
});

const performLogin = fromEvent<ProfileResult>(async (event) => {
  return await httpClient
    .post<unknown>(`http://localhost:${String(backendPort)}/login`, event)
    .then(({ data }) => {
      history.push("/");
      return authResponseSchema.validateSync(data);
    })
    .catch(() => {
      throw new Error("Username or password is invalid");
    });
});

const getUserProfile = fromEvent<ProfileResult>(async () => {
  const resp = await httpClient.get<unknown>(`http://localhost:${String(backendPort)}/checkAuth`);
  return authResponseSchema.validateSync(resp.data);
});

const getOktaUserProfile = fromEvent<ProfileResult>(async (event) => {
  if (event.type !== "OKTA") throw new Error("Expected OKTA event");
  const { user: oktaUser, token } = event;
  const user = identityProfileValidator.validateSync({
    id: oktaUser.sub,
    email: oktaUser.email,
    firstName: oktaUser.given_name,
    lastName: oktaUser.family_name,
    username: oktaUser.preferred_username,
  });

  localStorage.setItem(getAuthTokenName(), token);

  return Promise.resolve({ user });
});

const getGoogleUserProfile = fromEvent<ProfileResult>(async (event) => {
  if (event.type !== "GOOGLE") throw new Error("Expected GOOGLE event");
  const { user: googleUser, token } = event;
  const user = {
    id: googleUser.googleId,
    email: googleUser.email,
    firstName: googleUser.givenName,
    lastName: googleUser.familyName,
    avatar: googleUser.imageUrl,
  };

  localStorage.setItem(getAuthTokenName(), token);

  return Promise.resolve({ user });
});

const getAuth0UserProfile = fromEvent<ProfileResult>(async (event) => {
  if (event.type !== "AUTH0") throw new Error("Expected AUTH0 event");
  const { user: auth0User, token } = event;
  const user = identityProfileValidator.validateSync({
    id: auth0User.sub,
    email: auth0User.email,
    firstName: auth0User.nickname,
    avatar: auth0User.picture,
  });

  localStorage.setItem(getAuthTokenName(), token);

  return Promise.resolve({ user });
});

const getCognitoUserProfile = fromEvent<ProfileResult>(async (event) => {
  if (event.type !== "COGNITO") throw new Error("Expected COGNITO event");
  const cognito = event;
  const user = {
    id: cognito.userSub,
    email: cognito.email,
  };

  localStorage.setItem(getAuthTokenName(), cognito.accessTokenJwtString);

  return Promise.resolve({ user });
});

const updateProfile = fromEvent<undefined>(async (event) => {
  if (event.type !== "UPDATE") throw new Error("Expected UPDATE event");
  const payload = omit("type", event);
  await httpClient.patch<unknown>(
    `http://localhost:${String(backendPort)}/users/${String(payload.id)}`,
    payload
  );
});

const performLogout = fromEvent<unknown>(async () => {
  localStorage.removeItem("authState");
  return await httpClient.post<unknown>(`http://localhost:${String(backendPort)}/logout`);
});

const setMessage = assign<AuthMachineContext, ErrorActorEvent, undefined, AuthMachineEvents, never>(
  {
    message: ({ event }) => errorMessage(event.error),
  }
);
const setUser = assign<
  AuthMachineContext,
  DoneActorEvent<ProfileResult>,
  undefined,
  AuthMachineEvents,
  never
>({ user: ({ event }) => event.output.user });
const onSuccess = assign<
  AuthMachineContext,
  DoneActorEvent<ProfileResult>,
  undefined,
  AuthMachineEvents,
  never
>({ user: ({ event }) => event.output.user, message: undefined });

export const authMachine = setup({
  types: typed<{
    context: AuthMachineContext;
    events: AuthMachineEvents;
    emitted: { type: "LOGGED_OUT" } | { type: "LOGOUT_FAILED" };
  }>(),
  actors: {
    performSignup,
    performLogin,
    getUserProfile,
    getOktaUserProfile,
    getGoogleUserProfile,
    getAuth0UserProfile,
    getCognitoUserProfile,
    updateProfile,
    performLogout,
  },
}).createMachine({
  id: "authentication",
  initial: "unauthorized",
  context: {
    user: undefined,
    message: undefined,
  },
  states: {
    unauthorized: {
      entry: assign({ user: undefined }),
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
        input: ({ event }) => event,
        onDone: { target: "unauthorized", actions: onSuccess },
        onError: { target: "unauthorized", actions: setMessage },
      },
    },
    loading: {
      invoke: {
        src: "performLogin",
        input: ({ event }) => event,
        onDone: { target: "authorized", actions: onSuccess },
        onError: { target: "unauthorized", actions: setMessage },
      },
    },
    updating: {
      invoke: {
        src: "updateProfile",
        input: ({ event }) => event,
        onDone: { target: "refreshing" },
        onError: { target: "unauthorized", actions: setMessage },
      },
    },
    refreshing: {
      invoke: {
        src: "getUserProfile",
        input: ({ event }) => event,
        onDone: { target: "authorized", actions: setUser },
        onError: { target: "unauthorized", actions: setMessage },
      },
      on: {
        LOGOUT: "logout",
      },
    },
    google: {
      invoke: {
        src: "getGoogleUserProfile",
        input: ({ event }) => event,
        onDone: { target: "authorized", actions: setUser },
        onError: { target: "unauthorized", actions: setMessage },
      },
      on: {
        LOGOUT: "logout",
      },
    },
    logout: {
      invoke: {
        src: "performLogout",
        input: ({ event }) => event,
        onDone: { target: "unauthorized", actions: emit({ type: "LOGGED_OUT" }) },
        onError: { target: "unauthorized", actions: [setMessage, emit({ type: "LOGOUT_FAILED" })] },
      },
    },
    authorized: {
      entry: () => {
        if (history.location.pathname === "/signin") {
          window.location.pathname = "/";
        }
      },
      on: {
        UPDATE: "updating",
        REFRESH: "refreshing",
        LOGOUT: "logout",
      },
    },
    auth0: {
      invoke: {
        src: "getAuth0UserProfile",
        input: ({ event }) => event,
        onDone: { target: "authorized", actions: setUser },
        onError: { target: "unauthorized", actions: setMessage },
      },
      on: {
        LOGOUT: "logout",
      },
    },
    okta: {
      invoke: {
        src: "getOktaUserProfile",
        input: ({ event }) => event,
        onDone: { target: "authorized", actions: setUser },
        onError: { target: "unauthorized", actions: setMessage },
      },
      on: {
        LOGOUT: "logout",
      },
    },
    cognito: {
      invoke: {
        src: "getCognitoUserProfile",
        input: ({ event }) => event,
        onDone: { target: "authorized", actions: setUser },
        onError: { target: "unauthorized", actions: setMessage },
      },
      on: {
        LOGOUT: "logout",
      },
    },
  },
});

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
    return authMachine.resolveState({
      value,
      context: {
        ...(context.user === undefined ? {} : { user: context.user }),
        ...(context.message === undefined ? {} : { message: context.message }),
      },
    });
  } catch {
    localStorage.removeItem("authState");
    return undefined;
  }
}

const resolvedState = restoreAuthState();

export const authService = createActor(
  authMachine,
  resolvedState === undefined ? {} : { snapshot: resolvedState }
);
let persistedSnapshot = authService.getSnapshot();
authService.subscribe((snapshot) => {
  if (snapshot === persistedSnapshot) return;
  persistedSnapshot = snapshot;
  localStorage.setItem(
    "authState",
    JSON.stringify({ value: snapshot.value, context: snapshot.context })
  );
});
authService.start();
