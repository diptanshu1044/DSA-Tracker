import { Problem } from "../models/Problem.js";
import { fetchProblemMetadata } from "../services/metadata/index.js";
import { AppError } from "../utils/AppError.js";
import { parseObjectId } from "../utils/objectId.js";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 1000);
  }
  return "Unknown metadata fetch error";
}

async function applyMetadataSuccess(
  problemId: string,
  metadata: Awaited<ReturnType<typeof fetchProblemMetadata>>,
): Promise<void> {
  await Problem.updateOne(
    { _id: problemId },
    {
      $set: {
        title: metadata.title,
        slug: metadata.slug,
        difficulty: metadata.difficulty,
        topics: metadata.topics,
        problemId: metadata.problemId,
        metadataFetched: true,
        metadataFetchedAt: new Date(),
        metadataError: null,
      },
    },
  );
}

async function applyMetadataFailure(
  problemId: string,
  message: string,
): Promise<void> {
  await Problem.updateOne(
    { _id: problemId },
    {
      $set: {
        metadataFetched: false,
        metadataError: message,
      },
    },
  );
}

/**
 * Fetch metadata for a problem and persist it.
 * Retries with exponential backoff; never throws to callers of enqueue.
 */
export async function runFetchProblemMetadata(
  problemId: string,
): Promise<void> {
  const problem = await Problem.findById(problemId).select("url").lean();
  if (!problem) {
    console.error(`[metadata] Problem ${problemId} not found, skipping fetch`);
    return;
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const metadata = await fetchProblemMetadata(problem.url);
      await applyMetadataSuccess(problemId, metadata);
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `[metadata] Attempt ${attempt}/${MAX_ATTEMPTS} failed for ${problemId}:`,
        errorMessage(error),
      );

      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  const message = errorMessage(lastError);
  try {
    await applyMetadataFailure(problemId, message);
  } catch (persistError) {
    console.error(
      `[metadata] Failed to persist error for ${problemId}:`,
      persistError,
    );
  }
}

/**
 * Fire-and-forget enqueue. Does not block the HTTP response.
 */
export function enqueueFetchProblemMetadata(problemId: string): void {
  setImmediate(() => {
    void runFetchProblemMetadata(problemId).catch((error) => {
      console.error(
        `[metadata] Unhandled job error for ${problemId}:`,
        errorMessage(error),
      );
    });
  });
}

/**
 * Manually retry metadata fetch for a user's problem.
 * Resets fetch state then enqueues the job.
 */
export async function retryFetchProblemMetadata(
  userId: string,
  problemId: string,
): Promise<void> {
  const problem = await Problem.findOne({
    _id: parseObjectId(problemId, "problem id"),
    userId,
  }).select("_id");

  if (!problem) {
    throw new AppError("Problem not found", 404);
  }

  await Problem.updateOne(
    { _id: problem._id },
    {
      $set: {
        metadataFetched: false,
        metadataError: null,
        metadataFetchedAt: null,
      },
    },
  );

  enqueueFetchProblemMetadata(String(problem._id));
}
