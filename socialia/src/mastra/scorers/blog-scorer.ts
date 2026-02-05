import { z } from "zod";
import { createToolCallAccuracyScorerCode } from "@mastra/evals/scorers/prebuilt";
import { createCompletenessScorer } from "@mastra/evals/scorers/prebuilt";
import {
  getAssistantMessageFromRunOutput,
  getUserMessageFromRunInput,
} from "@mastra/evals/scorers/utils";
import { createScorer } from "@mastra/core/evals";

export const toolCallAppropriatenessScorer = createToolCallAccuracyScorerCode({
  expectedTool: "blogSummaryTool",
  strictMode: false,
});

export const completenessScorer = createCompletenessScorer();

export const accuracyScorer = createScorer({
  id: "blog-summary-accuracy-scorer",
  name: "Summary Accuracy",
  description:
    "Evaluates if the summary is factually consistent with the retrieved Hashnode blog content",
  type: "agent",
  judge: {
    model: "groq/openai/gpt-oss-20b",
    instructions:
      "You are an expert editor. Compare a blog post summary against the original content. " +
      "Check for factual errors, hallucinations, or claims not supported by the source text. " +
      "Focus on technical accuracy and author attribution.",
  },
})
  .preprocess(({ run }) => {
    const userText = getUserMessageFromRunInput(run.input) || "";
    const assistantText = getAssistantMessageFromRunOutput(run.output) || "";
    return { userText, assistantText };
  })
  .analyze({
    description: "Verify factual alignment between source and summary",
    outputSchema: z.object({
      hasHallucinations: z.boolean(),
      factuallyAccurate: z.boolean(),
      coveredKeyPoints: z.boolean(),
      explanation: z.string(),
    }),
    createPrompt: ({ results }) => `
            Evaluate the following blog summary for accuracy based on the user request.
            User Input: "${results.preprocessStepResult.userText}"
            Assistant Summary: "${results.preprocessStepResult.assistantText}"

            Tasks:
            1) Check if the summary contains information NOT found in a typical technical blog context.
            2) Verify if the tone remains professional.
            3) Confirm if the summary addresses the specific parts of the blog the user asked about.

            Return JSON with fields:
            {
              "hasHallucinations": boolean,
              "factuallyAccurate": boolean,
              "coveredKeyPoints": boolean,
              "explanation": string
            }
        `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    if (r.hasHallucinations) return 0;
    if (r.factuallyAccurate && r.coveredKeyPoints) return 1;
    if (r.factuallyAccurate) return 0.7;
    return 0.3;
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Accuracy scoring: Accurate=${r.factuallyAccurate}, Points Covered=${r.coveredKeyPoints}. Score=${score}. ${r.explanation}`;
  });

export const summarizationScorer = createScorer({
  id: "blog-summarization-quality-scorer",
  name: "Summarization Quality",
  description:
    "Evaluates if the summary captures the main thesis and technical value of the post.",
  type: "agent",
  judge: {
    model: "groq/openai/gpt-oss-20b",
    instructions:
      "You are a technical content strategist. Your goal is to determine if a summary captures " +
      'the "Core Thesis" and "Key Technical Takeaways" of an article. A good summary explains ' +
      'the "Why" and "How" of the topic, not just the "What".',
  },
})
  .preprocess(({ run }) => {
    const userText = getUserMessageFromRunInput(run.input) || "";
    const assistantText = getAssistantMessageFromRunOutput(run.output) || "";
    return { userText, assistantText };
  })
  .analyze({
    description: "Analyze the depth and relevance of the summary content",
    outputSchema: z.object({
      capturedCoreThesis: z.boolean(),
      technicalDepthAdequate: z.boolean(),
      alignmentScore: z.number().min(0).max(1),
      explanation: z.string(),
    }),
    createPrompt: ({ results }) => `
            Evaluate the following blog summary for content quality.
            User Input: "${results.preprocessStepResult.userText}"
            Assistant Summary: "${results.preprocessStepResult.assistantText}"

            Tasks:
            1) Does the summary identify the main problem the blog post is solving?
            2) Is the technical depth appropriate for a summary?
            3) Rate how well the summary aligns with the user's request on a scale of 0 to 1.

            Return JSON with fields:
            {
              "capturedCoreThesis": boolean,
              "technicalDepthAdequate": boolean,
              "alignmentScore": number,
              "explanation": string
            }
        `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    const thesisWeight = r.capturedCoreThesis ? 0.4 : 0;
    const depthWeight = r.technicalDepthAdequate ? 0.3 : 0;
    const alignmentWeight = (r.alignmentScore || 0) * 0.3;
    return thesisWeight + depthWeight + alignmentWeight;
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Summarization scoring: Thesis=${r.capturedCoreThesis}, Depth=${r.technicalDepthAdequate}. Score=${score}. ${r.explanation}`;
  });

export const concisenessScorer = createScorer({
  id: "blog-conciseness-scorer",
  name: "Conciseness",
  description: "Evaluates the brevity and information density of the summary.",
  type: "agent",
  judge: {
    model: "groq/openai/gpt-oss-20b",
    instructions:
      "You are a minimalist editor. You value information density. " +
      "Check if the summary uses unnecessary filler words, repetitive phrasing, " +
      "or provides excessive detail that belongs in the full article rather than a summary.",
  },
})
  .preprocess(({ run }) => {
    const assistantText = getAssistantMessageFromRunOutput(run.output) || "";
    return { assistantText };
  })
  .analyze({
    description: "Check for wordiness and filler content",
    outputSchema: z.object({
      containsFiller: z.boolean(),
      isRepetitive: z.boolean(),
      efficiencyScore: z.number().min(0).max(1),
      explanation: z.string(),
    }),
    createPrompt: ({ results }) => `
            Analyze the following summary for conciseness.
            Assistant Summary: "${results.preprocessStepResult.assistantText}"

            Tasks:
            1) Look for "filler" phrases (e.g., "It is important to note that", "In the realm of").
            2) Check if the same point is made more than once.
            3) Rate the efficiency (information per word) from 0 to 1.

            Return JSON with fields:
            {
              "containsFiller": boolean,
              "isRepetitive": boolean,
              "efficiencyScore": number,
              "explanation": string
            }
        `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    let score = r.efficiencyScore || 0;
    if (r.isRepetitive) score -= 0.3;
    if (r.containsFiller) score -= 0.2;
    return Math.max(0, score);
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Conciseness scoring: Filler=${r.containsFiller}, Repetitive=${r.isRepetitive}. Score=${score}. ${r.explanation}`;
  });

export const scorers = {
  toolCallAppropriatenessScorer,
  completenessScorer,
  accuracyScorer,
  summarizationScorer,
  concisenessScorer,
};
