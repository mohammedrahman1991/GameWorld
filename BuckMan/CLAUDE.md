<!-- CORTEX:START -->
## Project Memory (auto-managed by Cortex)

### Last Session
391	      else if (c.type === 'star') sfxStar();
392	      else sfxCoin();
393	      updateUI();
394	      if (score >= cfg.target) {
395	        if (. 591	    ctx.fillRect(b.x, b.y, b.w, b.h);
592	
593	    // windows
594	    if (b.lit) {
595	      const cols = Math.floor(b.w / 12);
596	      const ro. 1090	  osc.type = 'sawtooth';
1091	  osc.frequency.value = freq;
1092	  gain.gain.setValueAtTime(0.04, ac.currentTime);
1093	  gain.gain.exponentialRa

### Recent Decisions
- **going with a side-scrolling infinite runner style where the BuckCar automatically moves forward and the player uses up/down arrows to dodge between three lanes, collecting coins and power-ups while av**: a side-scrolling infinite runner style where the BuckCar automatically moves for — )_ _(
- **decision:** Even after the user accepts, decide FOR EACH QUESTION whether to use the browser or the terminal.**: ** Even after the user accepts, decide FOR EACH QUESTION whether to use the brow — )_ _(

### Current Context
_No context available._

### Open Problems
_No open problems._

_Last updated: 2026-04-01T08:59:26.343Z | Tokens: 266/800_
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
