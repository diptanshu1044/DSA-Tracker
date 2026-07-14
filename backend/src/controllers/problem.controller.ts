import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createProblem,
  deleteProblem,
  getProblemById,
  listProblems,
  updateProblem,
} from "../services/problem.service.js";
import { paramId } from "../utils/params.js";
import { requireUserId } from "../utils/requireUser.js";
import { sendMessage, sendSuccess } from "../utils/response.js";
import { parseOrThrow } from "../utils/validation.js";
import {
  createProblemSchema,
  listProblemsQuerySchema,
  updateProblemSchema,
} from "../validators/problem.validators.js";

export const problemController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const input = parseOrThrow(createProblemSchema, req.body);
    const problem = await createProblem(userId, input);
    sendSuccess(res, { problem }, "Problem created", 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const query = parseOrThrow(listProblemsQuerySchema, req.query);
    const result = await listProblems(userId, query);
    sendSuccess(res, {
      problems: result.items,
      pagination: result.pagination,
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const problemId = paramId(req.params.id, "problem id");
    const problem = await getProblemById(userId, problemId);
    sendSuccess(res, { problem });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const problemId = paramId(req.params.id, "problem id");
    const input = parseOrThrow(updateProblemSchema, req.body);
    const problem = await updateProblem(userId, problemId, input);
    sendSuccess(res, { problem }, "Problem updated");
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const problemId = paramId(req.params.id, "problem id");
    await deleteProblem(userId, problemId);
    sendMessage(res, "Problem deleted");
  }),
};
