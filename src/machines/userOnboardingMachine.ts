import { setup } from "xstate";
import { typed } from "./service";

export type UserOnboardingMachineEvents = { type: "PREV" } | { type: "NEXT" };

export const userOnboardingMachine = setup({
  types: typed<{ events: UserOnboardingMachineEvents }>(),
}).createMachine({
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
