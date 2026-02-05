import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { blogSummaryTool } from '../tools/blog-tool'; // Updated tool import
import { scorers } from '../scorers/blog-scorer'; // Ensure you update your scorers

export const blogAgent = new Agent({
  id: 'blog-summary-agent',
  name: 'Hashnode Blog Summary Agent',
  instructions: `
      You are an expert content researcher and summarizer specializing in technical blog posts from Hashnode.

      Your primary function is to fetch blog post content and provide clear, insightful summaries. When responding:
      - Always ask for the blog URL or the slug and hostname if not provided.
      - Extract key takeaways, technical concepts, and the main thesis of the article.
      - Use bullet points for readability and maintain a professional yet engaging tone.
      - If the post is highly technical, explain complex terms simply but accurately.
      - If the user asks for a specific summary format (e.g., "TL;DR" or "Executive Summary"), follow that strictly.
      - Always credit the author of the post in your response.

      Use the blogSummaryTool to fetch the markdown content of the post.
`,
  model: 'groq/llama-3.3-70b-versatile',
  tools: { blogSummaryTool },
  scorers: {

    contentAccuracy: {
      scorer: scorers.accuracyScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    summarizationQuality: {
      scorer: scorers.summarizationScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    conciseness: {
      scorer: scorers.concisenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
  },
  memory: new Memory(),
});
