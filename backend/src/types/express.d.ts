import type { Types } from "mongoose";

declare global {
  namespace Express {
    interface User {
      _id: Types.ObjectId;
      email: string;
      name: string;
      avatar?: string;
      provider: "local" | "google";
    }

    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

export {};
