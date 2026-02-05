import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';


const blogContentSchema = z.object({
  title: z.string(),
  author: z.string(),
  content: z.string(),
  url: z.string(),
});


const fetchBlogContent = createStep({
  id: 'fetch-blog-content',
  description: 'Fetches markdown content from a Hashnode blog post',
  inputSchema: z.object({
    postSlug: z.string().describe('The URL slug of the post'),
    hostname: z.string().describe('The blog domain (e.g. engineering.hashnode.com)'),
  }),
  outputSchema: blogContentSchema,
  execute: async ({ inputData }) => {
    const query = `
      query Post($slug: String!, $hostname: String!) {
        publication(host: $hostname) {
          post(slug: $slug) {
            title
            author { name }
            content { markdown }
          }
        }
      }
    `;

    const response = await fetch('https://gql.hashnode.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { slug: inputData.postSlug, hostname: inputData.hostname },
      }),
    });

    const json = (await response.json()) as any;
    const post = json.data?.publication?.post;

    if (!post) {
      throw new Error(`Post not found on ${inputData.hostname}`);
    }

    return {
      title: post.title,
      author: post.author.name,
      content: post.content.markdown,
      url: `https://${inputData.hostname}/${inputData.postSlug}`,
    };
  },
});


const generateSummary = createStep({
  id: 'generate-summary',
  description: 'Uses the Blog Agent to summarize the content',
  inputSchema: blogContentSchema,
  outputSchema: z.object({
    summary: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('blogAgent');
    if (!agent) {
      throw new Error('Blog Summary Agent not found');
    }

    const prompt = `
      Please summarize the following Hashnode blog post:

      TITLE: ${inputData.title}
      AUTHOR: ${inputData.author}
      URL: ${inputData.url}

      CONTENT:
      ${inputData.content.substring(0, 10000)} // Truncate to stay within context limits

      Structure your response as follows:

       TITLE: [Post Title]
       AUTHOR: [Author Name]
      ═══════════════════════════

       CORE THESIS
      [One sentence describing the main goal of the post]

       KEY TECHNICAL TAKEAWAYS
      • [Point 1] - [Brief explanation]
      • [Point 2] - [Brief explanation]
      • [Point 3] - [Brief explanation]

       SUMMARY
      [A 2-3 paragraph concise summary of the article]

       ORIGINAL POST: ${inputData.url}
    `;

    const response = await agent.generate(prompt);

    return {
      summary: response.text,
    };
  },
});


export const blogWorkflow = createWorkflow({
  id: 'blog-summary-workflow',
  inputSchema: z.object({
    postSlug: z.string(),
    hostname: z.string(),
  }),
  outputSchema: z.object({
    summary: z.string(),
  }),
})
  .then(fetchBlogContent)
  .then(generateSummary);

blogWorkflow.commit();
