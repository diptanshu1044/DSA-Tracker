import { isLeetCodeProblemUrl, parseLeetCodeUrl } from "../../utils/leetcodeUrl.js";
import type { Difficulty, MetadataProvider, ProblemMetadata } from "./types.js";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

const QUESTION_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      questionFrontendId
      title
      titleSlug
      difficulty
      topicTags {
        name
      }
    }
  }
`;

interface LeetCodeQuestion {
  questionId: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  topicTags: Array<{ name: string }>;
}

interface GraphQlResponse {
  data?: {
    question: LeetCodeQuestion | null;
  };
  errors?: Array<{ message: string }>;
}

function toDifficulty(value: string): Difficulty {
  if (value === "Easy" || value === "Medium" || value === "Hard") {
    return value;
  }
  throw new Error(`Unexpected LeetCode difficulty: ${value}`);
}

export const leetCodeMetadataProvider: MetadataProvider = {
  name: "leetcode",

  supports(url: string): boolean {
    return isLeetCodeProblemUrl(url);
  },

  async fetch(url: string): Promise<ProblemMetadata> {
    const { slug } = parseLeetCodeUrl(url);

    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
      },
      body: JSON.stringify({
        query: QUESTION_QUERY,
        variables: { titleSlug: slug },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `LeetCode API returned HTTP ${response.status}`,
      );
    }

    const body = (await response.json()) as GraphQlResponse;

    if (body.errors?.length) {
      throw new Error(body.errors[0]?.message ?? "LeetCode GraphQL error");
    }

    const question = body.data?.question;
    if (!question) {
      throw new Error(`LeetCode problem not found for slug "${slug}"`);
    }

    return {
      title: question.title,
      problemId: question.questionFrontendId || question.questionId,
      difficulty: toDifficulty(question.difficulty),
      topics: question.topicTags.map((tag) => tag.name),
      slug: question.titleSlug || slug,
    };
  },
};
