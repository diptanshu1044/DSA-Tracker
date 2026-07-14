import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createRevision,
  deleteRevision,
  getRevisionById,
  listRevisions,
  updateRevision,
} from "../services/revision.service.js";
import { AppError } from "../utils/AppError.js";
import { paramId } from "../utils/params.js";
import { sendMessage, sendSuccess } from "../utils/response.js";
import { parseOrThrow } from "../utils/validation.js";
import {
  createRevisionSchema,
  listRevisionsQuerySchema,
  updateRevisionSchema,
} from "../validators/revision.validators.js";

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError("Authentication required", 401);
  }
  return req.userId;
}

export const revisionController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const input = parseOrThrow(createRevisionSchema, req.body);
    const revision = await createRevision(userId, input);
    sendSuccess(res, { revision }, "Revision created", 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const query = parseOrThrow(listRevisionsQuerySchema, req.query);
    const result = await listRevisions(userId, query);
    sendSuccess(res, {
      revisions: result.items,
      pagination: result.pagination,
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const revisionId = paramId(req.params.id, "revision id");
    const revision = await getRevisionById(userId, revisionId);
    sendSuccess(res, { revision });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const revisionId = paramId(req.params.id, "revision id");
    const input = parseOrThrow(updateRevisionSchema, req.body);
    const revision = await updateRevision(userId, revisionId, input);
    sendSuccess(res, { revision }, "Revision updated");
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const revisionId = paramId(req.params.id, "revision id");
    await deleteRevision(userId, revisionId);
    sendMessage(res, "Revision deleted");
  }),
};
