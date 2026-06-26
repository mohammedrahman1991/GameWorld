<!-- CORTEX:START -->
## Project Memory (auto-managed by Cortex)

### Last Session
tags: ['clicking', 'casual', 'arcade', 'solo', 'highscore', 'balloons', 'combo', 'colorful'],
      title: 'Ice Dash', emoji: '🐧', grad: 'g7',
      . |emoji:" /Users/mohammedrahman/Desktop/GameOfficial/Gam...`]. title: 'Ice Dash', emoji: '🐧', grad: 'g7',
      title: 'Whack-A-Mole', emoji: '🐹', grad: 'g3',
      title: 'Coin Rush', emoji: '🪙', grad: 'g4',

### Recent Decisions
- **going with a 3D perspective camera positioned behind each car for that immersive racing feel, and for 2-player mode I'll split the screen side-by-side so both players get their own viewport.**: a 3D perspective camera positioned behind each car for that immersive racing fee — )_ _(

### Current Context
_No context available._

### Open Problems
- racing cars the 2 player both. fix car speed for player 2. it should be same speed as player 1. also the car selection does not work. it does not chan
- Tool permission request failed: Error: Tool permission stream closed before response received

_Last updated: 2026-06-26T23:12:58.656Z | Tokens: 256/800_
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
