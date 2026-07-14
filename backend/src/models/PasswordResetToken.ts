import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface IPasswordResetToken {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IPasswordResetTokenDocument = HydratedDocument<IPasswordResetToken>;

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken: Model<IPasswordResetToken> = model<IPasswordResetToken>(
  "PasswordResetToken",
  passwordResetTokenSchema,
);
