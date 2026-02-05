import { createTool } from "@mastra/core/tools";
import { z } from "zod";

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
  id: "get-hashnode-summary",
  description: "Fetches a Hashnode blog post content using its URL",
  inputSchema: z.object({
    url: z.string().describe("The full Hashnode blog post URL"),
  }),
  outputSchema: z.object({
    title: z.string(),
    author: z.string(),
    content: z.string(),
    summaryStatus: z.string(),
  }),
  execute: async ({ url }) => {
    try {
      const parsedUrl = new URL(url);
      let host = parsedUrl.hostname;


      if (host === 'hashnode.com' && parsedUrl.pathname.startsWith('/blog')) {
        host = 'hashnode.com/blog';
      }

 
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const slug = pathParts[pathParts.length - 1];

      const query = `
        query GetPost($host: String!, $slug: String!) {
          publication(host: $host) {
            post(slug: $slug) {
              title
              author { name }
              content { markdown }
            }
          }
        }
      `;

      const response = await fetch("https://gql.hashnode.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { host, slug },
        }),
      });

      const result = await response.json();


      const post = result.data?.publication?.post;

      if (!post) {
        return {
          title: "Not Found",
          author: "N/A",
          content: "",
          summaryStatus: `Error: Post not found. Tried host: "${host}" and slug: "${slug}".`,
        };
      }

      return {
        title: post.title,
        author: post.author.name,
        content: post.content.markdown,
        summaryStatus: "Success",
      };
    } catch (error) {
      return {
        title: "Error",
        author: "N/A",
        content: "",
        summaryStatus: `Failed to parse URL or connect to API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
