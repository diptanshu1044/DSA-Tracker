import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createRevision,
  deleteRevision,
  getRevisionById,
  listRevisions,
  retryFailedRevision,
  scheduleAdditionalRevision,
  scheduleManualRevisions,
  updateRevision,
} from "../services/revision.service.js";
import { paramId } from "../utils/params.js";
import { requireUserId } from "../utils/requireUser.js";
import { sendMessage, sendSuccess } from "../utils/response.js";
import { parseOrThrow } from "../utils/validation.js";
import {
  createRevisionSchema,
  listRevisionsQuerySchema,
  scheduleAdditionalRevisionSchema,
  scheduleManualRevisionSchema,
  updateRevisionSchema,
} from "../validators/revision.validators.js";

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
    const { revision, revisionCycleComplete } = await updateRevision(
      userId,
      revisionId,
      input,
    );
    sendSuccess(
      res,
      { revision, revisionCycleComplete },
      revisionCycleComplete
        ? "Revision cycle complete"
        : "Revision updated",
    );
  }),

  scheduleAdditional: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const input = parseOrThrow(scheduleAdditionalRevisionSchema, req.body);
    const revision = await scheduleAdditionalRevision(userId, input);
    sendSuccess(res, { revision }, "Additional revision scheduled", 201);
  }),

  scheduleManual: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const input = parseOrThrow(scheduleManualRevisionSchema, req.body);
    const revisions = await scheduleManualRevisions(userId, input);
    const count = revisions.length;
    sendSuccess(
      res,
      { revisions },
      count === 1
        ? "Revision scheduled"
        : `${count} revisions scheduled`,
      201,
    );
  }),

  retryTomorrow: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const revisionId = paramId(req.params.id, "revision id");
    const { revision, nextRevision, revisionCycleComplete } =
      await retryFailedRevision(userId, revisionId);
    sendSuccess(
      res,
      { revision, nextRevision, revisionCycleComplete },
      "Review rescheduled for tomorrow",
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const revisionId = paramId(req.params.id, "revision id");
    await deleteRevision(userId, revisionId);
    sendMessage(res, "Revision deleted");
  }),
};
