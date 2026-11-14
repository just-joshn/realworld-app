declare module "passport-local" {
  import { Strategy as PassportStrategy } from "passport";

  export class Strategy extends PassportStrategy {
    constructor(
      verify: (
        username: string,
        password: string,
        done: (error: Error | null, user: Express.User | false, info?: { message: string }) => void
      ) => void
    );
  }
}
