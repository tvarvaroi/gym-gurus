# Sprint 2: AI Chatbot & Vercel AI SDK

**Status:** NOT STARTED
**Estimated Time:** 3–4 hours
**Skills Used:** ai-sdk, vercel-ai-integration, prompt-engineering, nodejs-backend-patterns, react-state-management

## Tasks

- [ ] **Task 2.1** — Audit Current AI Implementation
  - Review server/aiService.ts for prompt quality, error handling, streaming
  - Document current state and gaps

- [ ] **Task 2.2** — Implement Vercel AI SDK
  - Migrate from raw API calls to Vercel AI SDK
  - Add proper streaming, tool calling, structured outputs

- [ ] **Task 2.3** — MCP Tool Calling Architecture
  - Design tool schemas for fitness domain (calculate BMI, suggest exercises, etc.)
  - Implement MCP-compatible tool calling

- [ ] **Task 2.4** — Prompt Engineering
  - Create system prompts with fitness domain expertise
  - Add context injection (user stats, workout history)

- [ ] **Task 2.5** — AI Feature Tests
  - Test streaming responses, tool calls, error handling
  - Mock Anthropic API for reliable testing
