import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const ATTEMPT_TYPES = ["SELF", "HINT", "VIDEO"] as const;
export type AttemptType = (typeof ATTEMPT_TYPES)[number];

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface IProblem {
  userId: Types.ObjectId;
  title: string;
  url: string;
  slug?: string;
  difficulty?: Difficulty;
  topics: string[];
  problemId?: string;
  metadataFetched: boolean;
  metadataFetchedAt?: Date | null;
  metadataError?: string | null;
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
    slug: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    difficulty: {
      type: String,
      enum: DIFFICULTIES,
    },
    topics: {
      type: [String],
      default: [],
    },
    problemId: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    metadataFetched: {
      type: Boolean,
      default: false,
    },
    metadataFetchedAt: {
      type: Date,
      default: null,
    },
    metadataError: {
      type: String,
      default: null,
      maxlength: 1000,
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
problemSchema.index({ userId: 1, attemptType: 1, createdAt: -1 });

export const Problem: Model<IProblem> = model<IProblem>("Problem", problemSchema);
