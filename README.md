# Hashnode Blog Summary Agent

An automated pipeline for fetching and summarizing technical articles from Hashnode using the Mastra framework and Groq inference.

## Overview
This project implements an AI agent that extracts content from Hashnode URLs and generates structured technical summaries. It handles the specific requirements of the Hashnode GraphQL API, including support for both the official blog and personal subdomains.

## Features
- **Automated Fetching**: Retrieves raw Markdown content via Hashnode's Headless GraphQL API.
- **Structured Summarization**: Generates summaries focusing on core thesis, technical takeaways, and author attribution.
- **Integrated Evaluation**: Uses "LLM-as-a-Judge" scorers to verify accuracy, conciseness and summarization quality.

## Project Structure
- `tools/`: Contains the `blogSummaryTool` for API communication and URL parsing.
- `agents/`: Contains the `blogAgent` configuration and system instructions.
- `workflows/`: Orchestrates the fetch-and-summarize sequence.
- `scorers/`: Evaluation logic for hallucination detection and quality control.



## Configuration
The agent requires the following environment variables:
- `GROQ_API_KEY`: For OpenAI OSS 20B model inference.
- `MASTRA_LOG_LEVEL`: (Optional) Set to `info` or `debug`.

