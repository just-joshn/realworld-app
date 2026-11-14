import type { User as IUser } from "../src/models/user";

declare global {
  namespace Express {
    interface User extends IUser {
      sub?: string;
    }
  }
}
