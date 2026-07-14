export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * Normalized problem metadata from any source.
 * Add optional fields here as providers grow.
 */
export interface ProblemMetadata {
  title: string;
  problemId: string;
  difficulty: Difficulty;
  topics: string[];
  slug: string;
}

export interface MetadataProvider {
  readonly name: string;
  supports(url: string): boolean;
  fetch(url: string): Promise<ProblemMetadata>;
}
