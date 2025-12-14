# AGENT.md - DokiResearch

## PROJECT CONTEXT

DokiResearch: Multi-agent research system using LangGraph + LangChain.js + GitHub Models + Perplexity.

Architecture: Supervisor Pattern with specialized Worker Agents.

## FILE STRUCTURE

```
src/
  index.ts              -> CLI entry point
  graph/
    research-graph.ts   -> StateGraph, nodes, routing, chunking
  agents/
    worker-agents.ts    -> WorkerAgent class, factory functions
  llm/
    github-models.ts    -> ChatOpenAI client for GitHub Models API
    perplexity.ts       -> ChatOpenAI client for Perplexity API
```

## EXECUTION FLOW

```
START -> supervisor -> searcher -> supervisor -> chunk_reader (loop) -> supervisor -> synthesizer -> supervisor -> writer -> END
```

Graph state:
- query: string (user query)
- searchResults: string (Perplexity results)
- searchChunks: string[] (split results)
- currentChunkIndex: number (current chunk index)
- chunkAnalyses: string[] (per-chunk analysis)
- analysis: string (synthesized analysis)
- finalDocument: string (final document)
- currentAgent: string (current agent)

## AGENTS

| Agent | LLM | Function |
|-------|-----|----------|
| Buscador | Perplexity sonar-deep-research | Real-time web search |
| Lector | GitHub Models gpt-4o | Analyzes individual chunks |
| Sintetizador | GitHub Models gpt-4o | Combines chunk analyses |
| Escritor | GitHub Models gpt-4o | Generates markdown document |

## CHUNKING

Config in research-graph.ts:
- CHUNK_SIZE = 5000 chars (~1250 tokens)
- MAX_CHUNKS = 5

splitIntoChunks() splits by paragraphs respecting limits.

## KEY DEPENDENCIES

```json
{
  "@langchain/langgraph": "StateGraph, Annotation, START, END",
  "@langchain/openai": "ChatOpenAI",
  "@langchain/core": "BaseChatModel, messages, tools",
  "zod": "tool schemas"
}
```

## ENVIRONMENT VARIABLES

```
GITHUB_TOKEN=<token from github.com/settings/tokens>
MODEL_NAME=gpt-4o
PERPLEXITY_API_KEY=<key from perplexity.ai/settings/api>
```

## COMMANDS

```bash
npm install          # install dependencies
npm run build        # compile typescript
npm run dev "query"  # run research
```

## IMPLEMENTED PATTERNS

1. Supervisor Pattern: supervisor node decides routing based on state
2. Worker Agents: independent agents with own LLM
3. StateGraph: state graph with Annotation
4. Chunking: splits large results to avoid token limits
5. Tool Calling: tools with DynamicStructuredTool + zod

## COMMON MODIFICATIONS

Add new agent:
1. Create factory function in worker-agents.ts
2. Add node in createResearchGraph()
3. Add case in routeNext()
4. Add logic in createSupervisorNode()

Change model:
- Edit .env MODEL_NAME or modify createLLM() in github-models.ts

Adjust chunking:
- Modify CHUNK_SIZE and MAX_CHUNKS in research-graph.ts

## COMMON ERRORS

- 413 Request body too large: reduce CHUNK_SIZE
- GITHUB_TOKEN not configured: add to .env
- PERPLEXITY_API_KEY not configured: add to .env
