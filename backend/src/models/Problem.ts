import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const ATTEMPT_TYPES = ["SELF", "HINT", "VIDEO"] as const;
export type AttemptType = (typeof ATTEMPT_TYPES)[number];

export interface IProblem {
  userId: Types.ObjectId;
  title: string;
  url: string;
  attemptType: AttemptType;
  timeTaken?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IProblemDocument = HydratedDocument<IProblem>;

const problemSchema = new Schema<IProblem>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    attemptType: {
      type: String,
      enum: ATTEMPT_TYPES,
      required: true,
    },
    timeTaken: {
      type: Number,
      min: 0,
      max: 24 * 60, // minutes
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

problemSchema.index({ userId: 1, url: 1 }, { unique: true });
problemSchema.index({ userId: 1, createdAt: -1 });

export const Problem: Model<IProblem> = model<IProblem>("Problem", problemSchema);
