import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface HashnodeResponse {
  data: {
    post: {
      title: string;
      content: {
        markdown: string;
      };
      author: {
        name: string;
      };
    };
  };
}

export const blogSummaryTool = createTool({
  id: 'get-hashnode-summary',
  description: 'Fetches a Hashnode blog post and provides content for summarization',
  inputSchema: z.object({
    postSlug: z.string().describe('The slug of the Hashnode post (the part of the URL after the domain)'),
    hostname: z.string().describe('The blog domain (e.g., engineering.hashnode.com)'),
  }),
  outputSchema: z.object({
    title: z.string(),
    author: z.string(),
    content: z.string(),
    summaryStatus: z.string(),
  }),
  execute: async ({ postSlug, hostname }) => {
    return await fetchAndProcessBlog(postSlug, hostname);
  },
});

const fetchAndProcessBlog = async (slug: string, hostname: string) => {
  const query = `
    query Post($slug: String!, $hostname: String!) {
      publication(host: $hostname) {
        post(slug: $slug) {
          title
          author {
            name
          }
          content {
            markdown
          }
        }
      }
    }
  `;

  const response = await fetch('https://gql.hashnode.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { slug, hostname },
    }),
  });

  const json = (await response.json()) as any;
  const post = json.data?.publication?.post;

  if (!post) {
    throw new Error(`Could not find post with slug: ${slug} on ${hostname}`);
  }

  return {
    title: post.title,
    author: post.author.name,
    content: post.content.markdown.substring(0, 5000), // Truncate for LLM context limits if necessary
    summaryStatus: 'Success: Content retrieved for summarization',
  };
};
