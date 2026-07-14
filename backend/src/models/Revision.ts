import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface IRevision {
  userId: Types.ObjectId;
  problemId: Types.ObjectId;
  dueDate: Date;
  revisionNumber: number;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IRevisionDocument = HydratedDocument<IRevision>;

const revisionSchema = new Schema<IRevision>(
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
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    revisionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    completed: {
      type: Boolean,
      default: false,
      required: true,
    },
    completedAt: {
      type: Date,
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

revisionSchema.index(
  { problemId: 1, revisionNumber: 1 },
  { unique: true },
);
revisionSchema.index({ userId: 1, dueDate: 1, completed: 1 });
revisionSchema.index({ userId: 1, completed: 1, completedAt: -1 });

export const Revision: Model<IRevision> = model<IRevision>(
  "Revision",
  revisionSchema,
);
