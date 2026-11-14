import { Machine } from "xstate";

export interface UserOnboardingMachineSchema {
  states: {
    idle: Record<string, never>;
    stepOne: Record<string, never>;
    stepTwo: Record<string, never>;
    stepThree: Record<string, never>;
    done: Record<string, never>;
  };
}

export type UserOnboardingMachineEvents = { type: "PREV" } | { type: "NEXT" };

export type UserOnboardingMachineContext = Record<string, never>;

export const userOnboardingMachine = Machine<
  UserOnboardingMachineContext,
  UserOnboardingMachineSchema,
  UserOnboardingMachineEvents
>({
  id: "userOnboarding",
  initial: "stepOne",
  states: {
    idle: {
      on: {
        NEXT: "stepOne",
      },
    },
    stepOne: {
      on: {
        NEXT: "stepTwo",
      },
    },
    stepTwo: {
      on: {
        PREV: "stepOne",
        NEXT: "stepThree",
      },
    },
    stepThree: {
      on: {
        PREV: "stepTwo",
        NEXT: "done",
      },
    },
    done: {
      type: "final",
    },
  },
});
