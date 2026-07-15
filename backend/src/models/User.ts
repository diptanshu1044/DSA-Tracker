import { Schema, model, type HydratedDocument, type Model } from "mongoose";
import {
  DEFAULT_REVISION_INTERVALS,
  type RevisionIntervals,
} from "../constants/revision-intervals.js";

export type AuthProvider = "local" | "google";

export interface IUser {
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  googleId?: string;
  provider: AuthProvider;
  /** Day offsets used when scheduling new revisions for each attempt type. */
  revisionIntervals: RevisionIntervals;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
      minlength: 8,
    },
    avatar: {
      type: String,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      required: true,
    },
    revisionIntervals: {
      type: {
        SELF: { type: [Number], default: undefined },
        HINT: { type: [Number], default: undefined },
        VIDEO: { type: [Number], default: undefined },
      },
      default: () => ({
        SELF: [...DEFAULT_REVISION_INTERVALS.SELF],
        HINT: [...DEFAULT_REVISION_INTERVALS.HINT],
        VIDEO: [...DEFAULT_REVISION_INTERVALS.VIDEO],
      }),
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.refreshTokenHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const User: Model<IUser> = model<IUser>("User", userSchema);
