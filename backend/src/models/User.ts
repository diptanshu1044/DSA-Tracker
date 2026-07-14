import { Schema, model, type HydratedDocument, type Model } from "mongoose";

export type AuthProvider = "local" | "google";

export interface IUser {
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  googleId?: string;
  provider: AuthProvider;
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
