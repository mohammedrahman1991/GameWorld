<!-- CORTEX:START -->
## Project Memory (auto-managed by Cortex)

### Last Session
1 file changed, 29 insertions(+), 4 deletions(-)
To https://github.com/mohammedrahman1991/GameWorld.git
   e2c690e..7e22edf  first-push -> first-push. Pushed. Three fixes in this update:

**Black line gone** — The ground plane was at exactly `y=0`, same as the top of the house floor slab. Two surfaces sharing the same depth causes z-fighting (dark f. Make a MD file to make it organized and create game orderly and smooth

Make a new game called castle man battles

Make a game that everything is p

### Recent Decisions
_No decisions recorded yet._

### Current Context
_No context available._

### Open Problems
- Tool permission request failed: Error: Tool permission stream closed before response received
- <tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>

_Last updated: 2026-06-07T07:21:39.770Z | Tokens: 198/800_
<!-- CORTEX:END -->


# context-mem Integration

context-mem is active in this project. It compresses tool outputs via 14 content-aware summarizers (99% token savings) and serves optimized context through MCP.

## Workflow (IMPORTANT — follow this order)

1. **Session start**: Call `restore_session` to recover prior context
2. **Before re-reading files**: Call `search` first — the answer may already be stored
3. **After large outputs**: Call `observe` to compress and store content
4. **Need details on a search result?**: Call `get` with the ID — never guess content
5. **Need chronological context?**: Call `timeline` — optionally with `anchor` ID for before/after view
6. **When learning patterns**: Call `save_knowledge` for decisions, error fixes, API patterns
7. **Periodically**: Call `budget_status` — if >80%, call `restore_session` to save state and reclaim context

## Rules

- ALWAYS `search` before `get` — never guess observation IDs
- ALWAYS `observe` outputs over 500 tokens — keep context clean
- NEVER call `get` without first finding the ID via `search` or `timeline`
- When `budget_status` shows >80%: save your work, call `restore_session`

## Available MCP Tools

- `observe` — store and compress content (auto-summarized)
- `search` / `get` / `timeline` — retrieve stored context (use in this order)
- `stats` — view compression statistics
- `save_knowledge` / `search_knowledge` — persistent knowledge base
- `budget_status` / `budget_configure` — token budget management
- `emit_event` / `query_events` — event tracking
- `restore_session` — session continuity + context reclaim
