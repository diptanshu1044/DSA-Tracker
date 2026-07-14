import { AppError } from "../../utils/AppError.js";
import { leetCodeMetadataProvider } from "./leetcode.provider.js";
import type { MetadataProvider, ProblemMetadata } from "./types.js";

const providers: MetadataProvider[] = [leetCodeMetadataProvider];

export function resolveMetadataProvider(url: string): MetadataProvider {
  const provider = providers.find((candidate) => candidate.supports(url));
  if (!provider) {
    throw new AppError("No metadata provider supports this URL", 400);
  }
  return provider;
}

export async function fetchProblemMetadata(
  url: string,
): Promise<ProblemMetadata> {
  const provider = resolveMetadataProvider(url);
  return provider.fetch(url);
}

export type { ProblemMetadata, MetadataProvider } from "./types.js";
