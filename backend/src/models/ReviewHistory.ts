import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { ATTEMPT_TYPES, type AttemptType } from "./Problem.js";

export const REVIEW_HISTORY_TYPES = ["INITIAL", "REVIEW"] as const;
export type ReviewHistoryType = (typeof REVIEW_HISTORY_TYPES)[number];

export const CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/** Attempt outcome stored on each history entry (maps to Solved / Hint / Solution in UI). */
export type ReviewResult = AttemptType;

export interface IReviewHistory {
  userId: Types.ObjectId;
  problemId: Types.ObjectId;
  type: ReviewHistoryType;
  /** Set for REVIEW entries; null/omitted for INITIAL. */
  revisionNumber?: number | null;
  /** Linked revision document when type is REVIEW. */
  revisionId?: Types.ObjectId | null;
  /** Original due date for reviews; problem createdAt date for initial. */
  scheduledDate?: Date | null;
  completedAt: Date;
  result: ReviewResult;
  confidence?: ConfidenceLevel | null;
  timeTaken?: number | null;
  nextReviewDate?: Date | null;
  /** True when the next review was auto-scheduled (e.g. one-click retry tomorrow). */
  autoRescheduled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IReviewHistoryDocument = HydratedDocument<IReviewHistory>;

const reviewHistorySchema = new Schema<IReviewHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    problemId: {
      type: Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: REVIEW_HISTORY_TYPES,
      required: true,
    },
    revisionNumber: {
      type: Number,
      min: 1,
      default: null,
    },
    revisionId: {
      type: Schema.Types.ObjectId,
      ref: "Revision",
      default: null,
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      required: true,
    },
    result: {
      type: String,
      enum: ATTEMPT_TYPES,
      required: true,
    },
    confidence: {
      type: String,
      enum: CONFIDENCE_LEVELS,
      default: null,
    },
    timeTaken: {
      type: Number,
      min: 0,
      max: 24 * 60,
      default: null,
    },
    nextReviewDate: {
      type: Date,
      default: null,
    },
    autoRescheduled: {
      type: Boolean,
      default: false,
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

reviewHistorySchema.index({ problemId: 1, completedAt: 1 });
reviewHistorySchema.index({ userId: 1, problemId: 1, completedAt: 1 });
reviewHistorySchema.index(
  { revisionId: 1 },
  {
    unique: true,
    partialFilterExpression: { revisionId: { $type: "objectId" } },
  },
);

export const ReviewHistory: Model<IReviewHistory> = model<IReviewHistory>(
  "ReviewHistory",
  reviewHistorySchema,
);
