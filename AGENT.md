# AGENT.md - DokiResearch

## PROJECT CONTEXT

DokiResearch: Multi-agent research system using LangGraph + LangChain.js + GitHub Models + Perplexity.

Architecture: Conversational Supervisor LLM + Supervisor Pattern with specialized Worker Agents.

## FILE STRUCTURE

```
src/
  index.ts              -> CLI entry point (direct mode)
  chat.ts               -> CLI entry point (conversational mode)
  server.ts             -> API server (optional)
  supervisor/
    supervisor-agent.ts -> Conversational Supervisor LLM with memory
  graph/
    research-graph.ts   -> StateGraph, nodes, routing, chunking
  agents/
    worker-agents.ts    -> WorkerAgent class, factory functions
  llm/
    github-models.ts    -> ChatOpenAI client for GitHub Models API
    perplexity.ts       -> ChatOpenAI client for Perplexity API
```

## EXECUTION MODES

### Conversational Mode (npm run chat)
```
USER <-> SupervisorAgent (LLM) <-> Research Graph (when needed)
         |
         |-- Conversation memory
         |-- Research history
         |-- Tool: iniciar_investigacion
```

### Direct Mode (npm run dev "query")
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
| SupervisorAgent | GitHub Models gpt-4o | Conversational interface, decides when to research |
| Buscador | Perplexity sonar-deep-research | Real-time web search |
| Lector | GitHub Models gpt-4o | Analyzes individual chunks |
| Sintetizador | GitHub Models gpt-4o | Combines chunk analyses |
| Escritor | GitHub Models gpt-4o | Generates markdown document |

## SUPERVISOR AGENT (Conversational)

Location: `src/supervisor/supervisor-agent.ts`

Features:
- Natural conversation with users
- Decides when to trigger research via tool calling
- Maintains conversation memory (last 10 messages)
- Stores completed research history
- Summarizes results after research completion

Tool: `iniciar_investigacion`
- Schema: { tema: string, profundidad: 'basica' | 'media' | 'profunda' }
- Triggers research graph execution

Methods:
- `chat(message)` -> Process user message, returns response + research intent
- `onResearchCompleted(query, result)` -> Handle research completion
- `getCompletedResearches()` -> Get research history
- `clearContext()` -> Clear conversation memory
- `reset()` -> Full reset including research history

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
npm run chat         # interactive conversational mode (recommended)
npm run dev "query"  # direct research mode (single query)
npm run server       # start API server
```

## CHAT COMMANDS

| Command | Function |
|---------|----------|
| /help | Show available commands |
| /clear | Clear conversation history |
| /reset | Full reset (including research history) |
| /history | Show completed researches |
| /exit | Exit chat |

## IMPLEMENTED PATTERNS

1. Conversational Supervisor: LLM-based supervisor with conversation memory
2. Supervisor Pattern: supervisor node decides routing based on state
3. Worker Agents: independent agents with own LLM
4. StateGraph: state graph with Annotation
5. Chunking: splits large results to avoid token limits
6. Tool Calling: tools with DynamicStructuredTool + zod
7. Conversation Memory: maintains context across interactions

## COMMON MODIFICATIONS

Add new agent:
1. Create factory function in worker-agents.ts
2. Add node in createResearchGraph()
3. Add case in routeNext()
4. Add logic in createSupervisorNode()

Add new tool to SupervisorAgent:
1. Create DynamicStructuredTool in supervisor-agent.ts
2. Add to this.tools array in constructor
3. Handle tool response in chat() method

Change model:
- Edit .env MODEL_NAME or modify createLLM() in github-models.ts

Adjust chunking:
- Modify CHUNK_SIZE and MAX_CHUNKS in research-graph.ts

Modify supervisor personality:
- Edit SUPERVISOR_SYSTEM_PROMPT in supervisor-agent.ts

## COMMON ERRORS

- 413 Request body too large: reduce CHUNK_SIZE
- GITHUB_TOKEN not configured: add to .env
- PERPLEXITY_API_KEY not configured: add to .env
