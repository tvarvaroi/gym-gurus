# Sprint 2: AI Chatbot & Vercel AI SDK

**Status:** COMPLETE
**Commit:** 1bba3fb
**Skills Used:** ai-sdk, vercel-ai-integration, prompt-engineering, nodejs-backend-patterns

## Tasks

- [x] **Task 2.1** — Audit Current AI Implementation
  - Found: raw fetch calls, no streaming, no tool calling, fragile JSON parsing
  - Good: fallback templates, conversation history, 4 AI endpoints

- [x] **Task 2.2** — Implement Vercel AI SDK
  - Replaced raw Anthropic fetch with `ai` + `@ai-sdk/anthropic`
  - Added generateText, generateObject, streamText
  - Added POST /api/ai/chat/stream (SSE) for streaming responses

- [x] **Task 2.3** — MCP Tool Calling Architecture
  - 4 fitness domain tools: calculateBMI, calculate1RM, calculateTDEE, suggestExercises
  - Tools use Zod parameter schemas, maxSteps: 3 for multi-step reasoning

- [x] **Task 2.4** — Prompt Engineering
  - Detailed CHAT_SYSTEM_PROMPT with fitness coaching guidelines
  - Context injection: goals, experience, equipment, bodyWeight, injuries, PRs
  - Separate system prompts for workout gen, meal planning, progress insights

- [x] **Task 2.5** — AI Feature Tests
  - 16 unit tests for fallback mode (no API key)
  - Tests cover: chat routing, workout generation, meal plans, progress insights
  - Extended vitest config to include server/ test directory
